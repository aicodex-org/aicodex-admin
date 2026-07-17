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
	"crypto/rand"
	"crypto/rsa"
	"crypto/tls"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/pem"
	"errors"
	"fmt"
	"math/big"
	"net"
	"strings"
	"testing"
	"time"

	"git.leagsoft.com/aicodex/aicodex-admin/tlspolicy"
	goldap "github.com/go-ldap/ldap/v3"
)

func TestResolveGenericLDAPConnectionRuntimePolicy(t *testing.T) {
	tests := []struct {
		name            string
		enableSSL       bool
		allowSelfSigned bool
		wantTransport   string
		wantTLSMode     string
		wantTLSSource   string
		wantTLS         bool
		wantSkipVerify  bool
	}{
		{name: "plain strict flag", wantTransport: ldapTransportPlain, wantTLSMode: ldapTLSModeDisabled, wantTLSSource: ldapTLSSourceTransport},
		{name: "plain legacy flag is not TLS", allowSelfSigned: true, wantTransport: ldapTransportPlain, wantTLSMode: ldapTLSModeDisabled, wantTLSSource: ldapTLSSourceTransport},
		{name: "strict LDAPS", enableSSL: true, wantTransport: ldapTransportTLS, wantTLSMode: tlspolicy.ModeSystem, wantTLSSource: ldapTLSSourceAllowSelfSignedCert, wantTLS: true},
		{name: "legacy self signed LDAPS", enableSSL: true, allowSelfSigned: true, wantTransport: ldapTransportTLS, wantTLSMode: tlspolicy.ModeLegacyInsecure, wantTLSSource: ldapTLSSourceAllowSelfSignedCert, wantTLS: true, wantSkipVerify: true},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			policy, err := resolveGenericLDAPConnectionRuntimePolicy(&Ldap{
				Host:                "directory.example.test",
				Port:                389,
				EnableSsl:           test.enableSSL,
				AllowSelfSignedCert: test.allowSelfSigned,
			})
			if err != nil {
				t.Fatalf("resolve policy: %v", err)
			}
			if policy.Transport != test.wantTransport || policy.Diagnostic.Transport != test.wantTransport {
				t.Fatalf("transport = %q/%q, want %q", policy.Transport, policy.Diagnostic.Transport, test.wantTransport)
			}
			if policy.Diagnostic.TLSMode != test.wantTLSMode || policy.Diagnostic.TLSSource != test.wantTLSSource {
				t.Fatalf("TLS diagnostic = %+v, want mode=%q source=%q", policy.Diagnostic, test.wantTLSMode, test.wantTLSSource)
			}
			if (policy.TLSConfig != nil) != test.wantTLS {
				t.Fatalf("TLS config present = %t, want %t", policy.TLSConfig != nil, test.wantTLS)
			}
			if policy.TLSConfig != nil {
				if policy.TLSConfig.ServerName != "directory.example.test" {
					t.Fatalf("ServerName = %q", policy.TLSConfig.ServerName)
				}
				if policy.TLSConfig.InsecureSkipVerify != test.wantSkipVerify {
					t.Fatalf("InsecureSkipVerify = %t, want %t", policy.TLSConfig.InsecureSkipVerify, test.wantSkipVerify)
				}
			}
			if policy.Timeout != ldapConnectionRuntimeTimeout || policy.Diagnostic.TimeoutMillis != 60_000 || policy.Diagnostic.TimeoutSource != ldapTimeoutSourceRuntimeDefault {
				t.Fatalf("timeout policy = %s diagnostic=%+v", policy.Timeout, policy.Diagnostic)
			}
			assertLDAPDiagnosticCopySafe(t, policy.Diagnostic)
		})
	}
}

