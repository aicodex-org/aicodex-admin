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

package object

import (
	"context"
	"crypto/tls"
	"errors"
	"net"
	"net/url"
	"strconv"
	"strings"
	"sync"
	"time"

	"git.leagsoft.com/aicodex/aicodex-admin/tlspolicy"
	goldap "github.com/go-ldap/ldap/v3"
)

const (
	ldapConnectionRuntimeTimeout = 60 * time.Second

	ldapTransportPlain = "ldap"
	ldapTransportTLS   = "ldaps"

	ldapTLSModeDisabled              = "disabled"
	ldapTLSSourceTransport           = "transport"
	ldapTLSSourceAllowSelfSignedCert = "allow_self_signed_cert"
	ldapTimeoutSourceRuntimeDefault  = "runtime_default"
	ldapRuntimeStageConfig           = "config"
	ldapRuntimeStageDial             = "dial"
	ldapRuntimeStageBind             = "bind"
	ldapRuntimeStageProbe            = "probe"
	ldapRuntimeStageClose            = "close"
	ldapRuntimeErrorConfigInvalid    = "ldap_config_invalid"
	ldapRuntimeErrorDialFailed       = "ldap_dial_failed"
	ldapRuntimeErrorDialTimeout      = "ldap_dial_timeout"
	ldapRuntimeErrorBindFailed       = "ldap_bind_failed"
	ldapRuntimeErrorBindTimeout      = "ldap_bind_timeout"
	ldapRuntimeErrorProbeFailed      = "ldap_probe_failed"
	ldapRuntimeErrorProbeTimeout     = "ldap_probe_timeout"
	ldapRuntimeErrorCloseFailed      = "ldap_close_failed"
	ldapRuntimeErrorCloseTimeout     = "ldap_close_timeout"
)

// ldapConnectionRuntimeDiagnostic 只包含可复制的连接策略元数据，不包含目标、账号或凭据。
type ldapConnectionRuntimeDiagnostic struct {
	Transport     string
	TLSMode       string
	TLSSource     string
	CustomCA      bool
	TimeoutMillis int64
	TimeoutSource string
}

// ldapConnectionRuntimePolicy 是单次 LDAP 连接的 typed 运行时边界，绝不持久化。
type ldapConnectionRuntimePolicy struct {
	Transport  string
	Host       string
	Port       int
	TLSConfig  *tls.Config
	Timeout    time.Duration
	Diagnostic ldapConnectionRuntimeDiagnostic
}

// ldapConnectionRuntimeError 只保留稳定阶段和分类，不持有可能含敏感信息的底层 cause。
type ldapConnectionRuntimeError struct {
	Stage string
	Code  string
}

func (e *ldapConnectionRuntimeError) Error() string {
	return "LDAP runtime " + e.Stage + ": " + e.Code
}

type ldapRuntimeClient interface {
	Bind(username string, password string) error
	Search(searchRequest *goldap.SearchRequest) (*goldap.SearchResult, error)
	SetTimeout(timeout time.Duration)
	Unbind() error
	Close() error
	Raw() *goldap.Conn
}

type goLDAPRuntimeClient struct {
	conn *goldap.Conn
}

func (c *goLDAPRuntimeClient) Bind(username string, password string) error {
	return c.conn.Bind(username, password)
}

func (c *goLDAPRuntimeClient) Search(searchRequest *goldap.SearchRequest) (*goldap.SearchResult, error) {
	return c.conn.Search(searchRequest)
}

func (c *goLDAPRuntimeClient) SetTimeout(timeout time.Duration) {
	c.conn.SetTimeout(timeout)
}

func (c *goLDAPRuntimeClient) Unbind() error {
	return c.conn.Unbind()
}

func (c *goLDAPRuntimeClient) Close() error {
	return c.conn.Close()
}

func (c *goLDAPRuntimeClient) Raw() *goldap.Conn {
	return c.conn
}

// ldapManagedConnection 统一初始请求 timeout、失败 abort 和幂等关闭，不拥有业务查询生命周期。
type ldapManagedConnection struct {
	Conn       *goldap.Conn
	Diagnostic ldapConnectionRuntimeDiagnostic

	client    ldapRuntimeClient
	timeout   time.Duration
	closeOnce sync.Once
	closeErr  error
}

var ldapRuntimeDial = dialLDAPRuntime

