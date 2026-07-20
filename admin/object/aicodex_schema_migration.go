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
	"crypto/sha256"
	"errors"
	"fmt"
	"reflect"
	"sort"
	"strings"
	"time"

	"github.com/xorm-io/xorm"
	"github.com/xorm-io/xorm/names"
	"github.com/xorm-io/xorm/schemas"
)

const (
	aicodexOwnedSchemaBaselineIdentity = "001_aicodex_owned_schema_baseline"
	aicodexSchemaMigrationLockIdentity = "__aicodex_schema_migration_lock__"
	aicodexSchemaMigrationLockChecksum = "lock"
	aicodexSchemaMigrationModeApplied  = "applied"
	aicodexSchemaMigrationModeAdopted  = "adopted"
	aicodexSchemaMigrationModeLock     = "lock"

	aicodexSchemaMigrationCodeHigherVersion       = "higher_version"
	aicodexSchemaMigrationCodeChecksumMismatch    = "checksum_mismatch"
	aicodexSchemaMigrationCodePartialBaseline     = "partial_baseline"
	aicodexSchemaMigrationCodeIncompatibleSchema  = "incompatible_schema"
	aicodexSchemaMigrationCodeHistoryIncompatible = "history_incompatible"
	aicodexSchemaMigrationCodeLockFailed          = "lock_failed"
	aicodexSchemaMigrationCodeApplyFailed         = "apply_failed"
)

type aicodexSchemaMigrationError struct {
	Code   string
	Detail string
	Cause  error
}

func (e *aicodexSchemaMigrationError) Error() string {
	if e.Cause == nil {
		return fmt.Sprintf("AICodex schema migration %s: %s", e.Code, e.Detail)
	}
	// 数据库错误只暴露类型；连接串等原始配置不能进入启动诊断。
	return fmt.Sprintf("AICodex schema migration %s: %s (%T)", e.Code, e.Detail, e.Cause)
}

func (e *aicodexSchemaMigrationError) Unwrap() error {
	return e.Cause
}

func newAICodexSchemaMigrationError(code string, detail string, cause error) error {
	return &aicodexSchemaMigrationError{Code: code, Detail: detail, Cause: cause}
}

// AicodexSchemaMigration 是 AICodex-owned schema 的持久化 history row。
// 类型名刻意使用 Aicodex 前缀，使默认 SnakeMapper 生成稳定逻辑表名，
// 同时仍允许部署配置的 table prefix 生效。
type AicodexSchemaMigration struct {
	Identity string `xorm:"pk varchar(128)"`     // 已发布 migration identity；lock row 使用保留 identity。
	Version  int    `xorm:"notnull unique"`      // 严格递增版本；0 只用于锁锚点。
	Checksum string `xorm:"varchar(64) notnull"` // canonical model manifest 的 SHA-256。
	Mode     string `xorm:"varchar(16) notnull"` // applied、adopted 或内部 lock。
	// RecordedAt 使用 UTC RFC3339Nano；lock row 每次更新该值以取得真实数据库写锁。
	RecordedAt string `xorm:"varchar(32) notnull"`
}

// aicodexSchemaMigration 是已发布 migration 的不可变定义。
// Checksum 由逻辑模型元数据生成，不受部署 schema 或 table prefix 影响。
type aicodexSchemaMigration struct {
	Version  int
	Identity string
	Checksum string
	Apply    func(*xorm.Session) error
}

func aicodexSchemaMigrations(engine *xorm.Engine) ([]aicodexSchemaMigration, error) {
	manifest, err := aicodexOwnedSchemaManifest(engine)
	if err != nil {
		return nil, err
	}
	sum := sha256.Sum256([]byte(fmt.Sprintf("version=1\nidentity=%s\n%s", aicodexOwnedSchemaBaselineIdentity, manifest)))

	return []aicodexSchemaMigration{
		{
			Version:  1,
			Identity: aicodexOwnedSchemaBaselineIdentity,
			Checksum: fmt.Sprintf("%x", sum[:]),
			Apply: func(session *xorm.Session) error {
				return session.Sync2(aicodexOwnedSchemaModels()...)
			},
		},
	}, nil
}

// migrateAICodexOwnedSchema 在数据库 transaction 内串行执行所有待处理 migration。
func migrateAICodexOwnedSchema(engine *xorm.Engine) (err error) {
	migrations, err := aicodexSchemaMigrations(engine)
	if err != nil {
		return err
	}
	return migrateAICodexOwnedSchemaWithMigrations(engine, migrations)
}