func TestResolveActiveDirectoryConnectionRuntimePolicyPreservesEnterpriseTLS(t *testing.T) {
	tests := []struct {
		name           string
		port           int
		policy         string
		wantTransport  string
		wantMode       string
		wantSource     string
		wantTLS        bool
		wantSkipVerify bool
	}{
		{name: "legacy plain", port: 389, wantTransport: ldapTransportPlain, wantMode: tlspolicy.ModeSystem, wantSource: tlspolicy.SourceLegacyUnmigrated},
		{name: "zero port keeps legacy plain default", wantTransport: ldapTransportPlain, wantMode: tlspolicy.ModeSystem, wantSource: tlspolicy.SourceLegacyUnmigrated},
		{name: "legacy LDAPS", port: 636, wantTransport: ldapTransportTLS, wantMode: tlspolicy.ModeLegacyInsecure, wantSource: tlspolicy.SourceLegacyUnmigrated, wantTLS: true, wantSkipVerify: true},
		{name: "explicit system LDAPS", port: 636, policy: tlspolicy.ModeSystem, wantTransport: ldapTransportTLS, wantMode: tlspolicy.ModeSystem, wantSource: tlspolicy.SourceExplicit, wantTLS: true},
		{name: "explicit legacy LDAPS", port: 636, policy: tlspolicy.ModeLegacyInsecure, wantTransport: ldapTransportTLS, wantMode: tlspolicy.ModeLegacyInsecure, wantSource: tlspolicy.SourceExplicit, wantTLS: true, wantSkipVerify: true},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			policy, err := resolveActiveDirectoryConnectionRuntimePolicy(&Syncer{
				Type:      "Active Directory",
				Host:      "ad.example.test",
				Port:      test.port,
				TlsPolicy: test.policy,
			})
			if err != nil {
				t.Fatalf("resolve policy: %v", err)
			}
			if policy.Transport != test.wantTransport || policy.Diagnostic.TLSMode != test.wantMode || policy.Diagnostic.TLSSource != test.wantSource {
				t.Fatalf("policy = %+v, want transport=%q mode=%q source=%q", policy, test.wantTransport, test.wantMode, test.wantSource)
			}
			if (policy.TLSConfig != nil) != test.wantTLS {
				t.Fatalf("TLS config present = %t, want %t", policy.TLSConfig != nil, test.wantTLS)
			}
			if policy.TLSConfig != nil {
				if policy.TLSConfig.ServerName != "ad.example.test" || policy.TLSConfig.InsecureSkipVerify != test.wantSkipVerify {
					t.Fatalf("TLS config = ServerName %q skip=%t", policy.TLSConfig.ServerName, policy.TLSConfig.InsecureSkipVerify)
				}
			}
			assertLDAPDiagnosticCopySafe(t, policy.Diagnostic)
		})
	}
}

func TestLDAPRuntimePolicyRejectsInvalidInputsBeforeDial(t *testing.T) {
	assertLDAPRuntimeError(t, func() error {
		_, err := resolveGenericLDAPConnectionRuntimePolicy(nil)
		return err
	}(), ldapRuntimeStageConfig, ldapRuntimeErrorConfigInvalid)
	assertLDAPRuntimeError(t, func() error {
		_, err := resolveActiveDirectoryConnectionRuntimePolicy(nil)
		return err
	}(), ldapRuntimeStageConfig, ldapRuntimeErrorConfigInvalid)

	tests := []struct {
		name   string
		mutate func(*ldapConnectionRuntimePolicy)
	}{
		{name: "missing host", mutate: func(policy *ldapConnectionRuntimePolicy) { policy.Host = " " }},
		{name: "missing port", mutate: func(policy *ldapConnectionRuntimePolicy) { policy.Port = 0 }},
		{name: "invalid port", mutate: func(policy *ldapConnectionRuntimePolicy) { policy.Port = 65536 }},
		{name: "missing timeout", mutate: func(policy *ldapConnectionRuntimePolicy) { policy.Timeout = 0 }},
		{name: "unknown transport", mutate: func(policy *ldapConnectionRuntimePolicy) { policy.Transport = "private-scheme" }},
		{name: "plain with TLS config", mutate: func(policy *ldapConnectionRuntimePolicy) { policy.TLSConfig = &tls.Config{} }},
		{name: "LDAPS without TLS config", mutate: func(policy *ldapConnectionRuntimePolicy) { policy.Transport = ldapTransportTLS }},
	}

	dialCalls := 0
	withLDAPRuntimeDial(t, func(ldapConnectionRuntimePolicy) (ldapRuntimeClient, error) {
		dialCalls++
		return nil, errors.New("must not dial")
	})
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			policy := testLDAPRuntimePolicy(time.Second)
			test.mutate(&policy)
			_, err := connectLDAPRuntime(policy, "bind-user", "bind-password")
			assertLDAPRuntimeError(t, err, ldapRuntimeStageConfig, ldapRuntimeErrorConfigInvalid)
		})
	}
	if dialCalls != 0 {
		t.Fatalf("invalid policy attempted %d dials", dialCalls)
	}
}

