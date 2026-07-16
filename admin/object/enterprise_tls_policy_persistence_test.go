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

	"git.leagsoft.com/aicodex/aicodex-admin/tlspolicy"
	"github.com/xorm-io/xorm"
)

func TestEnterpriseTLSPolicySQLiteSchemaAndAddDefaults(t *testing.T) {
	engine := newSQLiteTestEngine(t, new(Provider), new(Syncer))
	useTestOrmer(t, engine)

	assertSQLiteColumnExists(t, engine, "provider", "tls_policy")
	assertSQLiteColumnExists(t, engine, "syncer", "tls_policy")

	provider := &Provider{Owner: "test", Name: "smtp-new", Category: "Email", Type: "SMTP"}
	added, err := AddProvider(provider)
	if err != nil || !added {
		t.Fatalf("AddProvider() = (%t, %v)", added, err)
	}
	if provider.TlsPolicy != tlspolicy.ModeSystem {
		t.Fatalf("provider TlsPolicy = %q, want %q", provider.TlsPolicy, tlspolicy.ModeSystem)
	}
	storedProvider, err := GetProvider("test/smtp-new")
	if err != nil || storedProvider == nil || storedProvider.TlsPolicy != tlspolicy.ModeSystem {
		t.Fatalf("stored provider = %+v, error = %v", storedProvider, err)
	}

	syncer := &Syncer{Owner: "test", Name: "ad-new", Organization: "test", Type: "Active Directory"}
	added, err = AddSyncer(syncer)
	if err != nil || !added {
		t.Fatalf("AddSyncer() = (%t, %v)", added, err)
	}
	if syncer.TlsPolicy != tlspolicy.ModeSystem {
		t.Fatalf("syncer TlsPolicy = %q, want %q", syncer.TlsPolicy, tlspolicy.ModeSystem)
	}
	storedSyncer, err := GetSyncer("test/ad-new")
	if err != nil || storedSyncer == nil || storedSyncer.TlsPolicy != tlspolicy.ModeSystem {
		t.Fatalf("stored syncer = %+v, error = %v", storedSyncer, err)
	}
}

func TestEnterpriseTLSPolicySQLiteSyncPreservesLegacyRows(t *testing.T) {
	engine := newSQLiteTestEngine(t)
	legacyTables := []string{
		`CREATE TABLE provider (owner TEXT NOT NULL, name TEXT NOT NULL, PRIMARY KEY (owner, name))`,
		`CREATE TABLE syncer (owner TEXT NOT NULL, name TEXT NOT NULL, PRIMARY KEY (owner, name))`,
	}
	for _, statement := range legacyTables {
		if _, err := engine.Exec(statement); err != nil {
			t.Fatalf("create legacy TLS policy table: %v", err)
		}
	}
	if _, err := engine.Exec(`INSERT INTO provider (owner, name) VALUES (?, ?)`, "test", "legacy-provider"); err != nil {
		t.Fatalf("insert legacy Provider: %v", err)
	}
	if _, err := engine.Exec(`INSERT INTO syncer (owner, name) VALUES (?, ?)`, "test", "legacy-syncer"); err != nil {
		t.Fatalf("insert legacy Syncer: %v", err)
	}

	if err := engine.Sync2(new(Provider), new(Syncer)); err != nil {
		t.Fatalf("upgrade Provider/Syncer schema: %v", err)
	}
	assertSQLiteColumnExists(t, engine, "provider", "tls_policy")
	assertSQLiteColumnExists(t, engine, "syncer", "tls_policy")

	provider := &Provider{Owner: "test", Name: "legacy-provider"}
	if exists, err := engine.Get(provider); err != nil || !exists || provider.TlsPolicy != "" {
		t.Fatalf("legacy Provider after Sync2 exists=%t tlsPolicy=%q err=%v", exists, provider.TlsPolicy, err)
	}
	syncer := &Syncer{Owner: "test", Name: "legacy-syncer"}
	if exists, err := engine.Get(syncer); err != nil || !exists || syncer.TlsPolicy != "" {
		t.Fatalf("legacy Syncer after Sync2 exists=%t tlsPolicy=%q err=%v", exists, syncer.TlsPolicy, err)
	}
}

