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
	"encoding/hex"
	"errors"
	"fmt"
	"path/filepath"
	"strings"
	"sync"
	"testing"

	"github.com/xorm-io/xorm"
	"github.com/xorm-io/xorm/names"
	"github.com/xorm-io/xorm/schemas"
)

func TestAICodexSchemaMigrationDefinitionsAreOrderedAndUnique(t *testing.T) {
	engine := newSQLiteTestEngine(t)
	migrations, err := aicodexSchemaMigrations(engine)
	if err != nil {
		t.Fatalf("build migration definitions: %v", err)
	}
	if len(migrations) != 1 {
		t.Fatalf("migration count = %d, want 1", len(migrations))
	}

	seenVersions := map[int]struct{}{}
	seenIdentities := map[string]struct{}{}
	for i, migration := range migrations {
		if migration.Version <= 0 {
			t.Fatalf("migration %d version = %d, want positive", i, migration.Version)
		}
		if i > 0 && migrations[i-1].Version >= migration.Version {
			t.Fatalf("migration versions are not strictly increasing at %d", i)
		}
		if _, exists := seenVersions[migration.Version]; exists {
			t.Fatalf("duplicate migration version %d", migration.Version)
		}
		seenVersions[migration.Version] = struct{}{}
		if migration.Identity == "" {
			t.Fatalf("migration %d identity is empty", i)
		}
		if _, exists := seenIdentities[migration.Identity]; exists {
			t.Fatalf("duplicate migration identity %q", migration.Identity)
		}
		seenIdentities[migration.Identity] = struct{}{}
		if len(migration.Checksum) != 64 {
			t.Fatalf("migration %d checksum length = %d, want 64", i, len(migration.Checksum))
		}
		if _, err := hex.DecodeString(migration.Checksum); err != nil {
			t.Fatalf("migration %d checksum is not hex: %v", i, err)
		}
	}

	if migrations[0].Version != 1 || migrations[0].Identity != "001_aicodex_owned_schema_baseline" {
		t.Fatalf("baseline migration = (%d, %q)", migrations[0].Version, migrations[0].Identity)
	}
}

func TestAICodexSchemaMigrationFingerprintIgnoresPhysicalNamespace(t *testing.T) {
	plainEngine := newSQLiteTestEngine(t)
	prefixedEngine := newSQLiteTestEngine(t)
	prefixedEngine.SetTableMapper(names.NewPrefixMapper(names.SnakeMapper{}, "tenant_a_"))

	plain, err := aicodexSchemaMigrations(plainEngine)
	if err != nil {
		t.Fatalf("build plain migrations: %v", err)
	}
	prefixed, err := aicodexSchemaMigrations(prefixedEngine)
	if err != nil {
		t.Fatalf("build prefixed migrations: %v", err)
	}
	if plain[0].Checksum != prefixed[0].Checksum {
		t.Fatalf("checksum depends on table prefix: %s != %s", plain[0].Checksum, prefixed[0].Checksum)
	}
}

func TestAICodexSchemaMigrationFingerprintGolden(t *testing.T) {
	engine := newSQLiteTestEngine(t)
	migrations, err := aicodexSchemaMigrations(engine)
	if err != nil {
		t.Fatalf("build migrations: %v", err)
	}

	const want = "7e35d58a9997af87b45bac713c5ee07945848c5a131e94283545f30fa93438d2"
	if migrations[0].Checksum != want {
		t.Fatalf("V1 checksum = %s, want %s", migrations[0].Checksum, want)
	}
}