func TestLDAPRuntimeConnectionErrorsAreCopySafeAndAbort(t *testing.T) {
	sensitive := []string{
		"private.directory.internal",
		"ldap://private.directory.internal:389",
		"cn=bind-secret",
		"bind-password-secret",
	}

	t.Run("dial failure closes unexpected connection", func(t *testing.T) {
		client := &fakeLDAPRuntimeClient{}
		withLDAPRuntimeDial(t, func(ldapConnectionRuntimePolicy) (ldapRuntimeClient, error) {
			return client, errors.New("dial ldap://private.directory.internal:389 failed")
		})
		_, err := connectLDAPRuntime(testLDAPRuntimePolicy(20*time.Millisecond), sensitive[2], sensitive[3])
		assertLDAPRuntimeError(t, err, ldapRuntimeStageDial, ldapRuntimeErrorDialFailed, sensitive...)
		if client.closeCalls != 1 {
			t.Fatalf("close calls = %d, want 1", client.closeCalls)
		}
	})

	t.Run("bind failure aborts", func(t *testing.T) {
		client := &fakeLDAPRuntimeClient{bindErr: errors.New("bind cn=bind-secret password=bind-password-secret failed")}
		withLDAPRuntimeDial(t, func(ldapConnectionRuntimePolicy) (ldapRuntimeClient, error) { return client, nil })
		_, err := connectLDAPRuntime(testLDAPRuntimePolicy(20*time.Millisecond), sensitive[2], sensitive[3])
		assertLDAPRuntimeError(t, err, ldapRuntimeStageBind, ldapRuntimeErrorBindFailed, sensitive...)
		if errors.Unwrap(err) != nil {
			t.Fatal("copy-safe runtime error must not retain the raw cause")
		}
		if formatted := fmt.Sprintf("%#v", err); strings.Contains(formatted, "bind-password-secret") || strings.Contains(formatted, "cn=bind-secret") {
			t.Fatalf("structured error leaked raw cause: %s", formatted)
		}
		if client.closeCalls != 1 || client.unbindCalls != 0 {
			t.Fatalf("abort calls close=%d unbind=%d, want 1/0", client.closeCalls, client.unbindCalls)
		}
	})

	t.Run("probe failure aborts", func(t *testing.T) {
		client := &fakeLDAPRuntimeClient{searchErr: errors.New("probe payload from private.directory.internal")}
		withLDAPRuntimeDial(t, func(ldapConnectionRuntimePolicy) (ldapRuntimeClient, error) { return client, nil })
		ldap := &Ldap{Host: sensitive[0], Port: 389, Username: sensitive[2], Password: sensitive[3]}
		_, err := ldap.GetLdapConn()
		assertLDAPRuntimeError(t, err, ldapRuntimeStageProbe, ldapRuntimeErrorProbeFailed, sensitive...)
		if client.closeCalls != 1 {
			t.Fatalf("close calls = %d, want 1", client.closeCalls)
		}
	})

	t.Run("probe timeout has stable classification", func(t *testing.T) {
		client := &fakeLDAPRuntimeClient{searchErr: goldap.NewError(goldap.ErrorNetwork, errors.New("ldap: connection timed out"))}
		withLDAPRuntimeDial(t, func(ldapConnectionRuntimePolicy) (ldapRuntimeClient, error) { return client, nil })
		_, err := (&Ldap{Host: sensitive[0], Port: 389, Username: sensitive[2], Password: sensitive[3]}).GetLdapConn()
		assertLDAPRuntimeError(t, err, ldapRuntimeStageProbe, ldapRuntimeErrorProbeTimeout, sensitive...)
		if client.closeCalls != 1 {
			t.Fatalf("close calls = %d, want 1", client.closeCalls)
		}
	})
}

