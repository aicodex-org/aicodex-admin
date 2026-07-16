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
	"strings"
	"testing"

	"git.leagsoft.com/aicodex/aicodex-admin/email"
	"git.leagsoft.com/aicodex/aicodex-admin/tlspolicy"
)

func TestGetEmailProviderAppliesObjectResolvedTLSPolicy(t *testing.T) {
	engine := newSQLiteTestEngine(t, new(Cert))
	useTestOrmer(t, engine)
	cert := &Cert{
		Owner:       "test",
		Name:        "smtp-ca",
		Type:        "SSL",
		Certificate: string(newEnterpriseTLSTestCertificate(t, true, x509.KeyUsageCertSign)),
		PrivateKey:  "private-key-secret",
	}
	if _, err := engine.Insert(cert); err != nil {
		t.Fatalf("insert SMTP CA: %v", err)
	}

	provider, err := getEmailProvider(&Provider{
		Owner: "test", Category: "Email", Type: "SMTP", Host: "smtp.example.test", Port: 465,
		TlsPolicy: tlspolicy.ModeCustomCA, Cert: cert.Name, SslMode: "Enable",
	})
	if err != nil {
		t.Fatalf("getEmailProvider() error = %v", err)
	}
	smtpProvider, ok := provider.(*email.SmtpEmailProvider)
	if !ok {
		t.Fatalf("provider type = %T", provider)
	}
	if smtpProvider.Dialer.TLSConfig == nil || smtpProvider.Dialer.TLSConfig.RootCAs == nil || smtpProvider.TLSDiagnostic.Source != tlspolicy.SourceExplicit {
		t.Fatalf("SMTP provider policy = %+v", smtpProvider)
	}
	if strings.Contains(errString(err), cert.PrivateKey) || strings.Contains(errString(err), cert.Name) {
		t.Fatal("SMTP policy leaked private material")
	}
}

func TestGetEmailProviderKeepsHTTPProvidersOutsideTLSPolicy(t *testing.T) {
	provider, err := getEmailProvider(&Provider{
		Owner: "test", Category: "Email", Type: "SendGrid", Cert: "historical-unrelated-cert",
		TlsPolicy: tlspolicy.ModeSystem,
	})
	if err != nil || provider == nil {
		t.Fatalf("getEmailProvider(SendGrid) = (%T, %v)", provider, err)
	}
	if _, ok := provider.(*email.SmtpEmailProvider); ok {
		t.Fatal("SendGrid was treated as SMTP")
	}
}

func TestGetEmailProviderPreservesHistoricalEmptyPolicyBehavior(t *testing.T) {
	tests := []struct {
		name     string
		typ      string
		wantSkip bool
	}{
		{name: "ordinary SMTP stays strict", typ: "SMTP"},
		{name: "SUBMAIL keeps legacy compatibility", typ: "SUBMAIL", wantSkip: true},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			provider, err := getEmailProvider(&Provider{
				Owner: "test", Category: "Email", Type: test.typ, Host: "smtp.example.test", Port: 465,
			})
			if err != nil {
				t.Fatalf("getEmailProvider() error = %v", err)
			}
			smtpProvider, ok := provider.(*email.SmtpEmailProvider)
			if !ok {
				t.Fatalf("provider type = %T", provider)
			}
			if smtpProvider.Dialer.TLSConfig.InsecureSkipVerify != test.wantSkip {
				t.Fatalf("InsecureSkipVerify = %t, want %t", smtpProvider.Dialer.TLSConfig.InsecureSkipVerify, test.wantSkip)
			}
			if smtpProvider.TLSDiagnostic.Source != tlspolicy.SourceLegacyUnmigrated {
				t.Fatalf("diagnostic = %+v", smtpProvider.TLSDiagnostic)
			}
		})
	}
}

func TestGetEmailProviderRejectsInvalidSMTPPolicyBeforeDial(t *testing.T) {
	engine := newSQLiteTestEngine(t, new(Cert))
	useTestOrmer(t, engine)
	provider, err := getEmailProvider(&Provider{
		Owner: "test", Category: "Email", Type: "SMTP", Host: "target-secret-host",
		TlsPolicy: tlspolicy.ModeCustomCA, Cert: "target-secret-cert",
	})
	if provider != nil {
		t.Fatalf("provider = %T, want nil", provider)
	}
	assertEnterpriseTLSPolicyError(t, err, tlspolicy.ErrorCodeCAInvalid, "target-secret")
}

func TestEmailEntryPointsFailBeforeNetworkOnInvalidTLS(t *testing.T) {
	engine := newSQLiteTestEngine(t, new(Cert))
	useTestOrmer(t, engine)
	provider := &Provider{
		Owner: "test", Category: "Email", Type: "SMTP", Host: "target-secret-host",
		TlsPolicy: tlspolicy.ModeCustomCA, Cert: "target-secret-cert",
	}

	err := SendEmail(provider, "subject", "content", []string{"recipient@example.test"}, "sender")
	assertEnterpriseTLSPolicyError(t, err, tlspolicy.ErrorCodeCAInvalid, "target-secret")
	err = TestSmtpServer(provider)
	assertEnterpriseTLSPolicyError(t, err, tlspolicy.ErrorCodeCAInvalid, "target-secret")
}

func TestSmtpServerRejectsHTTPEmailProvider(t *testing.T) {
	err := TestSmtpServer(&Provider{Type: "SendGrid"})
	if err == nil || !strings.Contains(err.Error(), "not SMTP") {
		t.Fatalf("TestSmtpServer(SendGrid) error = %v", err)
	}
}