func TestEnterpriseTLSPolicyUpdatePreservesAndPromotes(t *testing.T) {
	engine := newSQLiteTestEngine(t, new(Provider), new(Syncer))
	useTestOrmer(t, engine)

	legacyProvider := &Provider{Owner: "test", Name: "smtp-existing", Category: "Email", Type: "SMTP", DisplayName: "before"}
	legacySyncer := &Syncer{Owner: "test", Name: "ad-existing", Organization: "test", Type: "Active Directory", IsEnabled: false}
	if _, err := engine.Insert(legacyProvider, legacySyncer); err != nil {
		t.Fatalf("seed legacy records: %v", err)
	}

	legacyProvider.DisplayName = "after"
	updated, err := UpdateProvider("test/smtp-existing", legacyProvider)
	if err != nil || !updated {
		t.Fatalf("UpdateProvider(preserve) = (%t, %v)", updated, err)
	}
	storedProvider, err := GetProvider("test/smtp-existing")
	if err != nil || storedProvider == nil || storedProvider.TlsPolicy != "" || storedProvider.DisplayName != "after" {
		t.Fatalf("preserved provider = %+v, error = %v", storedProvider, err)
	}

	updated, err = UpdateSyncer("test/ad-existing", legacySyncer, true, "en")
	if err != nil || !updated {
		t.Fatalf("UpdateSyncer(preserve) = (%t, %v)", updated, err)
	}
	storedSyncer, err := GetSyncer("test/ad-existing")
	if err != nil || storedSyncer == nil || storedSyncer.TlsPolicy != "" {
		t.Fatalf("preserved syncer = %+v, error = %v", storedSyncer, err)
	}

	legacyProvider.TlsPolicy = tlspolicy.ModeLegacyInsecure
	updated, err = UpdateProvider("test/smtp-existing", legacyProvider)
	if err != nil || !updated {
		t.Fatalf("UpdateProvider(promote) = (%t, %v)", updated, err)
	}
	storedProvider, _ = GetProvider("test/smtp-existing")
	if storedProvider.TlsPolicy != tlspolicy.ModeLegacyInsecure {
		t.Fatalf("promoted provider TlsPolicy = %q", storedProvider.TlsPolicy)
	}

	legacySyncer.TlsPolicy = tlspolicy.ModeSystem
	updated, err = UpdateSyncer("test/ad-existing", legacySyncer, true, "en")
	if err != nil || !updated {
		t.Fatalf("UpdateSyncer(promote) = (%t, %v)", updated, err)
	}
	storedSyncer, _ = GetSyncer("test/ad-existing")
	if storedSyncer.TlsPolicy != tlspolicy.ModeSystem {
		t.Fatalf("promoted syncer TlsPolicy = %q", storedSyncer.TlsPolicy)
	}
}

func TestEnterpriseTLSPolicyRejectsUnknownWithoutWriting(t *testing.T) {
	engine := newSQLiteTestEngine(t, new(Provider), new(Syncer))
	useTestOrmer(t, engine)

	provider := &Provider{Owner: "test", Name: "smtp-invalid", Category: "Email", Type: "SMTP", TlsPolicy: tlspolicy.ModeSystem}
	syncer := &Syncer{Owner: "test", Name: "ad-invalid", Organization: "test", Type: "Active Directory", TlsPolicy: tlspolicy.ModeSystem}
	if _, err := engine.Insert(provider, syncer); err != nil {
		t.Fatalf("seed explicit records: %v", err)
	}

	provider.TlsPolicy = "unsafe-secret-policy"
	if updated, err := UpdateProvider("test/smtp-invalid", provider); err == nil || updated {
		t.Fatalf("UpdateProvider(unknown) = (%t, %v), want failure", updated, err)
	} else {
		assertEnterpriseTLSPolicyError(t, err, tlspolicy.ErrorCodeInvalidPolicy, "unsafe-secret-policy")
	}
	storedProvider, _ := GetProvider("test/smtp-invalid")
	if storedProvider.TlsPolicy != tlspolicy.ModeSystem {
		t.Fatalf("provider changed after rejected update: %q", storedProvider.TlsPolicy)
	}

	syncer.TlsPolicy = "unsafe-secret-policy"
	if updated, err := UpdateSyncer("test/ad-invalid", syncer, true, "en"); err == nil || updated {
		t.Fatalf("UpdateSyncer(unknown) = (%t, %v), want failure", updated, err)
	} else {
		assertEnterpriseTLSPolicyError(t, err, tlspolicy.ErrorCodeInvalidPolicy, "unsafe-secret-policy")
	}
	storedSyncer, _ := GetSyncer("test/ad-invalid")
	if storedSyncer.TlsPolicy != tlspolicy.ModeSystem {
		t.Fatalf("syncer changed after rejected update: %q", storedSyncer.TlsPolicy)
	}

	newProvider := &Provider{Owner: "test", Name: "smtp-invalid-add", Type: "SMTP", TlsPolicy: "unsafe-secret-policy"}
	if added, err := AddProvider(newProvider); err == nil || added {
		t.Fatalf("AddProvider(unknown) = (%t, %v), want failure", added, err)
	}
	count, err := engine.Where("name = ?", newProvider.Name).Count(new(Provider))
	if err != nil || count != 0 {
		t.Fatalf("rejected provider insert count = %d, error = %v", count, err)
	}
}