func TestLDAPRuntimeErrorTimeoutClassification(t *testing.T) {
	tests := []struct {
		name     string
		stage    string
		cause    error
		wantCode string
	}{
		{name: "dial net timeout", stage: ldapRuntimeStageDial, cause: ldapTestTimeoutError{}, wantCode: ldapRuntimeErrorDialTimeout},
		{name: "bind context timeout", stage: ldapRuntimeStageBind, cause: context.DeadlineExceeded, wantCode: ldapRuntimeErrorBindTimeout},
		{name: "probe LDAP timeout", stage: ldapRuntimeStageProbe, cause: goldap.NewError(goldap.LDAPResultTimeout, errors.New("server timeout")), wantCode: ldapRuntimeErrorProbeTimeout},
		{name: "close LDAP network timeout", stage: ldapRuntimeStageClose, cause: goldap.NewError(goldap.ErrorNetwork, errors.New("ldap: connection timed out")), wantCode: ldapRuntimeErrorCloseTimeout},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			err := newLDAPRuntimeOperationError(test.stage, test.cause)
			assertLDAPRuntimeError(t, err, test.stage, test.wantCode)
			if errors.Unwrap(err) != nil {
				t.Fatalf("runtime error retained raw cause: %v", err)
			}
		})
	}
}

func TestLDAPRuntimeDialNilClientAndCloseFailuresRemainSafe(t *testing.T) {
	t.Run("nil client", func(t *testing.T) {
		withLDAPRuntimeDial(t, func(ldapConnectionRuntimePolicy) (ldapRuntimeClient, error) { return nil, nil })
		_, err := connectLDAPRuntime(testLDAPRuntimePolicy(time.Second), "bind-user", "bind-password")
		assertLDAPRuntimeError(t, err, ldapRuntimeStageDial, ldapRuntimeErrorDialFailed)
	})

	t.Run("abort close failure", func(t *testing.T) {
		client := &fakeLDAPRuntimeClient{bindErr: errors.New("bind failed"), closeErr: errors.New("close private target failed")}
		withLDAPRuntimeDial(t, func(ldapConnectionRuntimePolicy) (ldapRuntimeClient, error) { return client, nil })
		_, err := connectLDAPRuntime(testLDAPRuntimePolicy(time.Second), "bind-user", "bind-password")
		assertLDAPRuntimeError(t, err, ldapRuntimeStageBind, ldapRuntimeErrorBindFailed, "private target")
	})

	t.Run("normal close failure", func(t *testing.T) {
		client := &fakeLDAPRuntimeClient{closeErr: errors.New("close private target failed")}
		connection := newLDAPManagedConnection(client, testLDAPRuntimePolicy(time.Second))
		err := connection.Close()
		assertLDAPRuntimeError(t, err, ldapRuntimeStageClose, ldapRuntimeErrorCloseFailed, "private target")
	})

	t.Run("nil managed connection", func(t *testing.T) {
		var connection *ldapManagedConnection
		if err := connection.Close(); err != nil {
			t.Fatalf("nil Close() = %v", err)
		}
		connection = newLDAPManagedConnection(nil, testLDAPRuntimePolicy(time.Second))
		connection.finishInitialOperations()
		connection.abort()
		if err := connection.Close(); err != nil {
			t.Fatalf("clientless Close() = %v", err)
		}
	})
}

func TestActiveDirectoryRuntimeBindFailureUsesSharedCleanup(t *testing.T) {
	client := &fakeLDAPRuntimeClient{bindErr: errors.New("directory diagnostic with bind-password-secret")}
	withLDAPRuntimeDial(t, func(ldapConnectionRuntimePolicy) (ldapRuntimeClient, error) { return client, nil })
	provider := &ActiveDirectorySyncerProvider{Syncer: &Syncer{
		Type: "Active Directory", Host: "ad.example.test", Port: 389,
		User: "bind-user", Password: "bind-password-secret",
	}}
	_, err := provider.getLdapConn()
	if err == nil || !strings.Contains(err.Error(), "failed to bind to Active Directory") {
		t.Fatalf("getLdapConn() error = %v, want copy-safe bind stage", err)
	}
	if strings.Contains(err.Error(), "bind-password-secret") {
		t.Fatalf("bind error leaked password: %q", err.Error())
	}
	if client.closeCalls != 1 || client.unbindCalls != 0 {
		t.Fatalf("cleanup calls close=%d unbind=%d, want 1/0", client.closeCalls, client.unbindCalls)
	}
}