// resolveGenericLDAPConnectionRuntimePolicy 精确保留 allowSelfSignedCert 的连接级历史语义。
func resolveGenericLDAPConnectionRuntimePolicy(ldap *Ldap) (ldapConnectionRuntimePolicy, error) {
	if ldap == nil {
		return ldapConnectionRuntimePolicy{}, newLDAPRuntimeError(ldapRuntimeStageConfig, ldapRuntimeErrorConfigInvalid)
	}

	policy := newLDAPConnectionRuntimePolicy(ldap.Host, ldap.Port)
	if ldap.EnableSsl {
		policy.Transport = ldapTransportTLS
		policy.Diagnostic.Transport = ldapTransportTLS
		policy.Diagnostic.TLSSource = ldapTLSSourceAllowSelfSignedCert
		policy.Diagnostic.TLSMode = tlspolicy.ModeSystem
		policy.TLSConfig = &tls.Config{ServerName: ldap.Host}
		if ldap.AllowSelfSignedCert {
			//nolint:gosec // 存量 allowSelfSignedCert 只对当前 LDAPS 连接保持历史兼容。
			policy.TLSConfig.InsecureSkipVerify = true
			policy.Diagnostic.TLSMode = tlspolicy.ModeLegacyInsecure
		}
	}

	if err := validateLDAPConnectionRuntimePolicy(policy); err != nil {
		return ldapConnectionRuntimePolicy{}, err
	}
	return policy, nil
}

// resolveActiveDirectoryConnectionRuntimePolicy 只适配既有 enterprise TLS resolution，不重新解释持久化策略。
func resolveActiveDirectoryConnectionRuntimePolicy(syncer *Syncer) (ldapConnectionRuntimePolicy, error) {
	if syncer == nil {
		return ldapConnectionRuntimePolicy{}, newLDAPRuntimeError(ldapRuntimeStageConfig, ldapRuntimeErrorConfigInvalid)
	}

	port := syncer.Port
	if port == 0 {
		port = 389
	}
	resolution, err := ResolveSyncerTLSPolicy(syncer)
	if err != nil {
		return ldapConnectionRuntimePolicy{}, err
	}

	policy := newLDAPConnectionRuntimePolicy(syncer.Host, port)
	policy.Diagnostic.TLSMode = resolution.Diagnostic.Mode
	policy.Diagnostic.TLSSource = resolution.Diagnostic.Source
	policy.Diagnostic.CustomCA = resolution.Diagnostic.CustomCA
	if port == 636 {
		policy.Transport = ldapTransportTLS
		policy.Diagnostic.Transport = ldapTransportTLS
		policy.TLSConfig = resolution.TLSConfig.Clone()
		policy.TLSConfig.ServerName = syncer.Host
	} else if resolution.Diagnostic.CustomCA {
		return ldapConnectionRuntimePolicy{}, &tlspolicy.Error{Code: tlspolicy.ErrorCodeCAConflict}
	}

	if err := validateLDAPConnectionRuntimePolicy(policy); err != nil {
		return ldapConnectionRuntimePolicy{}, err
	}
	return policy, nil
}

func newLDAPConnectionRuntimePolicy(host string, port int) ldapConnectionRuntimePolicy {
	return ldapConnectionRuntimePolicy{
		Transport: ldapTransportPlain,
		Host:      host,
		Port:      port,
		Timeout:   ldapConnectionRuntimeTimeout,
		Diagnostic: ldapConnectionRuntimeDiagnostic{
			Transport:     ldapTransportPlain,
			TLSMode:       ldapTLSModeDisabled,
			TLSSource:     ldapTLSSourceTransport,
			TimeoutMillis: ldapConnectionRuntimeTimeout.Milliseconds(),
			TimeoutSource: ldapTimeoutSourceRuntimeDefault,
		},
	}
}

func validateLDAPConnectionRuntimePolicy(policy ldapConnectionRuntimePolicy) error {
	if strings.TrimSpace(policy.Host) == "" || policy.Port <= 0 || policy.Port > 65535 || policy.Timeout <= 0 {
		return newLDAPRuntimeError(ldapRuntimeStageConfig, ldapRuntimeErrorConfigInvalid)
	}
	if policy.Transport != ldapTransportPlain && policy.Transport != ldapTransportTLS {
		return newLDAPRuntimeError(ldapRuntimeStageConfig, ldapRuntimeErrorConfigInvalid)
	}
	if (policy.Transport == ldapTransportTLS) != (policy.TLSConfig != nil) {
		return newLDAPRuntimeError(ldapRuntimeStageConfig, ldapRuntimeErrorConfigInvalid)
	}
	return nil
}

func dialLDAPRuntime(policy ldapConnectionRuntimePolicy) (ldapRuntimeClient, error) {
	address := net.JoinHostPort(policy.Host, strconv.Itoa(policy.Port))
	target := (&url.URL{Scheme: policy.Transport, Host: address}).String()
	options := []goldap.DialOpt{
		goldap.DialWithDialer(&net.Dialer{Timeout: policy.Timeout}),
	}
	if policy.TLSConfig != nil {
		options = append(options, goldap.DialWithTLSConfig(policy.TLSConfig))
	}
	conn, err := goldap.DialURL(target, options...)
	if err != nil {
		return nil, err
	}
	return &goLDAPRuntimeClient{conn: conn}, nil
}

