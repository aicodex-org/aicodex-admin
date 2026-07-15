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
	"crypto/sha256"
	"fmt"
	"net/url"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/lib/pq"
	"github.com/xorm-io/xorm"
	"github.com/xorm-io/xorm/names"
)

const (
	testDatabaseDriverEnv = "AICODEX_TEST_DB_DRIVER"
	testDatabaseDSNEnv    = "AICODEX_TEST_DB_DSN"
)

func TestAICodexOwnedSchemaRegistryIntegration(t *testing.T) {
	driverName := strings.ToLower(strings.TrimSpace(os.Getenv(testDatabaseDriverEnv)))
	if driverName == "" {
		t.Fatalf("database integration prerequisite missing: set %s", testDatabaseDriverEnv)
	}
	dataSourceName := strings.TrimSpace(os.Getenv(testDatabaseDSNEnv))
	if dataSourceName == "" {
		t.Fatalf("database integration prerequisite missing: set %s", testDatabaseDSNEnv)
	}

	switch driverName {
	case "postgres":
		runPostgresSchemaRegistryIntegration(t, dataSourceName)
	case "mysql":
		runMySQLSchemaRegistryIntegration(t, dataSourceName)
	default:
		t.Fatalf("unsupported %s value %q; supported values are postgres and mysql", testDatabaseDriverEnv, driverName)
	}
}

func runPostgresSchemaRegistryIntegration(t *testing.T, dataSourceName string) {
	t.Helper()
	marker := databaseIntegrationMarker()
	schemaName := "aicodex_schema_test_" + marker
	quotedSchema := pq.QuoteIdentifier(schemaName)

	adminEngine, err := xorm.NewEngine("postgres", dataSourceName)
	if err != nil {
		t.Fatalf("initialize PostgreSQL integration engine failed (%T)", err)
	}
	t.Cleanup(func() { _ = adminEngine.Close() })
	if _, err := adminEngine.Exec("CREATE SCHEMA " + quotedSchema); err != nil {
		t.Fatalf("create isolated PostgreSQL schema failed; verify connectivity and CREATE SCHEMA permission (%T)", err)
	}
	t.Cleanup(func() {
		if _, err := adminEngine.Exec("DROP SCHEMA " + quotedSchema + " CASCADE"); err != nil {
			t.Errorf("cleanup isolated PostgreSQL schema failed (%T)", err)
			return
		}
		t.Logf("database=postgres marker_hash=%s cleanup=complete", markerHash(schemaName))
	})

	scopedDataSourceName := postgresDataSourceNameForSchema(dataSourceName, schemaName)
	engine, err := xorm.NewEngine("postgres", scopedDataSourceName)
	if err != nil {
		t.Fatalf("initialize isolated PostgreSQL schema engine failed (%T)", err)
	}
	engine.SetSchema(schemaName)
	t.Cleanup(func() { _ = engine.Close() })

	assertSchemaRegistryIntegration(t, engine)
}

func runMySQLSchemaRegistryIntegration(t *testing.T, dataSourceName string) {
	t.Helper()
	marker := databaseIntegrationMarker()
	prefix := "acst_" + marker + "_"

	engine, err := xorm.NewEngine("mysql", dataSourceName)
	if err != nil {
		t.Fatalf("initialize MySQL compatibility engine failed (%T)", err)
	}
	engine.SetTableMapper(names.NewPrefixMapper(names.SnakeMapper{}, prefix))
	t.Cleanup(func() { _ = engine.Close() })
	models := aicodexOwnedSchemaModels()
	t.Cleanup(func() {
		if err := engine.DropTables(models...); err != nil {
			t.Errorf("cleanup prefixed MySQL compatibility tables failed (%T)", err)
			return
		}
		t.Logf("database=mysql marker_hash=%s cleanup=complete", markerHash(prefix))
	})

	assertSchemaRegistryIntegration(t, engine)
}

func assertSchemaRegistryIntegration(t *testing.T, engine *xorm.Engine) {
	t.Helper()
	if err := syncAICodexOwnedSchema(engine); err != nil {
		t.Fatalf("first AICodex-owned schema sync failed (%T)", err)
	}
	models := aicodexOwnedSchemaModels()
	for _, model := range models {
		exists, err := engine.IsTableExist(model)
		if err != nil {
			t.Fatalf("check integration table for %T failed (%T)", model, err)
		}
		if !exists {
			t.Fatalf("integration table for %T was not created", model)
		}
	}
	if err := syncAICodexOwnedSchema(engine); err != nil {
		t.Fatalf("repeated AICodex-owned schema sync failed (%T)", err)
	}
	t.Logf("schema_registry_models=%d repeated_sync=complete", len(models))
}

func postgresDataSourceNameForSchema(dataSourceName string, schemaName string) string {
	if parsed, err := url.Parse(dataSourceName); err == nil && (parsed.Scheme == "postgres" || parsed.Scheme == "postgresql") {
		query := parsed.Query()
		query.Set("search_path", schemaName)
		parsed.RawQuery = query.Encode()
		return parsed.String()
	}
	return strings.TrimSpace(dataSourceName) + " search_path=" + schemaName
}

func databaseIntegrationMarker() string {
	sum := sha256.Sum256([]byte(fmt.Sprintf("%d:%d", time.Now().UnixNano(), os.Getpid())))
	return fmt.Sprintf("%x", sum[:6])
}

func markerHash(marker string) string {
	sum := sha256.Sum256([]byte(marker))
	return fmt.Sprintf("sha256:%x", sum[:8])
}