func TestActiveDirectoryRuntimeValidatesCredentialsAndRestoresTimeout(t *testing.T) {
	tests := []struct {
		name       string
		syncer     *Syncer
		wantPhrase string
	}{
		{name: "host", syncer: &Syncer{User: "bind", Password: "secret"}, wantPhrase: "host is required"},
		{name: "user", syncer: &Syncer{Host: "ad.example.test", Password: "secret"}, wantPhrase: "user (bind DN) is required"},
		{name: "password", syncer: &Syncer{Host: "ad.example.test", User: "bind"}, wantPhrase: "password is required"},
	}
	dialCalls := 0
	withLDAPRuntimeDial(t, func(ldapConnectionRuntimePolicy) (ldapRuntimeClient, error) {
		dialCalls++
		return nil, errors.New("must not dial")
	})
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			_, err := (&ActiveDirectorySyncerProvider{Syncer: test.syncer}).getLdapConn()
			if err == nil || !strings.Contains(err.Error(), test.wantPhrase) {
				t.Fatalf("getLdapConn() error = %v, want %q", err, test.wantPhrase)
			}
		})
	}
	if dialCalls != 0 {
		t.Fatalf("invalid credentials attempted %d dials", dialCalls)
	}

	client := &fakeLDAPRuntimeClient{}
	withLDAPRuntimeDial(t, func(ldapConnectionRuntimePolicy) (ldapRuntimeClient, error) { return client, nil })
	connection, err := (&ActiveDirectorySyncerProvider{Syncer: &Syncer{
		Type: "Active Directory", Host: "ad.example.test", User: "bind", Password: "secret",
	}}).getLdapConn()
	if err != nil {
		t.Fatalf("getLdapConn(): %v", err)
	}
	if len(client.timeouts) < 2 || client.timeouts[len(client.timeouts)-1] != 0 {
		t.Fatalf("timeouts = %v, want reset after bind", client.timeouts)
	}
	if err := connection.Close(); err != nil {
		t.Fatalf("Close(): %v", err)
	}
}

func TestActiveDirectoryUserProbeUsesManagedConnection(t *testing.T) {
	client := &fakeLDAPRuntimeClient{searchResult: &goldap.SearchResult{}}
	withLDAPRuntimeDial(t, func(ldapConnectionRuntimePolicy) (ldapRuntimeClient, error) { return client, nil })
	provider := &ActiveDirectorySyncerProvider{Syncer: &Syncer{
		Type: "Active Directory", Host: "ad.example.test", User: "bind", Password: "secret", Database: "dc=example,dc=test",
	}}
	users, err := provider.getActiveDirectoryUsers()
	if err != nil {
		t.Fatalf("getActiveDirectoryUsers(): %v", err)
	}
	if len(users) != 0 || client.searchCalls != 1 {
		t.Fatalf("users/search calls = %d/%d, want 0/1", len(users), client.searchCalls)
	}
	if client.unbindCalls != 1 || client.closeCalls != 1 {
		t.Fatalf("close lifecycle calls unbind=%d close=%d, want 1/1", client.unbindCalls, client.closeCalls)
	}
}

func TestLDAPRuntimeBindTimeoutClosesSocket(t *testing.T) {
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("listen: %v", err)
	}
	t.Cleanup(func() { _ = listener.Close() })

	serverClosed := make(chan error, 1)
	go func() {
		conn, acceptErr := listener.Accept()
		if acceptErr != nil {
			serverClosed <- acceptErr
			return
		}
		defer conn.Close()
		_ = conn.SetReadDeadline(time.Now().Add(3 * time.Second))
		buffer := make([]byte, 1024)
		for {
			if _, readErr := conn.Read(buffer); readErr != nil {
				serverClosed <- readErr
				return
			}
		}
	}()

	host, portText, err := net.SplitHostPort(listener.Addr().String())
	if err != nil {
		t.Fatalf("split listener address: %v", err)
	}
	port, err := net.LookupPort("tcp", portText)
	if err != nil {
		t.Fatalf("parse listener port: %v", err)
	}
	policy := testLDAPRuntimePolicy(80 * time.Millisecond)
	policy.Host = host
	policy.Port = port

	started := time.Now()
	_, err = connectLDAPRuntime(policy, "bind-user", "bind-password")
	elapsed := time.Since(started)
	assertLDAPRuntimeError(t, err, ldapRuntimeStageBind, ldapRuntimeErrorBindTimeout)
	if elapsed < 50*time.Millisecond || elapsed > 2*time.Second {
		t.Fatalf("bind timeout elapsed = %s, want bounded around 80ms", elapsed)
	}
	select {
	case closeErr := <-serverClosed:
		if timeoutErr, ok := closeErr.(net.Error); ok && timeoutErr.Timeout() {
			t.Fatalf("server did not observe client close before deadline: %v", closeErr)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("server did not observe client socket close")
	}
}