func TestMigrateAICodexOwnedSchemaCreatesAndRecordsBaseline(t *testing.T) {
	engine := newSQLiteTestEngine(t)
	if err := migrateAICodexOwnedSchema(engine); err != nil {
		t.Fatalf("first migration: %v", err)
	}

	historyExists, err := engine.IsTableExist(new(AicodexSchemaMigration))
	if err != nil {
		t.Fatalf("check migration history table: %v", err)
	}
	if !historyExists {
		t.Fatal("migration history table was not created")
	}
	for _, model := range aicodexOwnedSchemaModels() {
		exists, err := engine.IsTableExist(model)
		if err != nil {
			t.Fatalf("check table for %T: %v", model, err)
		}
		if !exists {
			t.Fatalf("table for %T was not created", model)
		}
	}

	var records []AicodexSchemaMigration
	if err := engine.Where("version > 0").Find(&records); err != nil {
		t.Fatalf("read migration history: %v", err)
	}
	if len(records) != 1 {
		t.Fatalf("migration history count = %d, want 1", len(records))
	}
	if records[0].Version != 1 || records[0].Identity != aicodexOwnedSchemaBaselineIdentity || records[0].Mode != aicodexSchemaMigrationModeApplied {
		t.Fatalf("baseline history = %+v", records[0])
	}

	if err := migrateAICodexOwnedSchema(engine); err != nil {
		t.Fatalf("repeated migration: %v", err)
	}
	count, err := engine.Where("version > 0").Count(new(AicodexSchemaMigration))
	if err != nil {
		t.Fatalf("count repeated history: %v", err)
	}
	if count != 1 {
		t.Fatalf("history count after repeat = %d, want 1", count)
	}
	if _, err := engine.Insert(&AicodexSchemaMigration{
		Identity:   "duplicate_version",
		Version:    1,
		Checksum:   records[0].Checksum,
		Mode:       aicodexSchemaMigrationModeApplied,
		RecordedAt: "2026-07-15T00:00:00Z",
	}); err == nil {
		t.Fatal("history version unique constraint accepted duplicate version")
	}

	lockRecord := new(AicodexSchemaMigration)
	exists, err := engine.ID(aicodexSchemaMigrationLockIdentity).Get(lockRecord)
	if err != nil {
		t.Fatalf("read migration lock record: %v", err)
	}
	if !exists || lockRecord.Version != 0 {
		t.Fatalf("migration lock record = %+v, exists=%t", lockRecord, exists)
	}
}

func TestMigrateAICodexOwnedSchemaAdoptsCompatibleExistingSchema(t *testing.T) {
	engine := newSQLiteTestEngine(t, aicodexOwnedSchemaModels()...)
	if err := migrateAICodexOwnedSchema(engine); err != nil {
		t.Fatalf("adopt compatible schema: %v", err)
	}

	record := new(AicodexSchemaMigration)
	exists, err := engine.ID(aicodexOwnedSchemaBaselineIdentity).Get(record)
	if err != nil {
		t.Fatalf("read adopted history: %v", err)
	}
	if !exists || record.Mode != aicodexSchemaMigrationModeAdopted {
		t.Fatalf("adopted history = %+v, exists=%t", record, exists)
	}
}

func TestMigrateAICodexOwnedSchemaBlocksPartialExistingSchema(t *testing.T) {
	models := aicodexOwnedSchemaModels()
	engine := newSQLiteTestEngine(t, models[0])

	err := migrateAICodexOwnedSchema(engine)
	assertAICodexSchemaMigrationErrorCode(t, err, aicodexSchemaMigrationCodePartialBaseline)

	count, countErr := engine.Where("version > 0").Count(new(AicodexSchemaMigration))
	if countErr != nil {
		t.Fatalf("count history after partial blocker: %v", countErr)
	}
	if count != 0 {
		t.Fatalf("history count after partial blocker = %d, want 0", count)
	}
}

func TestMigrateAICodexOwnedSchemaBlocksIncompatibleExistingSchema(t *testing.T) {
	models := aicodexOwnedSchemaModels()
	engine := newSQLiteTestEngine(t, models[1:]...)
	brokenTableName := engine.TableName(models[0])
	if _, err := engine.Exec(fmt.Sprintf(
		"CREATE TABLE %s (owner VARCHAR(100) NOT NULL, name VARCHAR(100) NOT NULL, PRIMARY KEY (owner, name))",
		engine.Quote(brokenTableName),
	)); err != nil {
		t.Fatalf("create incompatible registry table: %v", err)
	}

	err := migrateAICodexOwnedSchema(engine)
	assertAICodexSchemaMigrationErrorCode(t, err, aicodexSchemaMigrationCodeIncompatibleSchema)
}