// migrateAICodexOwnedSchemaWithMigrations 保留可注入 registry 以测试失败 rollback；
// 生产入口始终传入 aicodexSchemaMigrations 返回的已发布定义。
func migrateAICodexOwnedSchemaWithMigrations(engine *xorm.Engine, migrations []aicodexSchemaMigration) (err error) {
	if len(migrations) == 0 {
		return newAICodexSchemaMigrationError(aicodexSchemaMigrationCodeApplyFailed, "migration registry is empty", nil)
	}
	if err = ensureAICodexSchemaMigrationHistory(engine); err != nil {
		return err
	}

	var historyBeforeLock []AicodexSchemaMigration
	if err = engine.Where("version > ?", 0).Find(&historyBeforeLock); err != nil {
		return newAICodexSchemaMigrationError(
			aicodexSchemaMigrationCodeHistoryIncompatible,
			"cannot read migration history before acquiring the lock",
			err,
		)
	}
	if err = validateAICodexSchemaMigrationHistory(migrations, historyBeforeLock); err != nil {
		return err
	}
	baselineWasRecorded := hasAICodexSchemaMigrationVersion(historyBeforeLock, 1)
	schemaState, err := inspectAICodexOwnedSchema(engine, baselineWasRecorded)
	if err != nil {
		return err
	}

	session := engine.NewSession()
	defer session.Close()
	if err = session.Begin(); err != nil {
		return newAICodexSchemaMigrationError(aicodexSchemaMigrationCodeLockFailed, "cannot begin migration transaction", err)
	}
	defer func() {
		if err != nil {
			_ = session.Rollback()
		}
	}()

	updated, updateErr := session.ID(aicodexSchemaMigrationLockIdentity).
		Cols("recorded_at").
		Update(&AicodexSchemaMigration{RecordedAt: time.Now().UTC().Format(time.RFC3339Nano)})
	if updateErr != nil {
		return newAICodexSchemaMigrationError(aicodexSchemaMigrationCodeLockFailed, "cannot update migration lock row", updateErr)
	}
	if updated != 1 {
		return newAICodexSchemaMigrationError(
			aicodexSchemaMigrationCodeLockFailed,
			fmt.Sprintf("lock row update affected %d rows", updated),
			nil,
		)
	}

	var applied []AicodexSchemaMigration
	if err = session.Where("version > ?", 0).Find(&applied); err != nil {
		return newAICodexSchemaMigrationError(aicodexSchemaMigrationCodeHistoryIncompatible, "cannot read migration history", err)
	}
	if err = validateAICodexSchemaMigrationHistory(migrations, applied); err != nil {
		return err
	}
	byVersion := make(map[int]AicodexSchemaMigration, len(applied))
	for _, record := range applied {
		byVersion[record.Version] = record
	}

	for _, migration := range migrations {
		if _, ok := byVersion[migration.Version]; ok {
			if !baselineWasRecorded && migration.Version == 1 {
				if err = assertAICodexOwnedSchemaTablesExist(session); err != nil {
					return err
				}
			}
			continue
		}

		mode := aicodexSchemaMigrationModeApplied
		if migration.Version == 1 && schemaState == aicodexOwnedSchemaStateCompatible {
			mode = aicodexSchemaMigrationModeAdopted
		} else if err = migration.Apply(session); err != nil {
			return newAICodexSchemaMigrationError(
				aicodexSchemaMigrationCodeApplyFailed,
				fmt.Sprintf("version %d identity %q failed", migration.Version, migration.Identity),
				err,
			)
		}
		if migration.Version == 1 {
			if err = assertAICodexOwnedSchemaTablesExist(session); err != nil {
				return err
			}
		}
		record := &AicodexSchemaMigration{
			Identity:   migration.Identity,
			Version:    migration.Version,
			Checksum:   migration.Checksum,
			Mode:       mode,
			RecordedAt: time.Now().UTC().Format(time.RFC3339Nano),
		}
		if _, err = session.Insert(record); err != nil {
			return newAICodexSchemaMigrationError(
				aicodexSchemaMigrationCodeHistoryIncompatible,
				fmt.Sprintf("cannot record version %d identity %q", migration.Version, migration.Identity),
				err,
			)
		}
	}

	if err = session.Commit(); err != nil {
		return newAICodexSchemaMigrationError(aicodexSchemaMigrationCodeApplyFailed, "cannot commit migration transaction", err)
	}
	return nil
}

