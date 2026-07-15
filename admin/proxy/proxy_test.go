// Copyright 2026 The AICodex Authors. All Rights Reserved.
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
	"crypto/tls"
	"crypto/x509"
	"encoding/binary"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"strings"
	"sync/atomic"
	"testing"
	"time"
)

func TestSOCKS5HTTPSRejectsUntrustedCertificate(t *testing.T) {
	target := httptest.NewTLSServer(http.HandlerFunc(func(writer http.ResponseWriter, _ *http.Request) {
		writer.WriteHeader(http.StatusNoContent)
	}))
	t.Cleanup(target.Close)
	t.Setenv("socks5Proxy", startLocalSOCKS5Proxy(t, target.Listener.Addr().String(), nil))

	response, err := getProxyHttpClient().Get(target.URL)
	if response != nil {
		response.Body.Close()
	}
	if err == nil {
		t.Fatal("经 SOCKS5 访问不受信任 TLS 证书时应校验失败")
	}
}

func TestSOCKS5HTTPSAcceptsTrustedCertificateAndMatchingHostname(t *testing.T) {
	target := httptest.NewTLSServer(http.HandlerFunc(func(writer http.ResponseWriter, _ *http.Request) {
		writer.WriteHeader(http.StatusNoContent)
	}))
	t.Cleanup(target.Close)
	t.Setenv("socks5Proxy", startLocalSOCKS5Proxy(t, target.Listener.Addr().String(), nil))

	client := getProxyHttpClient()
	trustTestServerCertificate(t, client, target.Certificate())
	response, err := client.Get(target.URL)
	if err != nil {
		t.Fatalf("可信测试 CA 和正确 hostname 应请求成功: %v", err)
	}
	response.Body.Close()
	if response.StatusCode != http.StatusNoContent {
		t.Fatalf("status = %d, want %d", response.StatusCode, http.StatusNoContent)
	}
}

func TestSOCKS5HTTPSRejectsHostnameMismatch(t *testing.T) {
	target := httptest.NewTLSServer(http.HandlerFunc(func(writer http.ResponseWriter, _ *http.Request) {
		writer.WriteHeader(http.StatusNoContent)
	}))
	t.Cleanup(target.Close)
	t.Setenv("socks5Proxy", startLocalSOCKS5Proxy(t, target.Listener.Addr().String(), nil))

	client := getProxyHttpClient()
	trustTestServerCertificate(t, client, target.Certificate())
	targetURL, err := url.Parse(target.URL)
	if err != nil {
		t.Fatalf("解析测试目标 URL: %v", err)
	}
	_, port, err := net.SplitHostPort(targetURL.Host)
	if err != nil {
		t.Fatalf("解析测试目标地址: %v", err)
	}
	targetURL.Host = net.JoinHostPort("hostname-mismatch.invalid", port)

	response, err := client.Get(targetURL.String())
	if response != nil {
		response.Body.Close()
	}
	if err == nil {
		t.Fatal("证书链可信但 hostname 不匹配时应校验失败")
	}
}

func TestSOCKS5PlainHTTPDoesNotUseTLS(t *testing.T) {
	target := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		if request.TLS != nil {
			t.Error("plain HTTP 请求不应包含 TLS 状态")
		}
		writer.WriteHeader(http.StatusNoContent)
	}))
	t.Cleanup(target.Close)
	t.Setenv("socks5Proxy", startLocalSOCKS5Proxy(t, target.Listener.Addr().String(), nil))

	response, err := getProxyHttpClient().Get(target.URL)
	if err != nil {
		t.Fatalf("plain HTTP 经 SOCKS5 请求失败: %v", err)
	}
	response.Body.Close()
	if response.StatusCode != http.StatusNoContent {
		t.Fatalf("status = %d, want %d", response.StatusCode, http.StatusNoContent)
	}
}

