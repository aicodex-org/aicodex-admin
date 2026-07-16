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
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/pem"
	"math/big"
	"strings"
	"testing"
	"time"

	"git.leagsoft.com/aicodex/aicodex-admin/tlspolicy"
	"github.com/xorm-io/xorm/names"
)

func TestResolveProviderTLSPolicyUsesOnlyValidatedPublicCA(t *testing.T) {
	engine := newSQLiteTestEngine(t, new(Cert))
	useTestOrmer(t, engine)
	caPEM := newEnterpriseTLSTestCertificate(t, true, x509.KeyUsageCertSign)
	cert := &Cert{
		Owner:       "test",
		Name:        "enterprise-ca",
		Type:        "SSL",
		Certificate: string(caPEM),
		PrivateKey:  "private-key-secret",
	}
	if _, err := engine.Insert(cert); err != nil {
		t.Fatalf("insert CA cert: %v", err)
	}

	provider := &Provider{Owner: "test", Type: "ADFS", TlsPolicy: tlspolicy.ModeCustomCA, Cert: cert.Name}
	resolution, err := ResolveProviderTLSPolicy(provider)
	if err != nil {
		t.Fatalf("ResolveProviderTLSPolicy() error = %v", err)
	}
	if resolution.Diagnostic.Mode != tlspolicy.ModeCustomCA || !resolution.Diagnostic.CustomCA || resolution.TLSConfig.RootCAs == nil {
		t.Fatalf("resolution = %+v", resolution)
	}
	if strings.Contains(errString(err), cert.PrivateKey) || strings.Contains(errString(err), cert.Name) {
		t.Fatal("resolution leaked private key or certificate reference")
	}

	syncerResolution, err := ResolveSyncerTLSPolicy(&Syncer{Owner: "test", Type: "Active Directory", TlsPolicy: tlspolicy.ModeCustomCA, Cert: cert.Name})
	if err != nil || syncerResolution.Diagnostic.Mode != tlspolicy.ModeCustomCA {
		t.Fatalf("ResolveSyncerTLSPolicy() = (%+v, %v)", syncerResolution, err)
	}
}

func TestResolveSyncerTLSPolicyPreservesHistoricalPortBehavior(t *testing.T) {
	tests := []struct {
		name     string
		port     int
		wantMode string
		wantSkip bool
	}{
		{name: "plain LDAP stays non TLS", port: 389, wantMode: tlspolicy.ModeSystem},
		{name: "LDAPS keeps legacy compatibility", port: 636, wantMode: tlspolicy.ModeLegacyInsecure, wantSkip: true},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			resolution, err := ResolveSyncerTLSPolicy(&Syncer{Type: "Active Directory", Port: test.port})
			if err != nil {
				t.Fatalf("ResolveSyncerTLSPolicy() error = %v", err)
			}
			if resolution.Diagnostic.Mode != test.wantMode || resolution.Diagnostic.Source != tlspolicy.SourceLegacyUnmigrated {
				t.Fatalf("diagnostic = %+v", resolution.Diagnostic)
			}
			if resolution.TLSConfig.InsecureSkipVerify != test.wantSkip {
				t.Fatalf("InsecureSkipVerify = %t, want %t", resolution.TLSConfig.InsecureSkipVerify, test.wantSkip)
			}
		})
	}
}

func TestGetEnterpriseCAPublicMaterialUsesOwnerThenAdminWithoutPrivateKey(t *testing.T) {
	engine := newSQLiteTestEngine(t, new(Cert))
	useTestOrmer(t, engine)
	ownerCert := &Cert{
		Owner:       "test",
		Name:        "owner-ca",
		Type:        "SSL",
		Certificate: "owner-public-certificate",
		PrivateKey:  "owner-private-key-must-not-be-selected",
	}
	adminCert := &Cert{
		Owner:       "admin",
		Name:        "shared-ca",
		Type:        "SSL",
		Certificate: "admin-public-certificate",
		PrivateKey:  "admin-private-key-must-not-be-selected",
	}
	if _, err := engine.Insert(ownerCert, adminCert); err != nil {
		t.Fatalf("insert public material fixtures: %v", err)
	}

	ownerMaterial, err := getEnterpriseCAPublicMaterial("test", ownerCert.Name)
	if err != nil || ownerMaterial == nil || ownerMaterial.Type != ownerCert.Type || ownerMaterial.Certificate != ownerCert.Certificate {
		t.Fatalf("owner public material = (%+v, %v)", ownerMaterial, err)
	}
	sharedMaterial, err := getEnterpriseCAPublicMaterial("test", adminCert.Name)
	if err != nil || sharedMaterial == nil || sharedMaterial.Type != adminCert.Type || sharedMaterial.Certificate != adminCert.Certificate {
		t.Fatalf("admin fallback public material = (%+v, %v)", sharedMaterial, err)
	}
}