// ensureAICodexSchemaMigrationHistory 只创建缺失的 history；已存在表必须只读证明兼容，
// 不能先用 Sync2 修补后掩盖错误 deployment schema。
func ensureAICodexSchemaMigrationHistory(engine *xorm.Engine) error {
	exists, err := engine.IsTableExist(new(AicodexSchemaMigration))
	if err != nil {
		return fmt.Errorf("check AICodex schema migration history: %w", err)
	}
	if !exists {
		if createErr := createAICodexSchemaMigrationHistoryInTransaction(engine, createAICodexSchemaMigrationHistory); createErr != nil {
			if reconcileErr := reconcileConcurrentAICodexSchemaMigrationHistoryCreate(engine); reconcileErr != nil {
				return newAICodexSchemaMigrationError(
					aicodexSchemaMigrationCodeHistoryIncompatible,
					"cannot create or reconcile migration history table",
					errors.Join(createErr, reconcileErr),
				)
			}
		}
	}
	if issues, inspectErr := inspectModelTableCompatibility(engine, new(AicodexSchemaMigration)); inspectErr != nil {
		return newAICodexSchemaMigrationError(aicodexSchemaMigrationCodeHistoryIncompatible, "cannot inspect migration history table", inspectErr)
	} else if len(issues) > 0 {
		return newAICodexSchemaMigrationError(
			aicodexSchemaMigrationCodeHistoryIncompatible,
			"migration history table is incompatible: "+strings.Join(limitSchemaIssues(issues), "; "),
			nil,
		)
	}

	lock := &AicodexSchemaMigration{
		Identity:   aicodexSchemaMigrationLockIdentity,
		Version:    0,
		Checksum:   aicodexSchemaMigrationLockChecksum,
		Mode:       aicodexSchemaMigrationModeLock,
		RecordedAt: time.Now().UTC().Format(time.RFC3339Nano),
	}
	if _, err = engine.Insert(lock); err == nil {
		return nil
	}

	existing := new(AicodexSchemaMigration)
	found, lookupErr := engine.ID(aicodexSchemaMigrationLockIdentity).Get(existing)
	if lookupErr != nil {
		return newAICodexSchemaMigrationError(aicodexSchemaMigrationCodeHistoryIncompatible, "cannot verify migration lock row", lookupErr)
	}
	if !found || existing.Version != 0 || existing.Mode != aicodexSchemaMigrationModeLock {
		return newAICodexSchemaMigrationError(aicodexSchemaMigrationCodeHistoryIncompatible, "migration lock row is incompatible", nil)
	}
	return nil
}

// createAICodexSchemaMigrationHistory 只通过当前 transaction session 执行新表 DDL。
// Xorm v1.1.6 的 Session.Sync2 遇到已存在表时会从 engine pool 另取连接；
// 单连接 SQLite transaction 会因此等待自己占用的连接，并与另一 migration 写锁形成循环。
func createAICodexSchemaMigrationHistory(session *xorm.Session) error {
	history := new(AicodexSchemaMigration)
	if err := session.CreateTable(history); err != nil {
		return err
	}
	if err := session.CreateUniques(history); err != nil {
		return err
	}
	return session.CreateIndexes(history)
}

// createAICodexSchemaMigrationHistoryInTransaction 确保 PostgreSQL/SQLite 不会留下
// “表已创建但约束/history 尚未就绪”的半完成版本表；create 参数仅用于注入失败恢复测试。
func createAICodexSchemaMigrationHistoryInTransaction(engine *xorm.Engine, create func(*xorm.Session) error) (err error) {
	session := engine.NewSession()
	defer session.Close()
	if err = session.Begin(); err != nil {
		return err
	}
	defer func() {
		if err != nil {
			_ = session.Rollback()
		}
	}()
	if err = create(session); err != nil {
		return err
	}
	if err = session.Commit(); err != nil {
		return err
	}
	return nil
}

// reconcileConcurrentAICodexSchemaMigrationHistoryCreate 只处理首次建表竞争：
// 当前 create transaction rollback 后，另一实例的结果完全兼容才可继续，未知建表错误不会被吞掉。
func reconcileConcurrentAICodexSchemaMigrationHistoryCreate(engine *xorm.Engine) error {
	issues, err := inspectModelTableCompatibility(engine, new(AicodexSchemaMigration))
	if err != nil {
		return fmt.Errorf("inspect migration history after concurrent create: %w", err)
	}
	if len(issues) > 0 {
		return fmt.Errorf("migration history is not compatible after concurrent create: %s", strings.Join(limitSchemaIssues(issues), "; "))
	}
	return nil
}