func TestLDAPManagedConnectionCloseIsIdempotentAndNonPanicking(t *testing.T) {
	client := &fakeLDAPRuntimeClient{
		unbindErr: errors.New("unbind response contained private.directory.internal"),
	}
	connection := newLDAPManagedConnection(client, testLDAPRuntimePolicy(20*time.Millisecond))

	firstErr := connection.Close()
	secondErr := connection.Close()
	assertLDAPRuntimeError(t, firstErr, ldapRuntimeStageClose, ldapRuntimeErrorCloseFailed, "private.directory.internal")
	assertLDAPRuntimeError(t, secondErr, ldapRuntimeStageClose, ldapRuntimeErrorCloseFailed, "private.directory.internal")
	if client.unbindCalls != 1 || client.closeCalls != 1 {
		t.Fatalf("close lifecycle calls unbind=%d close=%d, want 1/1", client.unbindCalls, client.closeCalls)
	}
}

func TestGenericLDAPSelfSignedTLSCompatibilityIsConnectionScoped(t *testing.T) {
	t.Run("strict system trust fails closed", func(t *testing.T) {
		listener, serverDone := startSelfSignedLDAPTLSServer(t)
		host, port := splitLDAPTestAddress(t, listener.Addr().String())
		policy, err := resolveGenericLDAPConnectionRuntimePolicy(&Ldap{Host: host, Port: port, EnableSsl: true})
		if err != nil {
			t.Fatalf("resolve strict policy: %v", err)
		}
		policy.Timeout = 500 * time.Millisecond
		_, err = connectLDAPRuntime(policy, "bind-user", "bind-password")
		assertLDAPRuntimeError(t, err, ldapRuntimeStageDial, ldapRuntimeErrorDialFailed)
		select {
		case <-serverDone:
		case <-time.After(2 * time.Second):
			t.Fatal("strict TLS server did not finish handshake")
		}
	})

	t.Run("legacy flag reaches bind then times out", func(t *testing.T) {
		listener, serverDone := startSelfSignedLDAPTLSServer(t)
		host, port := splitLDAPTestAddress(t, listener.Addr().String())
		policy, err := resolveGenericLDAPConnectionRuntimePolicy(&Ldap{Host: host, Port: port, EnableSsl: true, AllowSelfSignedCert: true})
		if err != nil {
			t.Fatalf("resolve legacy policy: %v", err)
		}
		policy.Timeout = 80 * time.Millisecond
		policy.Diagnostic.TimeoutMillis = policy.Timeout.Milliseconds()
		_, err = connectLDAPRuntime(policy, "bind-user", "bind-password")
		assertLDAPRuntimeError(t, err, ldapRuntimeStageBind, ldapRuntimeErrorBindTimeout)
		select {
		case serverErr := <-serverDone:
			if timeoutErr, ok := serverErr.(net.Error); ok && timeoutErr.Timeout() {
				t.Fatalf("legacy TLS server did not observe client close: %v", serverErr)
			}
		case <-time.After(2 * time.Second):
			t.Fatal("legacy TLS server did not observe client close")
		}
	})
}

func TestLDAPRuntimeSuccessfulProbeRestoresRequestTimeout(t *testing.T) {
	client := &fakeLDAPRuntimeClient{searchResult: &goldap.SearchResult{}}
	withLDAPRuntimeDial(t, func(ldapConnectionRuntimePolicy) (ldapRuntimeClient, error) { return client, nil })
	connection, err := (&Ldap{Host: "directory.example.test", Port: 389, Username: "bind", Password: "secret"}).GetLdapConn()
	if err != nil {
		t.Fatalf("GetLdapConn(): %v", err)
	}
	if len(client.timeouts) < 2 || client.timeouts[0] != ldapConnectionRuntimeTimeout || client.timeouts[len(client.timeouts)-1] != 0 {
		t.Fatalf("timeouts = %v, want initial runtime timeout then reset", client.timeouts)
	}
	if err := connection.Close(); err != nil {
		t.Fatalf("Close(): %v", err)
	}
}