func TestMigrateAICodexOwnedSchemaBlocksRecordedSchemaDriftWithoutRepair(t *testing.T) {
	engine := newSQLiteTestEngine(t)
	if err := migrateAICodexOwnedSchema(engine); err != nil {
		t.Fatalf("seed baseline migration: %v", err)
	}
	driftedModel := aicodexOwnedSchemaModels()[0]
	if err := engine.DropTables(driftedModel); err != nil {
		t.Fatalf("drop registry table to simulate drift: %v", err)
	}

	err := migrateAICodexOwnedSchema(engine)
	assertAICodexSchemaMigrationErrorCode(t, err, aicodexSchemaMigrationCodeIncompatibleSchema)
	exists, existsErr := engine.IsTableExist(driftedModel)
	if existsErr != nil {
		t.Fatalf("check drifted table after blocker: %v", existsErr)
	}
	if exists {
		t.Fatal("migration blocker destructively repaired schema drift")
	}
}

func TestMigrateAICodexOwnedSchemaFailsClosedForHigherVersion(t *testing.T) {
	engine := newSQLiteTestEngine(t)
	if err := migrateAICodexOwnedSchema(engine); err != nil {
		t.Fatalf("seed baseline migration: %v", err)
	}
	if _, err := engine.Insert(&AicodexSchemaMigration{
		Identity:   "002_future_schema",
		Version:    2,
		Checksum:   "future",
		Mode:       aicodexSchemaMigrationModeApplied,
		RecordedAt: "2026-07-15T00:00:00Z",
	}); err != nil {
		t.Fatalf("seed higher migration version: %v", err)
	}

	err := migrateAICodexOwnedSchema(engine)
	assertAICodexSchemaMigrationErrorCode(t, err, aicodexSchemaMigrationCodeHigherVersion)
}

func TestMigrateAICodexOwnedSchemaReportsHigherVersionBeforeSchemaDrift(t *testing.T) {
	engine := newSQLiteTestEngine(t)
	if err := migrateAICodexOwnedSchema(engine); err != nil {
		t.Fatalf("seed baseline migration: %v", err)
	}
	if _, err := engine.Insert(&AicodexSchemaMigration{
		Identity:   "002_future_schema",
		Version:    2,
		Checksum:   "future",
		Mode:       aicodexSchemaMigrationModeApplied,
		RecordedAt: "2026-07-15T00:00:00Z",
	}); err != nil {
		t.Fatalf("seed higher migration version: %v", err)
	}
	if err := engine.DropTables(aicodexOwnedSchemaModels()[0]); err != nil {
		t.Fatalf("drop registry table to simulate future schema: %v", err)
	}

	err := migrateAICodexOwnedSchema(engine)
	assertAICodexSchemaMigrationErrorCode(t, err, aicodexSchemaMigrationCodeHigherVersion)
}

func TestMigrateAICodexOwnedSchemaFailsClosedForChecksumMismatch(t *testing.T) {
	engine := newSQLiteTestEngine(t)
	if err := migrateAICodexOwnedSchema(engine); err != nil {
		t.Fatalf("seed baseline migration: %v", err)
	}
	if _, err := engine.ID(aicodexOwnedSchemaBaselineIdentity).
		Cols("checksum").
		Update(&AicodexSchemaMigration{Checksum: "tampered"}); err != nil {
		t.Fatalf("tamper migration checksum: %v", err)
	}

	err := migrateAICodexOwnedSchema(engine)
	assertAICodexSchemaMigrationErrorCode(t, err, aicodexSchemaMigrationCodeChecksumMismatch)
}

func TestMigrateAICodexOwnedSchemaBlocksIncompatibleHistoryTable(t *testing.T) {
	engine := newSQLiteTestEngine(t)
	tableName := engine.TableName(new(AicodexSchemaMigration))
	if _, err := engine.Exec(fmt.Sprintf(
		"CREATE TABLE %s (identity VARCHAR(128) PRIMARY KEY)",
		engine.Quote(tableName),
	)); err != nil {
		t.Fatalf("create incompatible history table: %v", err)
	}

	err := migrateAICodexOwnedSchema(engine)
	assertAICodexSchemaMigrationErrorCode(t, err, aicodexSchemaMigrationCodeHistoryIncompatible)
}

