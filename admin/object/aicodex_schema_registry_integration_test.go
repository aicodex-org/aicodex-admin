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
	"errors"
	"fmt"
	"net/url"
	"os"
	"strings"
	"sync"
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
	engines := make([]*xorm.Engine, 2)
	for i := range engines {
		engine, err := xorm.NewEngine("postgres", scopedDataSourceName)
		if err != nil {
			t.Fatalf("initialize isolated PostgreSQL schema engine %d failed (%T)", i, err)
		}
		engine.SetSchema(schemaName)
		engines[i] = engine
		t.Cleanup(func() { _ = engine.Close() })
	}

	assertSchemaMigrationIntegration(t, engines, true)
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
	models := append(aicodexOwnedSchemaModels(), new(AicodexSchemaMigration))
	t.Cleanup(func() {
		if err := engine.DropTables(models...); err != nil {
			t.Errorf("cleanup prefixed MySQL compatibility tables failed (%T)", err)
			return
		}
		t.Logf("database=mysql marker_hash=%s cleanup=complete", markerHash(prefix))
	})

	assertSchemaMigrationIntegration(t, []*xorm.Engine{engine}, false)
}

func assertSchemaMigrationIntegration(t *testing.T, engines []*xorm.Engine, concurrent bool) {
	t.Helper()
	if concurrent {
		start := make(chan struct{})
		errorsByEngine := make([]error, len(engines))
		var waitGroup sync.WaitGroup
		for i, engine := range engines {
			waitGroup.Add(1)
			go func(index int, migrationEngine *xorm.Engine) {
				defer waitGroup.Done()
				<-start
				errorsByEngine[index] = migrateAICodexOwnedSchema(migrationEngine)
			}(i, engine)
		}
		close(start)
		waitGroup.Wait()
		for _, err := range errorsByEngine {
			if err != nil {
				var migrationErr *aicodexSchemaMigrationError
				if errors.As(err, &migrationErr) {
					if migrationErr.Code == aicodexSchemaMigrationCodeHistoryIncompatible && engines[0].DriverName() == "postgres" {
						logPostgresMigrationHistoryPrimaryKeyDiagnostic(t, engines[0])
					}
					t.Fatalf("concurrent AICodex-owned schema migration failed code=%s detail=%s", migrationErr.Code, migrationErr.Detail)
				}
				t.Fatalf("concurrent AICodex-owned schema migration failed (%T)", err)
			}
		}
	} else if err := migrateAICodexOwnedSchema(engines[0]); err != nil {
		t.Fatalf("first AICodex-owned schema migration failed (%T)", err)
	}

	engine := engines[0]
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
	if err := migrateAICodexOwnedSchema(engine); err != nil {
		t.Fatalf("repeated AICodex-owned schema migration failed (%T)", err)
	}
	historyCount, err := engine.Where("version > 0").Count(new(AicodexSchemaMigration))
	if err != nil || historyCount != 1 {
		t.Fatalf("schema migration history count=%d err=%T", historyCount, err)
	}
	t.Logf("schema_registry_models=%d migration_version=1 repeated_migration=complete concurrent=%t", len(models), concurrent)
}

func logPostgresMigrationHistoryPrimaryKeyDiagnostic(t *testing.T, engine *xorm.Engine) {
	t.Helper()
	tableName := engine.TableName(new(AicodexSchemaMigration))
	type primaryKeyColumn struct {
		ColumnName string `xorm:"column_name"`
	}
	var databaseColumns []primaryKeyColumn
	err := engine.SQL(`SELECT a.attname AS column_name
FROM pg_constraint c
JOIN pg_class t ON t.oid = c.conrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
JOIN unnest(c.conkey) WITH ORDINALITY AS k(attnum, ordinality) ON true
JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = k.attnum
WHERE c.contype = 'p' AND t.relname = $1 AND n.nspname = current_schema()
ORDER BY k.ordinality`, tableName).Find(&databaseColumns)
	if err != nil {
		t.Logf("history_pk_diagnostic_query=%T", err)
		return
	}
	expected, expectedErr := engine.TableInfo(new(AicodexSchemaMigration))
	metas, metasErr := engine.DBMetas()
	metadataColumns := []string(nil)
	if metasErr == nil {
		if actual := schemaTablesByName(metas)[strings.ToLower(tableName)]; actual != nil {
			metadataColumns = actual.PrimaryKeys
		}
	}
	databaseColumnNames := make([]string, 0, len(databaseColumns))
	for _, column := range databaseColumns {
		databaseColumnNames = append(databaseColumnNames, column.ColumnName)
	}
	if expectedErr != nil || metasErr != nil {
		t.Logf("history_pk_expected_error=%T metadata_error=%T database=%v", expectedErr, metasErr, databaseColumnNames)
		return
	}
	t.Logf("history_pk_expected=%v metadata=%v database=%v", expected.PrimaryKeys, metadataColumns, databaseColumnNames)
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