func TestEnterpriseTLSPolicyRejectsTargetConflictsBeforeWriting(t *testing.T) {
	engine := newSQLiteTestEngine(t, new(Provider), new(Syncer), new(Cert))
	useTestOrmer(t, engine)
	cert := &Cert{
		Owner:       "test",
		Name:        "write-ca",
		Type:        "SSL",
		Certificate: string(newEnterpriseTLSTestCertificate(t, true, x509.KeyUsageCertSign)),
	}
	if _, err := engine.Insert(cert); err != nil {
		t.Fatalf("insert write CA: %v", err)
	}

	conflictingProvider := &Provider{
		Owner: "test", Name: "smtp-conflict", Category: "Email", Type: "SMTP",
		TlsPolicy: tlspolicy.ModeSystem, Cert: cert.Name,
	}
	if added, err := AddProvider(conflictingProvider); err == nil || added {
		t.Fatalf("AddProvider(conflict) = (%t, %v), want failure", added, err)
	} else {
		assertEnterpriseTLSPolicyError(t, err, tlspolicy.ErrorCodeCAConflict, cert.Name)
	}

	missingCASyncer := &Syncer{
		Owner: "test", Name: "ad-missing-ca", Organization: "test", Type: "Active Directory",
		TlsPolicy: tlspolicy.ModeCustomCA,
	}
	if added, err := AddSyncer(missingCASyncer); err == nil || added {
		t.Fatalf("AddSyncer(missing CA) = (%t, %v), want failure", added, err)
	} else {
		assertEnterpriseTLSPolicyError(t, err, tlspolicy.ErrorCodeCARequired, "")
	}
	plainCASyncer := &Syncer{
		Owner: "test", Name: "ad-plain-ca", Organization: "test", Type: "Active Directory", Port: 389,
		TlsPolicy: tlspolicy.ModeCustomCA, Cert: cert.Name,
	}
	if added, err := AddSyncer(plainCASyncer); err == nil || added {
		t.Fatalf("AddSyncer(plain custom CA) = (%t, %v), want failure", added, err)
	} else {
		assertEnterpriseTLSPolicyError(t, err, tlspolicy.ErrorCodeCAConflict, cert.Name)
	}

	storedSyncer := &Syncer{
		Owner: "test", Name: "ad-update-plain", Organization: "test", Type: "Active Directory", Port: 389,
		TlsPolicy: tlspolicy.ModeSystem,
	}
	if _, err := engine.Insert(storedSyncer); err != nil {
		t.Fatalf("insert plain update fixture: %v", err)
	}
	requestedSyncer := *storedSyncer
	requestedSyncer.TlsPolicy = tlspolicy.ModeCustomCA
	requestedSyncer.Cert = cert.Name
	if updated, err := UpdateSyncer("test/ad-update-plain", &requestedSyncer, true, "en"); err == nil || updated {
		t.Fatalf("UpdateSyncer(plain custom CA) = (%t, %v), want failure", updated, err)
	} else {
		assertEnterpriseTLSPolicyError(t, err, tlspolicy.ErrorCodeCAConflict, cert.Name)
	}
	preservedSyncer, err := GetSyncer("test/ad-update-plain")
	if err != nil || preservedSyncer == nil || preservedSyncer.TlsPolicy != tlspolicy.ModeSystem || preservedSyncer.Cert != "" {
		t.Fatalf("plain Syncer changed after rejected update: %+v err=%v", preservedSyncer, err)
	}

	validProvider := &Provider{
		Owner: "test", Name: "adfs-custom-ca", Category: "OAuth", Type: "ADFS",
		TlsPolicy: tlspolicy.ModeCustomCA, Cert: cert.Name,
	}
	if added, err := AddProvider(validProvider); err != nil || !added {
		t.Fatalf("AddProvider(valid custom CA) = (%t, %v)", added, err)
	}

	for _, name := range []string{conflictingProvider.Name} {
		count, err := engine.Where("name = ?", name).Count(new(Provider))
		if err != nil || count != 0 {
			t.Fatalf("rejected provider %q count = %d, error = %v", name, count, err)
		}
	}
	count, err := engine.Where("name = ?", missingCASyncer.Name).Count(new(Syncer))
	if err != nil || count != 0 {
		t.Fatalf("rejected syncer count = %d, error = %v", count, err)
	}
	count, err = engine.Where("name = ?", plainCASyncer.Name).Count(new(Syncer))
	if err != nil || count != 0 {
		t.Fatalf("rejected plain custom CA syncer count = %d, error = %v", count, err)
	}
}

func useTestOrmer(t *testing.T, engine *xorm.Engine) {
	t.Helper()
	previous := ormer
	ormer = &Ormer{Engine: engine}
	t.Cleanup(func() { ormer = previous })
}

func assertSQLiteColumnExists(t *testing.T, engine *xorm.Engine, table string, column string) {
	t.Helper()
	rows, err := engine.QueryString("PRAGMA table_info(" + table + ")")
	if err != nil {
		t.Fatalf("inspect SQLite table %s: %v", table, err)
	}
	for _, row := range rows {
		if row["name"] == column {
			return
		}
	}
	t.Fatalf("SQLite table %s missing column %s", table, column)
}

func assertEnterpriseTLSPolicyError(t *testing.T, err error, code string, forbidden string) {
	t.Helper()
	policyErr, ok := err.(*tlspolicy.Error)
	if !ok || policyErr.Code != code {
		t.Fatalf("error = %T %v, want code %q", err, err, code)
	}
	if strings.TrimSpace(forbidden) != "" && strings.Contains(err.Error(), forbidden) {
		t.Fatalf("error leaked %q: %v", forbidden, err)
	}
}