func TestGetEnterpriseCAPublicMaterialHonorsTablePrefix(t *testing.T) {
	engine := newSQLiteTestEngine(t)
	engine.SetTableMapper(names.NewPrefixMapper(names.SnakeMapper{}, "tenant_"))
	if err := engine.Sync2(new(Cert)); err != nil {
		t.Fatalf("sync prefixed Cert table: %v", err)
	}
	useTestOrmer(t, engine)
	cert := &Cert{
		Owner:       "test",
		Name:        "prefixed-ca",
		Type:        "SSL",
		Certificate: "prefixed-public-certificate",
		PrivateKey:  "prefixed-private-key-must-not-be-selected",
	}
	if _, err := engine.Insert(cert); err != nil {
		t.Fatalf("insert prefixed CA: %v", err)
	}

	material, err := getEnterpriseCAPublicMaterial(cert.Owner, cert.Name)
	if err != nil || material == nil || material.Type != cert.Type || material.Certificate != cert.Certificate {
		t.Fatalf("prefixed public material = (%+v, %v)", material, err)
	}
}

func TestResolveEnterpriseTLSPolicyRejectsUnsafeCertReferences(t *testing.T) {
	engine := newSQLiteTestEngine(t, new(Cert))
	useTestOrmer(t, engine)
	leafPEM := newEnterpriseTLSTestCertificate(t, false, x509.KeyUsageDigitalSignature)
	certs := []*Cert{
		{Owner: "test", Name: "wrong-type-secret", Type: "x509", Certificate: string(newEnterpriseTLSTestCertificate(t, true, x509.KeyUsageCertSign))},
		{Owner: "test", Name: "leaf-secret", Type: "SSL", Certificate: string(leafPEM)},
		{Owner: "test", Name: "empty-secret", Type: "SSL"},
	}
	for _, cert := range certs {
		if _, err := engine.Insert(cert); err != nil {
			t.Fatalf("insert test cert: %v", err)
		}
	}

	tests := []struct {
		name     string
		policy   string
		certName string
		wantCode string
	}{
		{name: "missing reference", policy: tlspolicy.ModeCustomCA, wantCode: tlspolicy.ErrorCodeCARequired},
		{name: "not found", policy: tlspolicy.ModeCustomCA, certName: "missing-secret", wantCode: tlspolicy.ErrorCodeCAInvalid},
		{name: "wrong type", policy: tlspolicy.ModeCustomCA, certName: "wrong-type-secret", wantCode: tlspolicy.ErrorCodeCAInvalid},
		{name: "leaf", policy: tlspolicy.ModeCustomCA, certName: "leaf-secret", wantCode: tlspolicy.ErrorCodeCAInvalid},
		{name: "empty", policy: tlspolicy.ModeCustomCA, certName: "empty-secret", wantCode: tlspolicy.ErrorCodeCAInvalid},
		{name: "system conflict", policy: tlspolicy.ModeSystem, certName: "leaf-secret", wantCode: tlspolicy.ErrorCodeCAConflict},
		{name: "legacy conflict", policy: tlspolicy.ModeLegacyInsecure, certName: "leaf-secret", wantCode: tlspolicy.ErrorCodeCAConflict},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			resolution, err := ResolveProviderTLSPolicy(&Provider{Owner: "test", Type: "ADFS", TlsPolicy: test.policy, Cert: test.certName})
			if resolution != nil {
				t.Fatalf("resolution = %+v, want nil", resolution)
			}
			assertEnterpriseTLSPolicyError(t, err, test.wantCode, test.certName)
		})
	}

	legacy, err := ResolveProviderTLSPolicy(&Provider{Owner: "test", Type: "ADFS", Cert: "missing-secret"})
	if err != nil || legacy.Diagnostic.Source != tlspolicy.SourceLegacyUnmigrated || !legacy.TLSConfig.InsecureSkipVerify {
		t.Fatalf("legacy unmigrated resolution = (%+v, %v)", legacy, err)
	}
}

func newEnterpriseTLSTestCertificate(t *testing.T, isCA bool, usage x509.KeyUsage) []byte {
	t.Helper()
	key, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		t.Fatalf("generate certificate key: %v", err)
	}
	template := &x509.Certificate{
		SerialNumber:          big.NewInt(time.Now().UnixNano()),
		Subject:               pkix.Name{CommonName: "enterprise-tls-object-test"},
		NotBefore:             time.Now().Add(-time.Hour),
		NotAfter:              time.Now().Add(time.Hour),
		IsCA:                  isCA,
		BasicConstraintsValid: true,
		KeyUsage:              usage,
	}
	der, err := x509.CreateCertificate(rand.Reader, template, template, &key.PublicKey, key)
	if err != nil {
		t.Fatalf("create certificate: %v", err)
	}
	return pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: der})
}

func errString(err error) string {
	if err == nil {
		return ""
	}
	return err.Error()
}
