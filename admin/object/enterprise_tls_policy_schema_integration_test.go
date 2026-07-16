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

//go:build integration

package object

import (
	"os"
	"strings"
	"testing"

	"git.leagsoft.com/aicodex/aicodex-admin/tlspolicy"
	"github.com/lib/pq"
	"github.com/xorm-io/xorm"
)

func TestEnterpriseTLSPolicySchemaPostgresIntegration(t *testing.T) {
	driverName := strings.ToLower(strings.TrimSpace(os.Getenv(testDatabaseDriverEnv)))
	if driverName != "postgres" {
		t.Fatalf("database integration prerequisite missing: set %s=postgres", testDatabaseDriverEnv)
	}
	dataSourceName := strings.TrimSpace(os.Getenv(testDatabaseDSNEnv))
	if dataSourceName == "" {
		t.Fatalf("database integration prerequisite missing: set %s", testDatabaseDSNEnv)
	}

	marker := databaseIntegrationMarker()
	schemaName := "enterprise_tls_test_" + marker
	quotedSchema := pq.QuoteIdentifier(schemaName)
	adminEngine, err := xorm.NewEngine("postgres", dataSourceName)
	if err != nil {
		t.Fatalf("initialize PostgreSQL integration engine failed (%T)", err)
	}
	t.Cleanup(func() { _ = adminEngine.Close() })
	if _, err := adminEngine.Exec("CREATE SCHEMA " + quotedSchema); err != nil {
		t.Fatalf("create isolated PostgreSQL schema failed (%T)", err)
	}
	t.Cleanup(func() {
		if _, err := adminEngine.Exec("DROP SCHEMA " + quotedSchema + " CASCADE"); err != nil {
			t.Errorf("cleanup isolated PostgreSQL schema failed (%T)", err)
			return
		}
		t.Logf("database=postgres marker_hash=%s cleanup=complete", markerHash(schemaName))
	})

	engine, err := xorm.NewEngine("postgres", postgresDataSourceNameForSchema(dataSourceName, schemaName))
	if err != nil {
		t.Fatalf("initialize isolated PostgreSQL schema engine failed (%T)", err)
	}
	engine.SetSchema(schemaName)
	t.Cleanup(func() { _ = engine.Close() })
	if err := engine.Sync2(new(Provider), new(Syncer)); err != nil {
		t.Fatalf("sync Provider/Syncer schema failed (%T)", err)
	}

	assertPostgresColumnExists(t, engine, "provider", "tls_policy")
	assertPostgresColumnExists(t, engine, "syncer", "tls_policy")
	provider := &Provider{Owner: "integration", Name: "smtp", TlsPolicy: tlspolicy.ModeSystem}
	syncer := &Syncer{Owner: "integration", Name: "ad", TlsPolicy: ""}
	if _, err := engine.Insert(provider, syncer); err != nil {
		t.Fatalf("insert TLS policy fixtures failed (%T)", err)
	}
	loadedProvider := &Provider{Owner: provider.Owner, Name: provider.Name}
	loadedSyncer := &Syncer{Owner: syncer.Owner, Name: syncer.Name}
	if exists, err := engine.Get(loadedProvider); err != nil || !exists || loadedProvider.TlsPolicy != tlspolicy.ModeSystem {
		t.Fatalf("read Provider TLS policy exists=%t value=%q err=%T", exists, loadedProvider.TlsPolicy, err)
	}
	if exists, err := engine.Get(loadedSyncer); err != nil || !exists || loadedSyncer.TlsPolicy != "" {
		t.Fatalf("read legacy Syncer TLS policy exists=%t value=%q err=%T", exists, loadedSyncer.TlsPolicy, err)
	}
}

func assertPostgresColumnExists(t *testing.T, engine *xorm.Engine, tableName string, columnName string) {
	t.Helper()
	type columnRecord struct {
		ColumnName string `xorm:"column_name"`
	}
	var columns []columnRecord
	if err := engine.SQL(`SELECT column_name FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = $1 AND column_name = $2`, tableName, columnName).Find(&columns); err != nil {
		t.Fatalf("inspect PostgreSQL column failed table=%s column=%s error=%T", tableName, columnName, err)
	}
	if len(columns) != 1 || columns[0].ColumnName != columnName {
		t.Fatalf("PostgreSQL column missing table=%s column=%s", tableName, columnName)
	}
}