func TestLdapConnCloseIsNilSafe(t *testing.T) {
	var connection *LdapConn
	if err := connection.Close(); err != nil {
		t.Fatalf("nil Close() = %v", err)
	}
	if err := (&LdapConn{}).Close(); err != nil {
		t.Fatalf("empty Close() = %v", err)
	}
}

func TestMicrosoftADProbeHandlesEmptyAttributeValues(t *testing.T) {
	client := &fakeLDAPRuntimeClient{searchResult: &goldap.SearchResult{Entries: []*goldap.Entry{{
		Attributes: []*goldap.EntryAttribute{{Name: "vendorname"}, {Name: "isGlobalCatalogReady"}},
	}}}}
	got, err := isMicrosoftAD(client)
	if err != nil {
		t.Fatalf("isMicrosoftAD(): %v", err)
	}
	if got {
		t.Fatal("empty root DSE attributes must not classify as Active Directory")
	}
}

func TestMicrosoftADProbeClassification(t *testing.T) {
	tests := []struct {
		name       string
		attributes []*goldap.EntryAttribute
		wantAD     bool
	}{
		{
			name: "Microsoft root DSE",
			attributes: []*goldap.EntryAttribute{
				{Name: "isGlobalCatalogReady", Values: []string{"TRUE"}},
				{Name: "forestFunctionality", Values: []string{"7"}},
			},
			wantAD: true,
		},
		{
			name: "vendor attributes indicate generic LDAP",
			attributes: []*goldap.EntryAttribute{
				{Name: "vendorname", Values: []string{"directory-vendor"}},
				{Name: "isGlobalCatalogReady", Values: []string{"TRUE"}},
				{Name: "forestFunctionality", Values: []string{"7"}},
			},
		},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			client := &fakeLDAPRuntimeClient{searchResult: &goldap.SearchResult{Entries: []*goldap.Entry{{Attributes: test.attributes}}}}
			got, err := isMicrosoftAD(client)
			if err != nil {
				t.Fatalf("isMicrosoftAD(): %v", err)
			}
			if got != test.wantAD {
				t.Fatalf("isMicrosoftAD() = %t, want %t", got, test.wantAD)
			}
		})
	}
}

type fakeLDAPRuntimeClient struct {
	bindErr      error
	searchResult *goldap.SearchResult
	searchErr    error
	unbindErr    error
	closeErr     error
	bindCalls    int
	searchCalls  int
	unbindCalls  int
	closeCalls   int
	timeouts     []time.Duration
}

type ldapTestTimeoutError struct{}

func (ldapTestTimeoutError) Error() string   { return "test timeout" }
func (ldapTestTimeoutError) Timeout() bool   { return true }
func (ldapTestTimeoutError) Temporary() bool { return true }

func (c *fakeLDAPRuntimeClient) Bind(string, string) error {
	c.bindCalls++
	return c.bindErr
}

func (c *fakeLDAPRuntimeClient) Search(*goldap.SearchRequest) (*goldap.SearchResult, error) {
	c.searchCalls++
	return c.searchResult, c.searchErr
}

func (c *fakeLDAPRuntimeClient) SetTimeout(timeout time.Duration) {
	c.timeouts = append(c.timeouts, timeout)
}

func (c *fakeLDAPRuntimeClient) Unbind() error {
	c.unbindCalls++
	return c.unbindErr
}

func (c *fakeLDAPRuntimeClient) Close() error {
	c.closeCalls++
	return c.closeErr
}

func (c *fakeLDAPRuntimeClient) Raw() *goldap.Conn {
	return nil
}

func testLDAPRuntimePolicy(timeout time.Duration) ldapConnectionRuntimePolicy {
	return ldapConnectionRuntimePolicy{
		Transport: ldapTransportPlain,
		Host:      "private.directory.internal",
		Port:      389,
		Timeout:   timeout,
		Diagnostic: ldapConnectionRuntimeDiagnostic{
			Transport:     ldapTransportPlain,
			TLSMode:       ldapTLSModeDisabled,
			TLSSource:     ldapTLSSourceTransport,
			TimeoutMillis: timeout.Milliseconds(),
			TimeoutSource: ldapTimeoutSourceRuntimeDefault,
		},
	}
}