func trustTestServerCertificate(t *testing.T, client *http.Client, certificate *x509.Certificate) {
	t.Helper()

	transport, ok := client.Transport.(*http.Transport)
	if !ok {
		t.Fatalf("transport type = %T, want *http.Transport", client.Transport)
	}
	tlsConfig := transport.TLSClientConfig
	if tlsConfig == nil {
		tlsConfig = &tls.Config{}
	} else {
		tlsConfig = tlsConfig.Clone()
	}
	tlsConfig.RootCAs = x509.NewCertPool()
	tlsConfig.RootCAs.AddCert(certificate)
	transport.TLSClientConfig = tlsConfig
}

func TestGetHTTPClientKeepsTargetSelectionCompatibility(t *testing.T) {
	oldDefaultClient := DefaultHttpClient
	oldProxyClient := ProxyHttpClient
	DefaultHttpClient = &http.Client{}
	ProxyHttpClient = &http.Client{}
	t.Cleanup(func() {
		DefaultHttpClient = oldDefaultClient
		ProxyHttpClient = oldProxyClient
	})

	tests := []struct {
		name       string
		url        string
		wantClient *http.Client
	}{
		{name: "GitHub resource", url: "https://raw.githubusercontent.com/org/repo/main/file", wantClient: ProxyHttpClient},
		{name: "Google resource", url: "https://lh3.googleusercontent.com/avatar", wantClient: ProxyHttpClient},
		{name: "unrelated host", url: "https://example.com/file", wantClient: DefaultHttpClient},
		{name: "raw query substring", url: "https://example.com/?next=githubusercontent.com", wantClient: ProxyHttpClient},
		{name: "case sensitive", url: "https://GITHUBUSERCONTENT.COM/file", wantClient: DefaultHttpClient},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			if client := GetHttpClient(test.url); client != test.wantClient {
				t.Fatalf("GetHttpClient(%q) = %p, want %p", test.url, client, test.wantClient)
			}
		})
	}
}

func TestInitHTTPClientsUseBoundedTransportPolicy(t *testing.T) {
	oldDefaultClient := DefaultHttpClient
	oldProxyClient := ProxyHttpClient
	t.Setenv("socks5Proxy", "")
	t.Cleanup(func() {
		DefaultHttpClient = oldDefaultClient
		ProxyHttpClient = oldProxyClient
	})

	InitHttpClient()
	assertBoundedTransportPolicy(t, "default", DefaultHttpClient)
	assertBoundedTransportPolicy(t, "fallback", ProxyHttpClient)
}

func TestUnreachableProxyUsesBoundedDirectFallback(t *testing.T) {
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("分配不可达测试地址: %v", err)
	}
	address := listener.Addr().String()
	if err = listener.Close(); err != nil {
		t.Fatalf("关闭不可达测试 listener: %v", err)
	}
	t.Setenv("socks5Proxy", address)

	client := getProxyHttpClient()
	assertBoundedTransportPolicy(t, "unreachable proxy fallback", client)
}

func TestProxyProbeLogDoesNotExposeAddress(t *testing.T) {
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("启动探测测试 listener: %v", err)
	}
	t.Cleanup(func() { _ = listener.Close() })
	address := listener.Addr().String()

	output := captureStdout(t, func() {
		if !isAddressOpen(address) {
			t.Fatal("本地 listener 应可达")
		}
	})
	if strings.Contains(output, address) {
		t.Fatalf("代理探测日志泄露了完整地址: %q", output)
	}
}

func TestProxyConnectDeadlineCancelsBlockingDialer(t *testing.T) {
	const testTimeout = 50 * time.Millisecond
	client := newProxyHTTPClient(blockingContextDialer{}, testTimeout)

	startedAt := time.Now()
	response, err := client.Get("http://deadline.invalid/resource")
	if response != nil {
		response.Body.Close()
	}
	if !errors.Is(err, context.DeadlineExceeded) {
		t.Fatalf("connect error = %v, want context deadline exceeded", err)
	}
	if elapsed := time.Since(startedAt); elapsed > time.Second {
		t.Fatalf("connect deadline took %v, want <= 1s", elapsed)
	}
}

