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

package tlspolicy

import (
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/pem"
	"math/big"
	"strings"
	"testing"
	"time"
)

func TestNormalizeForAdd(t *testing.T) {
	tests := []struct {
		name    string
		input   string
		want    string
		wantErr string
	}{
		{name: "empty defaults to system", input: "", want: ModeSystem},
		{name: "system", input: ModeSystem, want: ModeSystem},
		{name: "custom CA", input: ModeCustomCA, want: ModeCustomCA},
		{name: "explicit legacy", input: ModeLegacyInsecure, want: ModeLegacyInsecure},
		{name: "whitespace is not empty", input: " ", wantErr: ErrorCodeInvalidPolicy},
		{name: "case variant is invalid", input: "SYSTEM", wantErr: ErrorCodeInvalidPolicy},
		{name: "unknown is invalid", input: "permissive", wantErr: ErrorCodeInvalidPolicy},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			got, err := NormalizeForAdd(test.input)
			assertPolicyResult(t, got, err, test.want, test.wantErr)
		})
	}
}

func TestNormalizeForUpdate(t *testing.T) {
	tests := []struct {
		name      string
		requested string
		stored    string
		want      string
		wantErr   string
	}{
		{name: "empty preserves unmigrated", requested: "", stored: "", want: ""},
		{name: "empty preserves explicit", requested: "", stored: ModeCustomCA, want: ModeCustomCA},
		{name: "explicit promotes unmigrated", requested: ModeSystem, stored: "", want: ModeSystem},
		{name: "explicit changes policy", requested: ModeLegacyInsecure, stored: ModeSystem, want: ModeLegacyInsecure},
		{name: "unknown requested", requested: "unknown", stored: ModeSystem, wantErr: ErrorCodeInvalidPolicy},
		{name: "blank requested", requested: "\t", stored: ModeSystem, wantErr: ErrorCodeInvalidPolicy},
		{name: "unknown stored fails closed", requested: "", stored: "unknown", wantErr: ErrorCodeInvalidPolicy},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			got, err := NormalizeForUpdate(test.requested, test.stored)
			assertPolicyResult(t, got, err, test.want, test.wantErr)
		})
	}
}

func TestResolve(t *testing.T) {
	caPEM, caSubject := newTestCertificatePEM(t, true, x509.KeyUsageCertSign|x509.KeyUsageDigitalSignature)

	tests := []struct {
		name       string
		policy     string
		caPEM      []byte
		wantMode   string
		wantSource string
		wantCustom bool
		wantSkip   bool
		wantErr    string
	}{
		{name: "legacy unmigrated", policy: "", wantMode: ModeLegacyInsecure, wantSource: SourceLegacyUnmigrated, wantSkip: true},
		{name: "system", policy: ModeSystem, wantMode: ModeSystem, wantSource: SourceExplicit},
		{name: "custom CA", policy: ModeCustomCA, caPEM: caPEM, wantMode: ModeCustomCA, wantSource: SourceExplicit, wantCustom: true},
		{name: "explicit legacy", policy: ModeLegacyInsecure, wantMode: ModeLegacyInsecure, wantSource: SourceExplicit, wantSkip: true},
		{name: "unknown", policy: "unknown", wantErr: ErrorCodeInvalidPolicy},
		{name: "blank", policy: " ", wantErr: ErrorCodeInvalidPolicy},
		{name: "custom CA missing material", policy: ModeCustomCA, wantErr: ErrorCodeCARequired},
		{name: "system conflicts with CA", policy: ModeSystem, caPEM: caPEM, wantErr: ErrorCodeCAConflict},
		{name: "legacy conflicts with CA", policy: ModeLegacyInsecure, caPEM: caPEM, wantErr: ErrorCodeCAConflict},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			resolution, err := ResolveWithLegacyMode(test.policy, test.caPEM, ModeLegacyInsecure)
			if test.wantErr != "" {
				assertPolicyError(t, err, test.wantErr, []string{test.policy, string(test.caPEM)})
				if resolution != nil {
					t.Fatalf("ResolveWithLegacyMode() result = %+v, want nil", resolution)
				}
				return
			}
			if err != nil {
				t.Fatalf("ResolveWithLegacyMode() error = %v", err)
			}
			if resolution == nil || resolution.TLSConfig == nil {
				t.Fatal("ResolveWithLegacyMode() returned nil config")
			}
			if resolution.Diagnostic.Mode != test.wantMode || resolution.Diagnostic.Source != test.wantSource || resolution.Diagnostic.CustomCA != test.wantCustom {
				t.Fatalf("diagnostic = %+v, want mode=%q source=%q customCA=%t", resolution.Diagnostic, test.wantMode, test.wantSource, test.wantCustom)
			}
			if resolution.TLSConfig.InsecureSkipVerify != test.wantSkip {
				t.Fatalf("InsecureSkipVerify = %t, want %t", resolution.TLSConfig.InsecureSkipVerify, test.wantSkip)
			}
			if test.wantCustom && !certificatePoolContainsSubject(resolution.TLSConfig.RootCAs.Subjects(), caSubject) {
				t.Fatal("custom CA subject was not added to the connection pool")
			}
		})
	}
}