func TestAICodexSchemaTableCompatibilityRejectsCriticalDrift(t *testing.T) {
	tests := []struct {
		name   string
		mutate func(*schemas.Table)
	}{
		{
			name: "type family",
			mutate: func(actual *schemas.Table) {
				actual.GetColumn("subject").SQLType.Name = schemas.Int
			},
		},
		{
			name: "narrow length",
			mutate: func(actual *schemas.Table) {
				actual.GetColumn("subject").Length = 50
			},
		},
		{
			name: "nullability",
			mutate: func(actual *schemas.Table) {
				actual.GetColumn("subject").Nullable = true
			},
		},
		{
			name: "primary key",
			mutate: func(actual *schemas.Table) {
				actual.PrimaryKeys = []string{"subject"}
			},
		},
		{
			name: "unique constraint",
			mutate: func(actual *schemas.Table) {
				actual.Indexes = map[string]*schemas.Index{}
			},
		},
		{
			name: "unexpected unique constraint",
			mutate: func(actual *schemas.Table) {
				unexpected := schemas.NewIndex("UQE_schema_contract_recorded_at", schemas.UniqueType)
				unexpected.AddColumn("recorded_at")
				actual.AddIndex(unexpected)
			},
		},
		{
			name: "unknown type",
			mutate: func(actual *schemas.Table) {
				actual.GetColumn("subject").SQLType.Name = "VENDOR_UNKNOWN"
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			expected, actual := compatibleSchemaTablesForTest()
			tt.mutate(actual)
			if issues := tableCompatibilityIssues("postgres", expected, actual); len(issues) == 0 {
				t.Fatal("critical schema drift was accepted")
			}
		})
	}
}

func TestAICodexSchemaTableCompatibilityAcceptsSQLiteAffinities(t *testing.T) {
	expected, actual := compatibleSchemaTablesForTest()
	expected.GetColumn("recorded_at").SQLType.Name = schemas.TimeStampz
	actual.GetColumn("recorded_at").SQLType.Name = schemas.Text
	if issues := tableCompatibilityIssues("sqlite", expected, actual); len(issues) != 0 {
		t.Fatalf("SQLite time/text affinity rejected: %v", issues)
	}
}

func TestReplacePostgresPrimaryKeyMetadataRepairsXormPostgres18Result(t *testing.T) {
	expected, actual := compatibleSchemaTablesForTest()
	// PostgreSQL 18 exposes NOT NULL constraints through pg_constraint. Xorm v1.1.6
	// can therefore overwrite the PK flag while joining all constraints for a column.
	actual.PrimaryKeys = nil
	tables := map[string]*schemas.Table{strings.ToLower(actual.Name): actual}

	replacePostgresPrimaryKeyMetadata(tables, []postgresPrimaryKeyMetadataRow{
		{TableName: actual.Name, ColumnName: "id"},
	})

	if issues := tableCompatibilityIssues("postgres", expected, actual); len(issues) != 0 {
		t.Fatalf("canonical PostgreSQL primary key metadata was not applied: %v", issues)
	}
}

func TestAICodexSchemaColumnTypesAcceptDialectBooleanStorage(t *testing.T) {
	for _, driverName := range []string{"sqlite", "mysql", "mssql"} {
		if !schemaColumnTypesCompatible(driverName, "boolean", true, "integer", true) {
			t.Fatalf("driver %s rejected boolean integer storage", driverName)
		}
	}
	if schemaColumnTypesCompatible("postgres", "boolean", true, "integer", true) {
		t.Fatal("PostgreSQL accepted integer as boolean")
	}
}

func TestAICodexSchemaMigrationErrorRedactsCauseTextAndUnwraps(t *testing.T) {
	cause := errors.New("dsn=must-not-appear")
	err := newAICodexSchemaMigrationError(aicodexSchemaMigrationCodeApplyFailed, "version 2 failed", cause)
	if !errors.Is(err, cause) {
		t.Fatal("migration error did not unwrap its cause")
	}
	message := err.Error()
	if !strings.Contains(message, aicodexSchemaMigrationCodeApplyFailed) || !strings.Contains(message, "version 2 failed") {
		t.Fatalf("migration error lost actionable context: %q", message)
	}
	if strings.Contains(message, "must-not-appear") || strings.Contains(message, "dsn=") {
		t.Fatalf("migration error leaked cause text: %q", message)
	}

	withoutCause := newAICodexSchemaMigrationError(aicodexSchemaMigrationCodeHigherVersion, "database version 2", nil)
	if !strings.Contains(withoutCause.Error(), "database version 2") {
		t.Fatalf("migration error without cause lost detail: %q", withoutCause.Error())
	}
}