type aicodexOwnedSchemaState int

const (
	aicodexOwnedSchemaStateEmpty aicodexOwnedSchemaState = iota
	aicodexOwnedSchemaStateCompatible
)

type postgresPrimaryKeyMetadataRow struct {
	TableName  string `xorm:"table_name"`
	ColumnName string `xorm:"column_name"`
}

// replacePostgresPrimaryKeyMetadata 用 PostgreSQL 的 canonical PK constraint
// 覆盖 Xorm metadata，避免其它 column constraint 污染 IsPrimaryKey 结果。
func replacePostgresPrimaryKeyMetadata(tables map[string]*schemas.Table, rows []postgresPrimaryKeyMetadataRow) {
	for _, table := range tables {
		table.PrimaryKeys = nil
	}
	for _, row := range rows {
		table := tables[strings.ToLower(row.TableName)]
		if table == nil {
			continue
		}
		table.PrimaryKeys = append(table.PrimaryKeys, row.ColumnName)
	}
}

func hasAICodexSchemaMigrationVersion(records []AicodexSchemaMigration, version int) bool {
	for _, record := range records {
		if record.Version == version {
			return true
		}
	}
	return false
}

// validateAICodexSchemaMigrationHistory 在任何业务 schema preflight/DDL 前拒绝未来版本和已改写定义。
func validateAICodexSchemaMigrationHistory(migrations []aicodexSchemaMigration, applied []AicodexSchemaMigration) error {
	latestVersion := migrations[len(migrations)-1].Version
	definitions := make(map[int]aicodexSchemaMigration, len(migrations))
	for _, migration := range migrations {
		definitions[migration.Version] = migration
	}
	for _, record := range applied {
		if record.Version > latestVersion {
			return newAICodexSchemaMigrationError(
				aicodexSchemaMigrationCodeHigherVersion,
				fmt.Sprintf("database version %d exceeds program version %d", record.Version, latestVersion),
				nil,
			)
		}
		definition, ok := definitions[record.Version]
		if !ok || record.Identity != definition.Identity || record.Checksum != definition.Checksum {
			return newAICodexSchemaMigrationError(
				aicodexSchemaMigrationCodeChecksumMismatch,
				fmt.Sprintf("version %d identity %q does not match the published definition", record.Version, record.Identity),
				nil,
			)
		}
	}
	return nil
}

// inspectAICodexOwnedSchema 在取得 migration lock 前完成只读 adoption/drift preflight。
// 持锁后 executor 会重读 history，并在同一 transaction session 再确认目标表存在。
func inspectAICodexOwnedSchema(engine *xorm.Engine, baselineWasRecorded bool) (aicodexOwnedSchemaState, error) {
	actualByName, err := schemaTablesForCompatibility(engine)
	if err != nil {
		return aicodexOwnedSchemaStateEmpty, newAICodexSchemaMigrationError(
			aicodexSchemaMigrationCodeIncompatibleSchema,
			"cannot inspect AICodex-owned schema",
			err,
		)
	}
	models := aicodexOwnedSchemaModels()
	present := 0
	missing := make([]string, 0)
	for _, model := range models {
		name := engine.TableName(model)
		if _, ok := actualByName[strings.ToLower(name)]; ok {
			present++
		} else {
			missing = append(missing, name)
		}
	}

	if present == 0 {
		if baselineWasRecorded {
			return aicodexOwnedSchemaStateEmpty, newAICodexSchemaMigrationError(
				aicodexSchemaMigrationCodeIncompatibleSchema,
				"recorded baseline is missing all AICodex-owned tables",
				nil,
			)
		}
		return aicodexOwnedSchemaStateEmpty, nil
	}
	if present != len(models) {
		code := aicodexSchemaMigrationCodePartialBaseline
		if baselineWasRecorded {
			code = aicodexSchemaMigrationCodeIncompatibleSchema
		}
		return aicodexOwnedSchemaStateEmpty, newAICodexSchemaMigrationError(
			code,
			fmt.Sprintf("found %d of %d AICodex-owned tables; missing %s", present, len(models), strings.Join(limitSchemaIssues(missing), ", ")),
			nil,
		)
	}

	issues := make([]string, 0)
	for _, model := range models {
		expected, tableErr := engine.TableInfo(model)
		if tableErr != nil {
			return aicodexOwnedSchemaStateEmpty, newAICodexSchemaMigrationError(
				aicodexSchemaMigrationCodeIncompatibleSchema,
				fmt.Sprintf("cannot build expected schema for %T", model),
				tableErr,
			)
		}
		actual := actualByName[strings.ToLower(engine.TableName(model))]
		issues = append(issues, tableCompatibilityIssues(engine.DriverName(), expected, actual)...)
	}
	if len(issues) > 0 {
		return aicodexOwnedSchemaStateEmpty, newAICodexSchemaMigrationError(
			aicodexSchemaMigrationCodeIncompatibleSchema,
			"AICodex-owned schema is incompatible: "+strings.Join(limitSchemaIssues(issues), "; "),
			nil,
		)
	}
	return aicodexOwnedSchemaStateCompatible, nil
}