func TestSOCKS5HandshakeDeadlineClosesStalledConnection(t *testing.T) {
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("启动停滞 SOCKS5 listener: %v", err)
	}
	t.Cleanup(func() { _ = listener.Close() })
	connectionClosed := make(chan struct{})
	go serveStalledSOCKS5Greeting(listener, connectionClosed)

	const testTimeout = 50 * time.Millisecond
	client, ok := newSOCKS5HTTPClient(listener.Addr().String(), testTimeout)
	if !ok {
		t.Fatal("本地 SOCKS5 dialer 应支持 context")
	}
	startedAt := time.Now()
	response, err := client.Get("http://socks5-handshake.invalid/resource")
	if response != nil {
		response.Body.Close()
	}
	if err == nil {
		t.Fatal("停滞 SOCKS5 greeting 应在 connect deadline 后失败")
	}
	if elapsed := time.Since(startedAt); elapsed > time.Second {
		t.Fatalf("SOCKS5 handshake timeout took %v, want <= 1s", elapsed)
	}
	select {
	case <-connectionClosed:
	case <-time.After(time.Second):
		t.Fatal("connect deadline 后底层 SOCKS5 连接未关闭")
	}
}

func TestTLSHandshakeTimeoutStopsStalledTarget(t *testing.T) {
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("启动慢 TLS listener: %v", err)
	}
	t.Cleanup(func() { _ = listener.Close() })
	go acceptAndHoldConnections(listener)

	client := newProxyHTTPClient(fixedContextDialer{address: listener.Addr().String()}, time.Second)
	transport := client.Transport.(*http.Transport)
	transport.TLSHandshakeTimeout = 50 * time.Millisecond

	startedAt := time.Now()
	response, err := client.Get("https://tls-handshake.invalid/resource")
	if response != nil {
		response.Body.Close()
	}
	if err == nil {
		t.Fatal("慢 TLS handshake 应超时")
	}
	if elapsed := time.Since(startedAt); elapsed > time.Second {
		t.Fatalf("TLS handshake timeout took %v, want <= 1s", elapsed)
	}
}

func TestResponseHeaderTimeoutStopsStalledTarget(t *testing.T) {
	target := httptest.NewServer(http.HandlerFunc(func(_ http.ResponseWriter, request *http.Request) {
		<-request.Context().Done()
	}))
	t.Cleanup(target.Close)

	client := newProxyHTTPClient(fixedContextDialer{address: target.Listener.Addr().String()}, time.Second)
	transport := client.Transport.(*http.Transport)
	transport.ResponseHeaderTimeout = 50 * time.Millisecond

	startedAt := time.Now()
	response, err := client.Get("http://response-header.invalid/resource")
	if response != nil {
		response.Body.Close()
	}
	if err == nil {
		t.Fatal("慢 response header 应超时")
	}
	if elapsed := time.Since(startedAt); elapsed > time.Second {
		t.Fatalf("response header timeout took %v, want <= 1s", elapsed)
	}
}

func TestResponseHeaderTimeoutDoesNotLimitStreamingBody(t *testing.T) {
	target := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, _ *http.Request) {
		_, _ = io.WriteString(writer, "start-")
		writer.(http.Flusher).Flush()
		time.Sleep(120 * time.Millisecond)
		_, _ = io.WriteString(writer, "end")
	}))
	t.Cleanup(target.Close)

	client := newProxyHTTPClient(fixedContextDialer{address: target.Listener.Addr().String()}, time.Second)
	transport := client.Transport.(*http.Transport)
	transport.ResponseHeaderTimeout = 50 * time.Millisecond
	response, err := client.Get("http://streaming-body.invalid/resource")
	if err != nil {
		t.Fatalf("响应头按时返回后，慢 body 不应被 response-header timeout 截断: %v", err)
	}
	defer response.Body.Close()
	body, err := io.ReadAll(response.Body)
	if err != nil {
		t.Fatalf("读取慢流式 body: %v", err)
	}
	if string(body) != "start-end" {
		t.Fatalf("streaming body = %q, want %q", body, "start-end")
	}
}