func TestAICodexSchemaColumnTypeFamilies(t *testing.T) {
	tests := []struct {
		name    string
		sqlType string
		family  string
		known   bool
	}{
		{name: "boolean", sqlType: schemas.Boolean, family: "boolean", known: true},
		{name: "integer", sqlType: schemas.BigInt, family: "integer", known: true},
		{name: "number", sqlType: schemas.Decimal, family: "number", known: true},
		{name: "text", sqlType: schemas.Jsonb, family: "text", known: true},
		{name: "binary", sqlType: schemas.Bytea, family: "binary", known: true},
		{name: "time", sqlType: schemas.TimeStampz, family: "time", known: true},
		{name: "array", sqlType: schemas.Array, family: "array", known: true},
		{name: "unknown", sqlType: "vendor_type", family: "", known: false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			family, known := schemaColumnTypeFamily(tt.sqlType)
			if family != tt.family || known != tt.known {
				t.Fatalf("family(%q) = (%q,%t), want (%q,%t)", tt.sqlType, family, known, tt.family, tt.known)
			}
		})
	}
}

func TestEqualSchemaColumnSetIgnoresDuplicateMetadataRows(t *testing.T) {
	if !equalSchemaColumnSet([]string{"identity"}, []string{"identity", "IDENTITY"}) {
		t.Fatal("duplicate metadata rows changed the logical column set")
	}
}

func TestReconcileConcurrentAICodexSchemaMigrationHistoryRequiresCompatibleTable(t *testing.T) {
	compatible := newSQLiteTestEngine(t, new(AicodexSchemaMigration))
	if err := reconcileConcurrentAICodexSchemaMigrationHistoryCreate(compatible); err != nil {
		t.Fatalf("reconcile compatible history: %v", err)
	}

	incompatible := newSQLiteTestEngine(t)
	tableName := incompatible.TableName(new(AicodexSchemaMigration))
	if _, err := incompatible.Exec(fmt.Sprintf("CREATE TABLE %s (identity TEXT PRIMARY KEY)", incompatible.Quote(tableName))); err != nil {
		t.Fatalf("create incompatible history: %v", err)
	}
	if err := reconcileConcurrentAICodexSchemaMigrationHistoryCreate(incompatible); err == nil {
		t.Fatal("reconciliation accepted incompatible history")
	}
}

func TestReconcileConcurrentAICodexSchemaMigrationHistoryReturnsMetadataErrors(t *testing.T) {
	engine := newSQLiteTestEngine(t)
	if err := engine.Close(); err != nil {
		t.Fatalf("close SQLite engine: %v", err)
	}

	err := reconcileConcurrentAICodexSchemaMigrationHistoryCreate(engine)
	if err == nil || !strings.Contains(err.Error(), "inspect migration history after concurrent create") {
		t.Fatalf("reconcile metadata error = %v", err)
	}
}

func TestEnsureAICodexSchemaMigrationHistoryReturnsTableInspectionErrors(t *testing.T) {
	engine := newSQLiteTestEngine(t)
	if err := engine.Close(); err != nil {
		t.Fatalf("close SQLite engine: %v", err)
	}
	if err := ensureAICodexSchemaMigrationHistory(engine); err == nil {
		t.Fatal("history inspection error was not returned")
	}
}

func TestEnsureAICodexSchemaMigrationHistoryRejectsIncompatibleLockRow(t *testing.T) {
	engine := newSQLiteTestEngine(t, new(AicodexSchemaMigration))
	if _, err := engine.Insert(&AicodexSchemaMigration{
		Identity:   aicodexSchemaMigrationLockIdentity,
		Version:    0,
		Checksum:   aicodexSchemaMigrationLockChecksum,
		Mode:       "tampered",
		RecordedAt: "2026-07-16T00:00:00Z",
	}); err != nil {
		t.Fatalf("seed incompatible migration lock row: %v", err)
	}

	err := ensureAICodexSchemaMigrationHistory(engine)
	assertAICodexSchemaMigrationErrorCode(t, err, aicodexSchemaMigrationCodeHistoryIncompatible)
}