func TestResolveWithLegacyEquivalentMode(t *testing.T) {
	tests := []struct {
		name       string
		legacyMode string
		wantMode   string
		wantSkip   bool
		wantErr    string
	}{
		{name: "historically strict", legacyMode: ModeSystem, wantMode: ModeSystem},
		{name: "historically insecure", legacyMode: ModeLegacyInsecure, wantMode: ModeLegacyInsecure, wantSkip: true},
		{name: "invalid equivalent", legacyMode: ModeCustomCA, wantErr: ErrorCodeInvalidPolicy},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			resolution, err := ResolveWithLegacyMode("", nil, test.legacyMode)
			if test.wantErr != "" {
				assertPolicyError(t, err, test.wantErr, []string{test.legacyMode})
				if resolution != nil {
					t.Fatalf("resolution = %+v, want nil", resolution)
				}
				return
			}
			if err != nil {
				t.Fatalf("ResolveWithLegacyMode() error = %v", err)
			}
			if resolution.Diagnostic.Mode != test.wantMode || resolution.Diagnostic.Source != SourceLegacyUnmigrated {
				t.Fatalf("diagnostic = %+v", resolution.Diagnostic)
			}
			if resolution.TLSConfig.InsecureSkipVerify != test.wantSkip {
				t.Fatalf("InsecureSkipVerify = %t, want %t", resolution.TLSConfig.InsecureSkipVerify, test.wantSkip)
			}
		})
	}
}

func TestResolveRejectsNonCAOrUnsafePEM(t *testing.T) {
	leafPEM, _ := newTestCertificatePEM(t, false, x509.KeyUsageDigitalSignature)
	caWithoutSigning, _ := newTestCertificatePEM(t, true, x509.KeyUsageDigitalSignature)
	validCA, _ := newTestCertificatePEM(t, true, x509.KeyUsageCertSign)
	privateKeyBlock := pem.EncodeToMemory(&pem.Block{Type: "PRIVATE KEY", Bytes: []byte("private-key-secret")})

	tests := []struct {
		name string
		pem  []byte
	}{
		{name: "invalid PEM", pem: []byte("certificate-secret")},
		{name: "leaf certificate", pem: leafPEM},
		{name: "CA missing cert sign usage", pem: caWithoutSigning},
		{name: "private key block", pem: privateKeyBlock},
		{name: "mixed CA and private key", pem: append(append([]byte{}, validCA...), privateKeyBlock...)},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			resolution, err := ResolveWithLegacyMode(ModeCustomCA, test.pem, ModeSystem)
			if resolution != nil {
				t.Fatalf("ResolveWithLegacyMode() result = %+v, want nil", resolution)
			}
			assertPolicyError(t, err, ErrorCodeCAInvalid, []string{string(test.pem), "private-key-secret", "certificate-secret"})
		})
	}
}

func TestResolveReturnsIndependentResults(t *testing.T) {
	caPEM, _ := newTestCertificatePEM(t, true, x509.KeyUsageCertSign)
	first, err := ResolveWithLegacyMode(ModeCustomCA, caPEM, ModeSystem)
	if err != nil {
		t.Fatalf("first ResolveWithLegacyMode() error = %v", err)
	}
	second, err := ResolveWithLegacyMode(ModeCustomCA, caPEM, ModeSystem)
	if err != nil {
		t.Fatalf("second ResolveWithLegacyMode() error = %v", err)
	}
	if first == second || first.TLSConfig == second.TLSConfig || first.TLSConfig.RootCAs == second.TLSConfig.RootCAs {
		t.Fatal("ResolveWithLegacyMode() reused mutable result state")
	}

	first.TLSConfig.InsecureSkipVerify = true
	first.Diagnostic.Mode = "mutated"
	if second.TLSConfig.InsecureSkipVerify || second.Diagnostic.Mode != ModeCustomCA {
		t.Fatalf("second result changed after first mutation: %+v", second)
	}
}

func assertPolicyResult(t *testing.T, got string, err error, want string, wantErr string) {
	t.Helper()
	if wantErr != "" {
		assertPolicyError(t, err, wantErr, []string{got})
		return
	}
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got != want {
		t.Fatalf("result = %q, want %q", got, want)
	}
}

func assertPolicyError(t *testing.T, err error, wantCode string, forbidden []string) {
	t.Helper()
	if err == nil {
		t.Fatalf("error = nil, want code %q", wantCode)
	}
	policyErr, ok := err.(*Error)
	if !ok {
		t.Fatalf("error type = %T, want *Error", err)
	}
	if policyErr.Code != wantCode {
		t.Fatalf("error code = %q, want %q", policyErr.Code, wantCode)
	}
	for _, value := range forbidden {
		if strings.TrimSpace(value) != "" && strings.Contains(err.Error(), value) {
			t.Fatalf("error leaked %q: %v", value, err)
		}
	}
}

func newTestCertificatePEM(t *testing.T, isCA bool, keyUsage x509.KeyUsage) ([]byte, []byte) {
	t.Helper()
	privateKey, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		t.Fatalf("generate test key: %v", err)
	}
	template := &x509.Certificate{
		SerialNumber:          big.NewInt(time.Now().UnixNano()),
		Subject:               pkix.Name{CommonName: "enterprise-tls-test-ca"},
		NotBefore:             time.Now().Add(-time.Hour),
		NotAfter:              time.Now().Add(time.Hour),
		IsCA:                  isCA,
		BasicConstraintsValid: true,
		KeyUsage:              keyUsage,
	}
	der, err := x509.CreateCertificate(rand.Reader, template, template, &privateKey.PublicKey, privateKey)
	if err != nil {
		t.Fatalf("create test certificate: %v", err)
	}
	certificate, err := x509.ParseCertificate(der)
	if err != nil {
		t.Fatalf("parse test certificate: %v", err)
	}
	return pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: der}), certificate.RawSubject
}

func certificatePoolContainsSubject(subjects [][]byte, want []byte) bool {
	for _, subject := range subjects {
		if string(subject) == string(want) {
			return true
		}
	}
	return false
}