func TestSOCKS5TransportReusesConnection(t *testing.T) {
	target := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, _ *http.Request) {
		_, _ = io.WriteString(writer, "ok")
	}))
	t.Cleanup(target.Close)
	var socksConnections atomic.Int32
	t.Setenv("socks5Proxy", startLocalSOCKS5Proxy(t, target.Listener.Addr().String(), &socksConnections))
	client := getProxyHttpClient()

	for range 2 {
		response, err := client.Get(target.URL)
		if err != nil {
			t.Fatalf("经 SOCKS5 请求 keep-alive 目标: %v", err)
		}
		if _, err = io.Copy(io.Discard, response.Body); err != nil {
			response.Body.Close()
			t.Fatalf("读取 keep-alive 响应: %v", err)
		}
		response.Body.Close()
	}
	if got := socksConnections.Load(); got != 1 {
		t.Fatalf("SOCKS5 connections = %d, want 1 reused connection", got)
	}
}

func TestProxyAndDirectTransportsKeepEnvironmentProxySemantics(t *testing.T) {
	directTransport := newDirectHTTPClient().Transport.(*http.Transport)
	if directTransport.Proxy == nil {
		t.Fatal("direct/fallback transport 应保留 ProxyFromEnvironment")
	}
	proxyTransport := newProxyHTTPClient(blockingContextDialer{}, time.Second).Transport.(*http.Transport)
	if proxyTransport.Proxy != nil {
		t.Fatal("SOCKS5 transport 不应叠加环境 HTTP proxy")
	}
}

type blockingContextDialer struct{}

func (blockingContextDialer) DialContext(ctx context.Context, _, _ string) (net.Conn, error) {
	<-ctx.Done()
	return nil, ctx.Err()
}

type fixedContextDialer struct {
	address string
}

func (dialer fixedContextDialer) DialContext(ctx context.Context, network, _ string) (net.Conn, error) {
	return (&net.Dialer{}).DialContext(ctx, network, dialer.address)
}

func acceptAndHoldConnections(listener net.Listener) {
	for {
		connection, err := listener.Accept()
		if err != nil {
			return
		}
		go func() {
			defer connection.Close()
			_, _ = io.Copy(io.Discard, connection)
		}()
	}
}

func serveStalledSOCKS5Greeting(listener net.Listener, connectionClosed chan<- struct{}) {
	connection, err := listener.Accept()
	if err != nil {
		return
	}
	defer connection.Close()
	header := make([]byte, 3)
	if _, err = io.ReadFull(connection, header); err != nil {
		return
	}
	buffer := make([]byte, 1)
	_, _ = connection.Read(buffer)
	close(connectionClosed)
}

func assertBoundedTransportPolicy(t *testing.T, name string, client *http.Client) {
	t.Helper()

	if client == nil {
		t.Fatalf("%s client 不应为 nil", name)
	}
	if client.Timeout != 0 {
		t.Fatalf("%s client timeout = %v, want 0 for streaming bodies", name, client.Timeout)
	}
	transport, ok := client.Transport.(*http.Transport)
	if !ok {
		t.Fatalf("%s transport type = %T, want *http.Transport", name, client.Transport)
	}
	if transport.DialContext == nil {
		t.Fatalf("%s DialContext 不应为 nil", name)
	}
	if transport.TLSClientConfig != nil && transport.TLSClientConfig.InsecureSkipVerify {
		t.Fatalf("%s transport 不得跳过 TLS 证书校验", name)
	}
	if transport.DisableKeepAlives {
		t.Fatalf("%s transport 应保持 HTTP keep-alive", name)
	}
	if transport.TLSHandshakeTimeout != tlsHandshakeTimeout {
		t.Fatalf("%s TLSHandshakeTimeout = %v, want %v", name, transport.TLSHandshakeTimeout, tlsHandshakeTimeout)
	}
	if transport.ResponseHeaderTimeout != responseHeaderTimeout {
		t.Fatalf("%s ResponseHeaderTimeout = %v, want %v", name, transport.ResponseHeaderTimeout, responseHeaderTimeout)
	}
	if transport.IdleConnTimeout != idleConnectionTimeout {
		t.Fatalf("%s IdleConnTimeout = %v, want %v", name, transport.IdleConnTimeout, idleConnectionTimeout)
	}
}