// inspectModelTableCompatibility 复用同一 model metadata 校验 history 表，避免维护第二份列清单。
func inspectModelTableCompatibility(engine *xorm.Engine, model interface{}) ([]string, error) {
	expected, err := engine.TableInfo(model)
	if err != nil {
		return nil, err
	}
	actualByName, err := schemaTablesForCompatibility(engine)
	if err != nil {
		return nil, err
	}
	actual := actualByName[strings.ToLower(engine.TableName(model))]
	if actual == nil {
		return []string{fmt.Sprintf("table %s is missing", engine.TableName(model))}, nil
	}
	return tableCompatibilityIssues(engine.DriverName(), expected, actual), nil
}

func schemaTablesByName(tables []*schemas.Table) map[string]*schemas.Table {
	byName := make(map[string]*schemas.Table, len(tables))
	for _, table := range tables {
		byName[strings.ToLower(table.Name)] = table
	}
	return byName
}

// schemaTablesForCompatibility 修正 Xorm v1.1.6 在 PostgreSQL 18 上可能被
// NOT NULL constraint 覆盖的主键元数据；其它列与索引仍沿用方言原生 metadata。
func schemaTablesForCompatibility(engine *xorm.Engine) (map[string]*schemas.Table, error) {
	metas, err := engine.DBMetas()
	if err != nil {
		return nil, err
	}
	tables := schemaTablesByName(metas)
	if !strings.EqualFold(engine.DriverName(), "postgres") {
		return tables, nil
	}

	var primaryKeys []postgresPrimaryKeyMetadataRow
	err = engine.SQL(`SELECT t.relname AS table_name, a.attname AS column_name
FROM pg_constraint c
JOIN pg_class t ON t.oid = c.conrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
JOIN unnest(c.conkey) WITH ORDINALITY AS k(attnum, ordinality) ON true
JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = k.attnum
WHERE c.contype = 'p' AND n.nspname = current_schema()
ORDER BY t.relname, k.ordinality`).Find(&primaryKeys)
	if err != nil {
		return nil, err
	}
	replacePostgresPrimaryKeyMetadata(tables, primaryKeys)
	return tables, nil
}