func TestEnsureAICodexSchemaMigrationHistoryPreservesCreateAndReconcileErrors(t *testing.T) {
	engine := newReadOnlySQLiteMigrationEngine(t)

	err := ensureAICodexSchemaMigrationHistory(engine)
	assertAICodexSchemaMigrationErrorCode(t, err, aicodexSchemaMigrationCodeHistoryIncompatible)
	var migrationErr *aicodexSchemaMigrationError
	if !errors.As(err, &migrationErr) {
		t.Fatalf("migration error type = %T", err)
	}
	joined, ok := migrationErr.Cause.(interface{ Unwrap() []error })
	if !ok || len(joined.Unwrap()) != 2 {
		t.Fatalf("migration error cause = %T, want joined create and reconcile errors", migrationErr.Cause)
	}
	if !strings.Contains(joined.Unwrap()[1].Error(), "not compatible after concurrent create") {
		t.Fatalf("reconcile error was not preserved: %v", joined.Unwrap()[1])
	}
}

func TestEnsureAICodexSchemaMigrationHistoryDoesNotRepairPreexistingPartialTable(t *testing.T) {
	engine := newSQLiteTestEngine(t)
	session := engine.NewSession()
	if err := session.CreateTable(new(AicodexSchemaMigration)); err != nil {
		_ = session.Close()
		t.Fatalf("create history table without unique constraint: %v", err)
	}
	if err := session.Close(); err != nil {
		t.Fatalf("close partial history session: %v", err)
	}

	err := ensureAICodexSchemaMigrationHistory(engine)
	assertAICodexSchemaMigrationErrorCode(t, err, aicodexSchemaMigrationCodeHistoryIncompatible)
	issues, inspectErr := inspectModelTableCompatibility(engine, new(AicodexSchemaMigration))
	if inspectErr != nil {
		t.Fatalf("inspect partial history table: %v", inspectErr)
	}
	if !strings.Contains(strings.Join(issues, "; "), "unique") {
		t.Fatalf("partial history issues = %v, want missing unique constraint", issues)
	}
}

func TestCreateAICodexSchemaMigrationHistoryAvoidsSessionMetadataSelfWait(t *testing.T) {
	engine := newSQLiteTestEngine(t)
	if err := createAICodexSchemaMigrationHistoryInTransaction(engine, createAICodexSchemaMigrationHistory); err != nil {
		t.Fatalf("create migration history: %v", err)
	}

	// 第二次显式建表模拟“另一 engine 已提交 history”的竞争结果。create transaction
	// 必须直接返回错误并 rollback，随后只能在 transaction 外重新证明表结构兼容。
	if err := createAICodexSchemaMigrationHistoryInTransaction(engine, createAICodexSchemaMigrationHistory); err == nil {
		t.Fatal("duplicate migration history create unexpectedly succeeded")
	}
	if err := reconcileConcurrentAICodexSchemaMigrationHistoryCreate(engine); err != nil {
		t.Fatalf("reconcile existing migration history: %v", err)
	}
}

func TestCreateAICodexSchemaMigrationHistoryReturnsReadOnlyDDLError(t *testing.T) {
	readOnly := newReadOnlySQLiteMigrationEngine(t)

	err := createAICodexSchemaMigrationHistoryInTransaction(readOnly, createAICodexSchemaMigrationHistory)
	if err == nil || !strings.Contains(strings.ToLower(err.Error()), "readonly") {
		t.Fatalf("read-only history DDL error = %v", err)
	}
}