func captureStdout(t *testing.T, action func()) string {
	t.Helper()

	reader, writer, err := os.Pipe()
	if err != nil {
		t.Fatalf("创建 stdout pipe: %v", err)
	}
	oldStdout := os.Stdout
	os.Stdout = writer
	t.Cleanup(func() { os.Stdout = oldStdout })

	action()
	if err = writer.Close(); err != nil {
		t.Fatalf("关闭 stdout writer: %v", err)
	}
	os.Stdout = oldStdout
	output, err := io.ReadAll(reader)
	if err != nil {
		t.Fatalf("读取 stdout: %v", err)
	}
	if err = reader.Close(); err != nil {
		t.Fatalf("关闭 stdout reader: %v", err)
	}
	return string(output)
}

// startLocalSOCKS5Proxy 只转发测试进程内的目标，用于验证真实 SOCKS5 握手而不访问外网。
func startLocalSOCKS5Proxy(t *testing.T, upstreamAddress string, connectionCount *atomic.Int32) string {
	t.Helper()

	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("启动本地 SOCKS5 listener: %v", err)
	}
	t.Cleanup(func() { _ = listener.Close() })

	go func() {
		for {
			connection, acceptErr := listener.Accept()
			if acceptErr != nil {
				return
			}
			go serveSOCKS5Connection(connection, upstreamAddress, connectionCount)
		}
	}()

	return listener.Addr().String()
}

func serveSOCKS5Connection(client net.Conn, upstreamAddress string, connectionCount *atomic.Int32) {
	defer client.Close()

	header := make([]byte, 2)
	if _, err := io.ReadFull(client, header); err != nil || header[0] != 5 {
		return
	}
	if connectionCount != nil {
		connectionCount.Add(1)
	}
	methods := make([]byte, int(header[1]))
	if _, err := io.ReadFull(client, methods); err != nil {
		return
	}
	if _, err := client.Write([]byte{5, 0}); err != nil {
		return
	}

	request := make([]byte, 4)
	if _, err := io.ReadFull(client, request); err != nil || request[0] != 5 || request[1] != 1 {
		return
	}
	host, err := readSOCKS5Host(client, request[3])
	if err != nil {
		return
	}
	portBytes := make([]byte, 2)
	if _, err = io.ReadFull(client, portBytes); err != nil {
		return
	}

	requestedAddress := net.JoinHostPort(host, fmt.Sprint(binary.BigEndian.Uint16(portBytes)))
	if upstreamAddress == "" {
		upstreamAddress = requestedAddress
	}
	upstream, err := net.Dial("tcp", upstreamAddress)
	if err != nil {
		_, _ = client.Write([]byte{5, 1, 0, 1, 0, 0, 0, 0, 0, 0})
		return
	}
	defer upstream.Close()
	if _, err = client.Write([]byte{5, 0, 0, 1, 0, 0, 0, 0, 0, 0}); err != nil {
		return
	}

	go func() {
		_, _ = io.Copy(upstream, client)
		_ = upstream.(*net.TCPConn).CloseWrite()
	}()
	_, _ = io.Copy(client, upstream)
}

func readSOCKS5Host(reader io.Reader, addressType byte) (string, error) {
	switch addressType {
	case 1:
		address := make([]byte, net.IPv4len)
		if _, err := io.ReadFull(reader, address); err != nil {
			return "", err
		}
		return net.IP(address).String(), nil
	case 3:
		length := make([]byte, 1)
		if _, err := io.ReadFull(reader, length); err != nil {
			return "", err
		}
		address := make([]byte, int(length[0]))
		if _, err := io.ReadFull(reader, address); err != nil {
			return "", err
		}
		return string(address), nil
	case 4:
		address := make([]byte, net.IPv6len)
		if _, err := io.ReadFull(reader, address); err != nil {
			return "", err
		}
		return net.IP(address).String(), nil
	default:
		return "", fmt.Errorf("不支持的 SOCKS5 address type: %d", addressType)
	}
}
