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
	"crypto/x509"
	"errors"
	"strings"
	"testing"

	"git.leagsoft.com/aicodex/aicodex-admin/tlspolicy"
)

func TestActiveDirectoryAppliesConnectionScopedTLSPolicy(t *testing.T) {
	engine := newSQLiteTestEngine(t, new(Cert))
	useTestOrmer(t, engine)
	ca := &Cert{
		Owner:       "test",
		Name:        "ad-ca",
		Type:        "SSL",
		Certificate: string(newEnterpriseTLSTestCertificate(t, true, x509.KeyUsageCertSign)),
	}
	if _, err := engine.Insert(ca); err != nil {
		t.Fatalf("insert AD CA: %v", err)
	}

	tests := []struct {
		name       string
		policy     string
		cert       string
		wantSkip   bool
		wantCustom bool
	}{
		{name: "legacy unmigrated", wantSkip: true},
		{name: "system", policy: tlspolicy.ModeSystem},
		{name: "custom CA", policy: tlspolicy.ModeCustomCA, cert: ca.Name, wantCustom: true},
		{name: "explicit legacy", policy: tlspolicy.ModeLegacyInsecure, wantSkip: true},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			var captured ldapConnectionRuntimePolicy
			previous := ldapRuntimeDial
			ldapRuntimeDial = func(policy ldapConnectionRuntimePolicy) (ldapRuntimeClient, error) {
				captured = policy
				return nil, errors.New("test dial stopped")
			}
			t.Cleanup(func() { ldapRuntimeDial = previous })

			provider := &ActiveDirectorySyncerProvider{Syncer: &Syncer{
				Owner:     "test",
				Type:      "Active Directory",
				Host:      "ad.example.test",
				Port:      636,
				User:      "bind-user",
				Password:  "bind-password",
				TlsPolicy: test.policy,
				Cert:      test.cert,
			}}
			if _, err := provider.getLdapConn(); err == nil || !strings.Contains(err.Error(), "failed to connect") {
				t.Fatalf("getLdapConn() error = %v, want stopped dial", err)
			}
			if captured.TLSConfig == nil {
				t.Fatal("LDAPS dial did not receive TLS config")
			}
			if captured.TLSConfig.InsecureSkipVerify != test.wantSkip {
				t.Fatalf("InsecureSkipVerify = %t, want %t", captured.TLSConfig.InsecureSkipVerify, test.wantSkip)
			}
			if (captured.TLSConfig.RootCAs != nil) != test.wantCustom {
				t.Fatalf("custom RootCAs present = %t, want %t", captured.TLSConfig.RootCAs != nil, test.wantCustom)
			}
			if captured.TLSConfig.ServerName != "ad.example.test" {
				t.Fatalf("ServerName = %q, want ad.example.test", captured.TLSConfig.ServerName)
			}
		})
	}
}

func TestActiveDirectoryRejectsInvalidPolicyBeforeDial(t *testing.T) {
	engine := newSQLiteTestEngine(t, new(Cert))
	useTestOrmer(t, engine)
	ca := &Cert{Owner: "test", Name: "ad-plain-ca", Type: "SSL", Certificate: string(newEnterpriseTLSTestCertificate(t, true, x509.KeyUsageCertSign))}
	if _, err := engine.Insert(ca); err != nil {
		t.Fatalf("insert plain LDAP CA: %v", err)
	}

	previousDial := ldapRuntimeDial
	dialCalls := 0
	ldapRuntimeDial = func(ldapConnectionRuntimePolicy) (ldapRuntimeClient, error) {
		dialCalls++
		return nil, errors.New("must not dial")
	}
	t.Cleanup(func() {
		ldapRuntimeDial = previousDial
	})

	tests := []struct {
		name     string
		port     int
		policy   string
		cert     string
		wantCode string
	}{
		{name: "unknown on LDAPS", port: 636, policy: "target-secret-policy", wantCode: tlspolicy.ErrorCodeInvalidPolicy},
		{name: "missing custom CA on LDAPS", port: 636, policy: tlspolicy.ModeCustomCA, wantCode: tlspolicy.ErrorCodeCARequired},
		{name: "custom CA on plain LDAP", port: 389, policy: tlspolicy.ModeCustomCA, cert: ca.Name, wantCode: tlspolicy.ErrorCodeCAConflict},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			provider := &ActiveDirectorySyncerProvider{Syncer: &Syncer{
				Owner: "test", Type: "Active Directory", Host: "target-secret-host", Port: test.port,
				User: "bind-user", Password: "bind-password", TlsPolicy: test.policy, Cert: test.cert,
			}}
			_, err := provider.getLdapConn()
			assertEnterpriseTLSPolicyError(t, err, test.wantCode, "target-secret")
		})
	}
	if dialCalls != 0 {
		t.Fatalf("invalid policy attempted %d network dials", dialCalls)
	}
}