func newReadOnlySQLiteMigrationEngine(t *testing.T) *xorm.Engine {
	t.Helper()
	databasePath := filepath.Join(t.TempDir(), "readonly-history.db")
	writable, err := xorm.NewEngine("sqlite", databasePath)
	if err != nil {
		t.Fatalf("new writable SQLite engine: %v", err)
	}
	if _, err := writable.Exec("CREATE TABLE seed (id INTEGER PRIMARY KEY)"); err != nil {
		_ = writable.Close()
		t.Fatalf("seed SQLite database file: %v", err)
	}
	if err := writable.Close(); err != nil {
		t.Fatalf("close writable SQLite engine: %v", err)
	}

	readOnlyDSN := "file:" + filepath.ToSlash(databasePath) + "?mode=ro"
	readOnly, err := xorm.NewEngine("sqlite", readOnlyDSN)
	if err != nil {
		t.Fatalf("new read-only SQLite engine: %v", err)
	}
	readOnly.DB().SetMaxOpenConns(1)
	t.Cleanup(func() { _ = readOnly.Close() })
	return readOnly
}

func TestAssertAICodexOwnedSchemaTablesExistFailsInsideTransaction(t *testing.T) {
	engine := newSQLiteTestEngine(t)
	session := engine.NewSession()
	defer session.Close()
	if err := session.Begin(); err != nil {
		t.Fatalf("begin schema assertion transaction: %v", err)
	}
	defer func() { _ = session.Rollback() }()

	err := assertAICodexOwnedSchemaTablesExist(session)
	assertAICodexSchemaMigrationErrorCode(t, err, aicodexSchemaMigrationCodeIncompatibleSchema)
}

func TestMigrateAICodexOwnedSchemaRejectsEmptyMigrationRegistry(t *testing.T) {
	engine := newSQLiteTestEngine(t)
	err := migrateAICodexOwnedSchemaWithMigrations(engine, nil)
	assertAICodexSchemaMigrationErrorCode(t, err, aicodexSchemaMigrationCodeApplyFailed)
}

func TestCreateAICodexSchemaMigrationHistoryRollsBackAndRecovers(t *testing.T) {
	engine := newSQLiteTestEngine(t)
	err := createAICodexSchemaMigrationHistoryInTransaction(engine, func(session *xorm.Session) error {
		if err := createAICodexSchemaMigrationHistory(session); err != nil {
			return err
		}
		return errors.New("injected history creation failure")
	})
	if err == nil {
		t.Fatal("history creation failure was not returned")
	}
	exists, existsErr := engine.IsTableExist(new(AicodexSchemaMigration))
	if existsErr != nil {
		t.Fatalf("check history after rollback: %v", existsErr)
	}
	if exists {
		t.Fatal("failed history creation left a table behind")
	}

	if err := migrateAICodexOwnedSchema(engine); err != nil {
		t.Fatalf("recover after history creation rollback: %v", err)
	}
}

func TestMigrateAICodexOwnedSchemaRollsBackFailedMigrationAndRetries(t *testing.T) {
	engine := newSQLiteTestEngine(t)
	baseline, err := aicodexSchemaMigrations(engine)
	if err != nil {
		t.Fatalf("build baseline migrations: %v", err)
	}
	if err := migrateAICodexOwnedSchemaWithMigrations(engine, baseline); err != nil {
		t.Fatalf("seed baseline migration: %v", err)
	}

	const probeTable = "aicodex_migration_failure_probe"
	failing := append([]aicodexSchemaMigration(nil), baseline...)
	failing = append(failing, aicodexSchemaMigration{
		Version:  2,
		Identity: "002_failure_recovery_probe",
		Checksum: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
		Apply: func(session *xorm.Session) error {
			if _, err := session.Exec("CREATE TABLE " + probeTable + " (id INTEGER PRIMARY KEY)"); err != nil {
				return err
			}
			return errors.New("injected migration failure")
		},
	})
	err = migrateAICodexOwnedSchemaWithMigrations(engine, failing)
	assertAICodexSchemaMigrationErrorCode(t, err, aicodexSchemaMigrationCodeApplyFailed)
	probeExists, err := engine.IsTableExist(probeTable)
	if err != nil {
		t.Fatalf("check failure probe after rollback: %v", err)
	}
	if probeExists {
		t.Fatal("failed migration DDL was not rolled back")
	}
	count, err := engine.Where("version > 0").Count(new(AicodexSchemaMigration))
	if err != nil {
		t.Fatalf("count history after rollback: %v", err)
	}
	if count != 1 {
		t.Fatalf("history count after rollback = %d, want 1", count)
	}

	recovered := append([]aicodexSchemaMigration(nil), baseline...)
	recovered = append(recovered, aicodexSchemaMigration{
		Version:  failing[1].Version,
		Identity: failing[1].Identity,
		Checksum: failing[1].Checksum,
		Apply: func(session *xorm.Session) error {
			_, err := session.Exec("CREATE TABLE " + probeTable + " (id INTEGER PRIMARY KEY)")
			return err
		},
	})
	if err := migrateAICodexOwnedSchemaWithMigrations(engine, recovered); err != nil {
		t.Fatalf("retry recovered migration: %v", err)
	}
	probeExists, err = engine.IsTableExist(probeTable)
	if err != nil || !probeExists {
		t.Fatalf("recovered migration probe exists=%t err=%v", probeExists, err)
	}
	count, err = engine.Where("version > 0").Count(new(AicodexSchemaMigration))
	if err != nil || count != 2 {
		t.Fatalf("history count after recovery = %d err=%v, want 2", count, err)
	}
}

