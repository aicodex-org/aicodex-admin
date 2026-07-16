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

package email

import (
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/pem"
	"math/big"
	"testing"
	"time"

	"git.leagsoft.com/aicodex/aicodex-admin/tlspolicy"
)

func TestSmtpEmailProviderAppliesResolvedTLSPolicy(t *testing.T) {
	caPEM := newSMTPTestCA(t)
	tests := []struct {
		name       string
		provider   string
		policy     string
		caPEM      []byte
		wantSkip   bool
		wantCustom bool
		wantSource string
	}{
		{name: "system overrides historical provider type", provider: "SUBMAIL", policy: tlspolicy.ModeSystem, wantSource: tlspolicy.SourceExplicit},
		{name: "custom CA", provider: "SMTP", policy: tlspolicy.ModeCustomCA, caPEM: caPEM, wantCustom: true, wantSource: tlspolicy.SourceExplicit},
		{name: "legacy unmigrated", provider: "SUBMAIL", wantSkip: true, wantSource: tlspolicy.SourceLegacyUnmigrated},
		{name: "explicit legacy", provider: "SMTP", policy: tlspolicy.ModeLegacyInsecure, wantSkip: true, wantSource: tlspolicy.SourceExplicit},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			legacyMode := tlspolicy.ModeSystem
			if test.provider == "SUBMAIL" {
				legacyMode = tlspolicy.ModeLegacyInsecure
			}
			resolution, err := tlspolicy.ResolveWithLegacyMode(test.policy, test.caPEM, legacyMode)
			if err != nil {
				t.Fatalf("ResolveWithLegacyMode() error = %v", err)
			}
			provider, err := NewSmtpEmailProvider("user", "password", "smtp.example.test", 465, test.provider, "Enable", resolution, false)
			if err != nil {
				t.Fatalf("NewSmtpEmailProvider() error = %v", err)
			}
			if provider.Dialer.TLSConfig == nil {
				t.Fatal("SMTP dialer TLSConfig is nil")
			}
			if provider.Dialer.TLSConfig.ServerName != "smtp.example.test" {
				t.Fatalf("ServerName = %q", provider.Dialer.TLSConfig.ServerName)
			}
			if provider.Dialer.TLSConfig.InsecureSkipVerify != test.wantSkip {
				t.Fatalf("InsecureSkipVerify = %t, want %t", provider.Dialer.TLSConfig.InsecureSkipVerify, test.wantSkip)
			}
			if (provider.Dialer.TLSConfig.RootCAs != nil) != test.wantCustom {
				t.Fatalf("custom RootCAs present = %t, want %t", provider.Dialer.TLSConfig.RootCAs != nil, test.wantCustom)
			}
			if provider.TLSDiagnostic.Source != test.wantSource || provider.TLSDiagnostic.CustomCA != test.wantCustom {
				t.Fatalf("diagnostic = %+v", provider.TLSDiagnostic)
			}
			if !provider.Dialer.SSL {
				t.Fatal("sslMode Enable no longer forces SSL")
			}
		})
	}
}

func TestSmtpEmailProviderCopiesResolution(t *testing.T) {
	resolution, err := tlspolicy.ResolveWithLegacyMode(tlspolicy.ModeSystem, nil, tlspolicy.ModeSystem)
	if err != nil {
		t.Fatalf("ResolveWithLegacyMode() error = %v", err)
	}
	provider, err := NewSmtpEmailProvider("user", "password", "smtp.example.test", 587, "SMTP", "Disable", resolution, false)
	if err != nil {
		t.Fatalf("NewSmtpEmailProvider() error = %v", err)
	}
	if provider.Dialer.SSL {
		t.Fatal("sslMode Disable no longer disables forced SSL")
	}

	resolution.TLSConfig.InsecureSkipVerify = true
	resolution.Diagnostic.Source = "mutated"
	if provider.Dialer.TLSConfig.InsecureSkipVerify || provider.TLSDiagnostic.Source != tlspolicy.SourceExplicit {
		t.Fatalf("provider changed after resolution mutation: %+v", provider)
	}
}

func TestSmtpEmailProviderRejectsMissingResolution(t *testing.T) {
	provider, err := NewSmtpEmailProvider("user", "password", "smtp.example.test", 587, "SMTP", "Auto", nil, false)
	if provider != nil {
		t.Fatalf("provider = %+v, want nil", provider)
	}
	policyErr, ok := err.(*tlspolicy.Error)
	if !ok || policyErr.Code != tlspolicy.ErrorCodeInvalidPolicy {
		t.Fatalf("error = %T %v", err, err)
	}
}

func TestGetEmailProviderKeepsHTTPProvidersOutsideTLSResolution(t *testing.T) {
	tests := []struct {
		name string
		typ  string
	}{
		{name: "Azure ACS", typ: "Azure ACS"},
		{name: "Custom HTTP Email", typ: "Custom HTTP Email"},
		{name: "SendGrid", typ: "SendGrid"},
		{name: "Resend", typ: "Resend"},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			provider, err := GetEmailProvider(test.typ, "client", "secret", "host", 443, "Auto", "https://example.test", "POST", nil, nil, "application/json", nil, false)
			if err != nil || provider == nil {
				t.Fatalf("GetEmailProvider(%s) = (%T, %v)", test.typ, provider, err)
			}
			if _, ok := provider.(*SmtpEmailProvider); ok {
				t.Fatalf("%s unexpectedly requires SMTP TLS resolution", test.typ)
			}
		})
	}
}

func newSMTPTestCA(t *testing.T) []byte {
	t.Helper()
	key, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		t.Fatalf("generate SMTP CA key: %v", err)
	}
	template := &x509.Certificate{
		SerialNumber:          big.NewInt(time.Now().UnixNano()),
		Subject:               pkix.Name{CommonName: "smtp-test-ca"},
		NotBefore:             time.Now().Add(-time.Hour),
		NotAfter:              time.Now().Add(time.Hour),
		IsCA:                  true,
		BasicConstraintsValid: true,
		KeyUsage:              x509.KeyUsageCertSign,
	}
	der, err := x509.CreateCertificate(rand.Reader, template, template, &key.PublicKey, key)
	if err != nil {
		t.Fatalf("create SMTP CA: %v", err)
	}
	return pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: der})
}