func withLDAPRuntimeDial(t *testing.T, dial func(ldapConnectionRuntimePolicy) (ldapRuntimeClient, error)) {
	t.Helper()
	previous := ldapRuntimeDial
	ldapRuntimeDial = dial
	t.Cleanup(func() { ldapRuntimeDial = previous })
}

func assertLDAPRuntimeError(t *testing.T, err error, wantStage string, wantCode string, sensitive ...string) {
	t.Helper()
	if err == nil {
		t.Fatalf("error = nil, want stage=%q code=%q", wantStage, wantCode)
	}
	var runtimeErr *ldapConnectionRuntimeError
	if !errors.As(err, &runtimeErr) {
		t.Fatalf("error type = %T (%v), want *ldapConnectionRuntimeError", err, err)
	}
	if runtimeErr.Stage != wantStage || runtimeErr.Code != wantCode {
		t.Fatalf("runtime error = %+v, want stage=%q code=%q", runtimeErr, wantStage, wantCode)
	}
	for _, value := range sensitive {
		if value != "" && strings.Contains(err.Error(), value) {
			t.Fatalf("copy-safe error leaked %q: %q", value, err.Error())
		}
	}
}

func assertLDAPDiagnosticCopySafe(t *testing.T, diagnostic ldapConnectionRuntimeDiagnostic) {
	t.Helper()
	serialized := diagnostic.Transport + diagnostic.TLSMode + diagnostic.TLSSource + diagnostic.TimeoutSource
	for _, sensitive := range []string{"directory.example.test", "ad.example.test", "bind-password", "ldap://", "ldaps://"} {
		if strings.Contains(serialized, sensitive) {
			t.Fatalf("diagnostic leaked %q: %+v", sensitive, diagnostic)
		}
	}
}

func startSelfSignedLDAPTLSServer(t *testing.T) (net.Listener, <-chan error) {
	t.Helper()
	key, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		t.Fatalf("generate TLS key: %v", err)
	}
	template := &x509.Certificate{
		SerialNumber: big.NewInt(1),
		Subject:      pkix.Name{CommonName: "local LDAP test"},
		NotBefore:    time.Now().Add(-time.Minute),
		NotAfter:     time.Now().Add(time.Hour),
		KeyUsage:     x509.KeyUsageDigitalSignature | x509.KeyUsageKeyEncipherment,
		ExtKeyUsage:  []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth},
		IPAddresses:  []net.IP{net.ParseIP("127.0.0.1")},
	}
	der, err := x509.CreateCertificate(rand.Reader, template, template, &key.PublicKey, key)
	if err != nil {
		t.Fatalf("create TLS certificate: %v", err)
	}
	certificate, err := tls.X509KeyPair(
		pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: der}),
		pem.EncodeToMemory(&pem.Block{Type: "RSA PRIVATE KEY", Bytes: x509.MarshalPKCS1PrivateKey(key)}),
	)
	if err != nil {
		t.Fatalf("load TLS certificate: %v", err)
	}
	baseListener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("listen TLS: %v", err)
	}
	listener := tls.NewListener(baseListener, &tls.Config{Certificates: []tls.Certificate{certificate}, MinVersion: tls.VersionTLS12})
	t.Cleanup(func() { _ = listener.Close() })

	serverDone := make(chan error, 1)
	go func() {
		conn, acceptErr := listener.Accept()
		if acceptErr != nil {
			serverDone <- acceptErr
			return
		}
		defer conn.Close()
		_ = conn.SetReadDeadline(time.Now().Add(3 * time.Second))
		buffer := make([]byte, 1024)
		for {
			if _, readErr := conn.Read(buffer); readErr != nil {
				serverDone <- readErr
				return
			}
		}
	}()
	return listener, serverDone
}

func splitLDAPTestAddress(t *testing.T, address string) (string, int) {
	t.Helper()
	host, portText, err := net.SplitHostPort(address)
	if err != nil {
		t.Fatalf("split listener address: %v", err)
	}
	port, err := net.LookupPort("tcp", portText)
	if err != nil {
		t.Fatalf("parse listener port: %v", err)
	}
	return host, port
}