func TestMigrateAICodexOwnedSchemaSerializesConcurrentSQLiteEngines(t *testing.T) {
	databasePath := filepath.Join(t.TempDir(), "aicodex-schema-migration.db")
	newEngine := func() *xorm.Engine {
		engine, err := xorm.NewEngine("sqlite", databasePath)
		if err != nil {
			t.Fatalf("new SQLite migration engine: %v", err)
		}
		engine.DB().SetMaxOpenConns(1)
		if _, err := engine.Exec("PRAGMA busy_timeout = 10000"); err != nil {
			_ = engine.Close()
			t.Fatalf("set SQLite busy timeout: %v", err)
		}
		t.Cleanup(func() { _ = engine.Close() })
		return engine
	}
	engines := []*xorm.Engine{newEngine(), newEngine()}

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
	for i, err := range errorsByEngine {
		if err != nil {
			t.Fatalf("concurrent migration engine %d: %v", i, err)
		}
	}

	count, err := engines[0].Where("version > 0").Count(new(AicodexSchemaMigration))
	if err != nil {
		t.Fatalf("count concurrent migration history: %v", err)
	}
	if count != 1 {
		t.Fatalf("concurrent migration history count = %d, want 1", count)
	}
	for _, model := range aicodexOwnedSchemaModels() {
		exists, err := engines[0].IsTableExist(model)
		if err != nil || !exists {
			t.Fatalf("concurrent table for %T exists=%t err=%v", model, exists, err)
		}
	}
}

func compatibleSchemaTablesForTest() (*schemas.Table, *schemas.Table) {
	newTable := func() *schemas.Table {
		table := schemas.NewTable("schema_contract", nil)
		id := schemas.NewColumn("id", "ID", schemas.SQLType{Name: schemas.Varchar}, 64, 0, false)
		id.IsPrimaryKey = true
		table.AddColumn(id)
		subject := schemas.NewColumn("subject", "Subject", schemas.SQLType{Name: schemas.Varchar}, 100, 0, false)
		table.AddColumn(subject)
		recordedAt := schemas.NewColumn("recorded_at", "RecordedAt", schemas.SQLType{Name: schemas.Varchar}, 100, 0, false)
		table.AddColumn(recordedAt)
		unique := schemas.NewIndex("UQE_schema_contract_subject", schemas.UniqueType)
		unique.AddColumn("subject")
		table.AddIndex(unique)
		return table
	}
	return newTable(), newTable()
}

func assertAICodexSchemaMigrationErrorCode(t *testing.T, err error, want string) {
	t.Helper()
	if err == nil {
		t.Fatalf("migration error = nil, want code %q", want)
	}
	var migrationErr *aicodexSchemaMigrationError
	if !errors.As(err, &migrationErr) {
		t.Fatalf("migration error type = %T, want *aicodexSchemaMigrationError: %v", err, err)
	}
	if migrationErr.Code != want {
		t.Fatalf("migration error code = %q, want %q: %v", migrationErr.Code, want, err)
	}
}