// tableCompatibilityIssues 只接受可证明的非破坏兼容：额外普通索引/列可以保留，
// 但缺列、类型/长度/nullability、PK 或 unique 的任何漂移都会阻止 adoption。
func tableCompatibilityIssues(driverName string, expected *schemas.Table, actual *schemas.Table) []string {
	if actual == nil {
		return []string{fmt.Sprintf("table %s is missing", expected.Name)}
	}
	issues := make([]string, 0)
	for _, expectedColumn := range expected.Columns() {
		actualColumn := actual.GetColumn(expectedColumn.Name)
		if actualColumn == nil {
			issues = append(issues, fmt.Sprintf("table %s column %s is missing", actual.Name, expectedColumn.Name))
			continue
		}
		expectedFamily, expectedKnown := schemaColumnTypeFamily(expectedColumn.SQLType.Name)
		actualFamily, actualKnown := schemaColumnTypeFamily(actualColumn.SQLType.Name)
		if !schemaColumnTypesCompatible(driverName, expectedFamily, expectedKnown, actualFamily, actualKnown) {
			issues = append(issues, fmt.Sprintf(
				"table %s column %s type %s is incompatible with %s",
				actual.Name,
				expectedColumn.Name,
				actualColumn.SQLType.Name,
				expectedColumn.SQLType.Name,
			))
		}
		if expectedColumn.Length > 0 && actualColumn.Length > 0 && actualColumn.Length < expectedColumn.Length {
			issues = append(issues, fmt.Sprintf("table %s column %s length %d is below required %d", actual.Name, expectedColumn.Name, actualColumn.Length, expectedColumn.Length))
		}
		if !expectedColumn.IsPrimaryKey && expectedColumn.Nullable != actualColumn.Nullable {
			issues = append(issues, fmt.Sprintf("table %s column %s nullability is incompatible", actual.Name, expectedColumn.Name))
		}
	}
	if !equalSchemaColumnSet(expected.PrimaryKeys, actual.PrimaryKeys) {
		issues = append(issues, fmt.Sprintf("table %s primary key is incompatible", actual.Name))
	}
	for _, expectedIndex := range expected.Indexes {
		if expectedIndex.Type != schemas.UniqueType {
			continue
		}
		found := false
		for _, actualIndex := range actual.Indexes {
			if actualIndex.Type == schemas.UniqueType && equalSchemaColumnSet(expectedIndex.Cols, actualIndex.Cols) {
				found = true
				break
			}
		}
		if !found {
			issues = append(issues, fmt.Sprintf("table %s unique columns %s are missing", actual.Name, strings.Join(expectedIndex.Cols, ",")))
		}
	}
	for _, actualIndex := range actual.Indexes {
		if actualIndex.Type != schemas.UniqueType || equalSchemaColumnSet(actualIndex.Cols, expected.PrimaryKeys) {
			continue
		}
		matchedExpected := false
		for _, expectedIndex := range expected.Indexes {
			if expectedIndex.Type == schemas.UniqueType && equalSchemaColumnSet(actualIndex.Cols, expectedIndex.Cols) {
				matchedExpected = true
				break
			}
		}
		if !matchedExpected {
			issues = append(issues, fmt.Sprintf("table %s has unexpected unique columns %s", actual.Name, strings.Join(actualIndex.Cols, ",")))
		}
	}
	return issues
}

// schemaColumnTypesCompatible 只编码已由方言证据证明的存储别名；未知 alias 一律 fail closed。
func schemaColumnTypesCompatible(driverName string, expectedFamily string, expectedKnown bool, actualFamily string, actualKnown bool) bool {
	if !expectedKnown || !actualKnown {
		return false
	}
	if expectedFamily == actualFamily {
		return true
	}
	driverName = strings.ToLower(driverName)
	if strings.HasPrefix(driverName, "sqlite") {
		// SQLite driver 将 time.Time/TIMESTAMPZ 按 TEXT affinity 落库，bool 按 INTEGER affinity 落库。
		return (expectedFamily == "time" && actualFamily == "text") ||
			(expectedFamily == "boolean" && actualFamily == "integer")
	}
	if driverName == "mysql" || driverName == "mssql" {
		// MySQL 使用 TINYINT、MSSQL 使用 BIT 保存 Xorm bool。
		return expectedFamily == "boolean" && actualFamily == "integer"
	}
	return false
}

func schemaColumnTypeFamily(name string) (string, bool) {
	switch strings.ToUpper(strings.TrimSpace(name)) {
	case schemas.Bool, schemas.Boolean:
		return "boolean", true
	case schemas.Bit, schemas.UnsignedBit, schemas.TinyInt, schemas.SmallInt, schemas.MediumInt,
		schemas.Int, schemas.UnsignedInt, schemas.Integer, schemas.BigInt, schemas.UnsignedBigInt,
		schemas.Serial, schemas.BigSerial:
		return "integer", true
	case schemas.Decimal, schemas.Numeric, schemas.Money, schemas.SmallMoney, schemas.Real, schemas.Float, schemas.Double:
		return "number", true
	case schemas.Char, schemas.Varchar, schemas.NChar, schemas.NVarchar, schemas.TinyText, schemas.Text,
		schemas.NText, schemas.Clob, schemas.MediumText, schemas.LongText, schemas.Uuid, schemas.SysName,
		schemas.Enum, schemas.Set, schemas.Json, schemas.Jsonb, schemas.XML:
		return "text", true
	case schemas.Binary, schemas.VarBinary, schemas.TinyBlob, schemas.Blob, schemas.MediumBlob,
		schemas.LongBlob, schemas.Bytea, schemas.UniqueIdentifier:
		return "binary", true
	case schemas.Date, schemas.DateTime, schemas.SmallDateTime, schemas.Time, schemas.TimeStamp,
		schemas.TimeStampz, schemas.Year:
		return "time", true
	case schemas.Array:
		return "array", true
	default:
		return "", false
	}
}

