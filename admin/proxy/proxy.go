// Copyright 2021 The Casdoor Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package proxy

import (
	"context"
	"fmt"
	"net"
	"net/http"
	"strings"
	"time"

	"git.leagsoft.com/aicodex/aicodex-admin/conf"
	"golang.org/x/net/proxy"
)

const (
	proxyProbeTimeout       = 100 * time.Millisecond
	transportConnectTimeout = 10 * time.Second
	tlsHandshakeTimeout     = 10 * time.Second
	responseHeaderTimeout   = 30 * time.Second
	idleConnectionTimeout   = 90 * time.Second
	transportKeepAlive      = 30 * time.Second
)

var (
	DefaultHttpClient *http.Client
	ProxyHttpClient   *http.Client
)

// InitHttpClient 初始化默认与 SOCKS5 出站客户端，并为两条路径应用一致的有界 transport policy。
func InitHttpClient() {
	DefaultHttpClient = newDirectHTTPClient()
	ProxyHttpClient = getProxyHttpClient()
}

func isAddressOpen(address string) bool {
	conn, err := net.DialTimeout("tcp", address, proxyProbeTimeout)
	if err != nil {
		// cannot connect to address, proxy is not active
		return false
	}

	if conn != nil {
		defer conn.Close()
		// 地址可能属于私有网络，诊断只暴露启用状态，不回显完整 endpoint。
		fmt.Println("Socks5 proxy enabled")
		return true
	}

	return false
}

func getProxyHttpClient() *http.Client {
	fallbackClient := newDirectHTTPClient()
	socks5Proxy := conf.GetConfigString("socks5Proxy")
	if socks5Proxy == "" {
		return fallbackClient
	}

	if !isAddressOpen(socks5Proxy) {
		return fallbackClient
	}

	client, ok := newSOCKS5HTTPClient(socks5Proxy, transportConnectTimeout)
	if !ok {
		return fallbackClient
	}
	return client
}

func newDirectHTTPClient() *http.Client {
	return &http.Client{Transport: newBoundedTransport()}
}

func newSOCKS5HTTPClient(address string, connectTimeout time.Duration) (*http.Client, bool) {
	forwardDialer := &net.Dialer{
		Timeout:   connectTimeout,
		KeepAlive: transportKeepAlive,
	}
	dialer, err := proxy.SOCKS5("tcp", address, nil, forwardDialer)
	if err != nil {
		return nil, false
	}
	contextDialer, ok := dialer.(proxy.ContextDialer)
	if !ok {
		return nil, false
	}
	return newProxyHTTPClient(contextDialer, connectTimeout), true
}

func newProxyHTTPClient(dialer proxy.ContextDialer, connectTimeout time.Duration) *http.Client {
	transport := newBoundedTransport()
	// SOCKS5 是本 client 唯一代理路径，不能再叠加 HTTP_PROXY 等环境代理。
	transport.Proxy = nil
	transport.DialContext = func(ctx context.Context, network, address string) (net.Conn, error) {
		dialContext, cancel := context.WithTimeout(ctx, connectTimeout)
		defer cancel()
		return dialer.DialContext(dialContext, network, address)
	}

	return &http.Client{Transport: transport}
}

func newBoundedTransport() *http.Transport {
	transport := http.DefaultTransport.(*http.Transport).Clone()
	dialer := &net.Dialer{
		Timeout:   transportConnectTimeout,
		KeepAlive: transportKeepAlive,
	}
	transport.DialContext = dialer.DialContext
	// nil 使用 Go 的系统 Root CA 与请求 hostname 校验，禁止继承任何全局 insecure 配置。
	transport.TLSClientConfig = nil
	transport.TLSHandshakeTimeout = tlsHandshakeTimeout
	transport.ResponseHeaderTimeout = responseHeaderTimeout
	transport.IdleConnTimeout = idleConnectionTimeout
	return transport
}

// GetHttpClient 保持既有原始字符串匹配规则，为 GitHub/Google 资源选择代理客户端。
func GetHttpClient(url string) *http.Client {
	if strings.Contains(url, "githubusercontent.com") || strings.Contains(url, "googleusercontent.com") {
		return ProxyHttpClient
	} else {
		return DefaultHttpClient
	}
}