// connectLDAPRuntime 在单一边界应用 dial/bind timeout，并在失败时立即 abort 已建立的 socket。
func connectLDAPRuntime(policy ldapConnectionRuntimePolicy, username string, password string) (*ldapManagedConnection, error) {
	if err := validateLDAPConnectionRuntimePolicy(policy); err != nil {
		return nil, err
	}

	client, err := ldapRuntimeDial(policy)
	if err != nil {
		if client != nil {
			_ = client.Close()
		}
		return nil, newLDAPRuntimeOperationError(ldapRuntimeStageDial, err)
	}
	if client == nil {
		return nil, newLDAPRuntimeError(ldapRuntimeStageDial, ldapRuntimeErrorDialFailed)
	}

	connection := newLDAPManagedConnection(client, policy)
	client.SetTimeout(policy.Timeout)
	if err = client.Bind(username, password); err != nil {
		connection.abort()
		return nil, newLDAPRuntimeOperationError(ldapRuntimeStageBind, err)
	}
	return connection, nil
}

func newLDAPManagedConnection(client ldapRuntimeClient, policy ldapConnectionRuntimePolicy) *ldapManagedConnection {
	var raw *goldap.Conn
	if client != nil {
		raw = client.Raw()
	}
	return &ldapManagedConnection{
		Conn:       raw,
		Diagnostic: policy.Diagnostic,
		client:     client,
		timeout:    policy.Timeout,
	}
}

// finishInitialOperations 恢复旧的后续查询语义；本 change 只约束 dial、bind、probe 与 close。
func (c *ldapManagedConnection) finishInitialOperations() {
	if c == nil || c.client == nil {
		return
	}
	c.client.SetTimeout(0)
}

// Search 让 AD 业务查询继续使用受管连接，但不改变初始阶段后的既有 request timeout。
func (c *ldapManagedConnection) Search(searchRequest *goldap.SearchRequest) (*goldap.SearchResult, error) {
	if c == nil || c.client == nil {
		return nil, goldap.ErrNilConnection
	}
	return c.client.Search(searchRequest)
}

func (c *ldapManagedConnection) abort() {
	if c == nil {
		return
	}
	c.closeOnce.Do(func() {
		if c.client == nil {
			return
		}
		if err := c.client.Close(); err != nil {
			c.closeErr = newLDAPRuntimeOperationError(ldapRuntimeStageClose, err)
		}
	})
}

// Close 最多执行一次 Unbind，并始终调用底层 Close；错误只返回 copy-safe 稳定分类。
func (c *ldapManagedConnection) Close() error {
	if c == nil {
		return nil
	}
	c.closeOnce.Do(func() {
		if c.client == nil {
			return
		}
		c.client.SetTimeout(c.timeout)
		unbindErr := c.client.Unbind()
		closeErr := c.client.Close()
		if unbindErr != nil {
			c.closeErr = newLDAPRuntimeOperationError(ldapRuntimeStageClose, unbindErr)
		} else if closeErr != nil {
			c.closeErr = newLDAPRuntimeOperationError(ldapRuntimeStageClose, closeErr)
		}
	})
	return c.closeErr
}

func newLDAPRuntimeOperationError(stage string, cause error) error {
	timedOut := isLDAPRuntimeTimeout(cause)
	switch stage {
	case ldapRuntimeStageDial:
		if timedOut {
			return newLDAPRuntimeError(stage, ldapRuntimeErrorDialTimeout)
		}
		return newLDAPRuntimeError(stage, ldapRuntimeErrorDialFailed)
	case ldapRuntimeStageBind:
		if timedOut {
			return newLDAPRuntimeError(stage, ldapRuntimeErrorBindTimeout)
		}
		return newLDAPRuntimeError(stage, ldapRuntimeErrorBindFailed)
	case ldapRuntimeStageProbe:
		if timedOut {
			return newLDAPRuntimeError(stage, ldapRuntimeErrorProbeTimeout)
		}
		return newLDAPRuntimeError(stage, ldapRuntimeErrorProbeFailed)
	case ldapRuntimeStageClose:
		if timedOut {
			return newLDAPRuntimeError(stage, ldapRuntimeErrorCloseTimeout)
		}
		return newLDAPRuntimeError(stage, ldapRuntimeErrorCloseFailed)
	default:
		return newLDAPRuntimeError(stage, ldapRuntimeErrorConfigInvalid)
	}
}

func newLDAPRuntimeError(stage string, code string) error {
	return &ldapConnectionRuntimeError{Stage: stage, Code: code}
}

func isLDAPRuntimeTimeout(err error) bool {
	if err == nil {
		return false
	}
	if errors.Is(err, context.DeadlineExceeded) {
		return true
	}
	var networkError net.Error
	if errors.As(err, &networkError) && networkError.Timeout() {
		return true
	}
	var ldapError *goldap.Error
	if errors.As(err, &ldapError) {
		if ldapError.ResultCode == goldap.LDAPResultTimeout {
			return true
		}
		return ldapError.Err != nil && ldapError.Err.Error() == "ldap: connection timed out"
	}
	return false
}