func equalSchemaColumnSet(left []string, right []string) bool {
	// Xorm v1.1.6 的 PostgreSQL metadata join 可能重复同一约束列；
	// 这里比较逻辑列集合并去重，但不会忽略真实缺列或额外列。
	normalize := func(values []string) []string {
		unique := make(map[string]struct{}, len(values))
		for _, value := range values {
			normalized := strings.ToLower(strings.Trim(strings.TrimSpace(value), `"`))
			unique[normalized] = struct{}{}
		}
		result := make([]string, 0, len(unique))
		for value := range unique {
			result = append(result, value)
		}
		sort.Strings(result)
		return result
	}
	normalizedLeft := normalize(left)
	normalizedRight := normalize(right)
	return len(normalizedLeft) == len(normalizedRight) && reflect.DeepEqual(normalizedLeft, normalizedRight)
}

func limitSchemaIssues(issues []string) []string {
	const maxIssues = 5
	if len(issues) <= maxIssues {
		return issues
	}
	limited := append([]string(nil), issues[:maxIssues]...)
	return append(limited, fmt.Sprintf("and %d more", len(issues)-maxIssues))
}

// assertAICodexOwnedSchemaTablesExist 使用持锁 transaction session 做最终可见性检查，
// 避免并发第二实例沿用锁前的陈旧 preflight 结论。
func assertAICodexOwnedSchemaTablesExist(session *xorm.Session) error {
	missing := make([]string, 0)
	for _, model := range aicodexOwnedSchemaModels() {
		exists, err := session.IsTableExist(model)
		if err != nil {
			return newAICodexSchemaMigrationError(aicodexSchemaMigrationCodeIncompatibleSchema, fmt.Sprintf("cannot verify table for %T", model), err)
		}
		if !exists {
			missing = append(missing, fmt.Sprintf("%T", model))
		}
	}
	if len(missing) > 0 {
		return newAICodexSchemaMigrationError(
			aicodexSchemaMigrationCodeIncompatibleSchema,
			"migration did not produce all required tables: "+strings.Join(limitSchemaIssues(missing), ", "),
			nil,
		)
	}
	return nil
}

// aicodexOwnedSchemaManifest 把同一 registry 的模型映射转成稳定文本，
// 让已发布 V1 的模型/tag/index 变化能够被 checksum 检测出来。
func aicodexOwnedSchemaManifest(engine *xorm.Engine) (string, error) {
	var manifest strings.Builder
	for _, model := range aicodexOwnedSchemaModels() {
		table, err := engine.TableInfo(model)
		if err != nil {
			return "", fmt.Errorf("build schema manifest for %T: %w", model, err)
		}

		modelType := reflect.TypeOf(model)
		if modelType.Kind() == reflect.Pointer {
			modelType = modelType.Elem()
		}
		logicalTableName := names.GetTableName(names.SnakeMapper{}, reflect.ValueOf(model))
		fmt.Fprintf(&manifest, "model=%s.%s table=%s\n", modelType.PkgPath(), modelType.Name(), logicalTableName)
		for _, column := range table.Columns() {
			fmt.Fprintf(
				&manifest,
				" column=%s field=%s type=%s length=%d,%d nullable=%t default=%q pk=%t autoincr=%t json=%t\n",
				column.Name,
				column.FieldName,
				column.SQLType.Name,
				column.Length,
				column.Length2,
				column.Nullable,
				column.Default,
				column.IsPrimaryKey,
				column.IsAutoIncrement,
				column.IsJSON,
			)
		}

		indexNames := make([]string, 0, len(table.Indexes))
		for name := range table.Indexes {
			indexNames = append(indexNames, name)
		}
		sort.Strings(indexNames)
		for _, name := range indexNames {
			index := table.Indexes[name]
			columns := append([]string(nil), index.Cols...)
			sort.Strings(columns)
			fmt.Fprintf(&manifest, " index=%s type=%d columns=%s\n", name, index.Type, strings.Join(columns, ","))
		}
	}
	return manifest.String(), nil
}
