## Why

`TestMigrateAICodexOwnedSchemaSerializesConcurrentSQLiteEngines` 在相同源码上既可能快速通过，也可能在完整 `object` 包或单独高次数运行中长期低 CPU 等待。受控超时栈已证明 Xorm v1.1.6 在单连接 SQLite transaction 内处理并发 history 首建竞争时，会绕回 engine 连接池读取已存在表 metadata，并与另一 migration transaction 的 SQLite exclusive lock 等待形成循环；一次绿灯无法证明跨 engine 串行化可靠。

## What Changes

- 将 migration history 首建流程收窄为“锁前确认缺表时执行 transaction-bound 显式 model DDL；transaction 无论 commit/rollback 都先结束，再在 transaction 外重新证明完整兼容”，避免在单连接 transaction 中对竞争结果执行 Xorm `Session.Sync2` metadata 分支。
- 新增针对该连接池/SQLite 锁循环的确定性回归测试，并保留两个独立 engine、同一 `t.TempDir` 数据库、单连接池和真实 migration executor 契约。
- 建立目标测试高次数、相关 migration 组合、完整 `object` 包多轮和适用 race/coverage/静态门禁的稳定性证据。
- 保持 migration registry、版本、identity、checksum、业务 DDL、Provider/Syncer 字段、TLS、runtime config、CI workflow、前端和外部数据库边界不变。

## Capabilities

### New Capabilities

- 无。

### Modified Capabilities

- `aicodex-owned-schema-migrations`: 收紧 history table 并发首次创建与单连接 SQLite hermetic 场景，要求 create transaction 结束后再验证竞争结果，不得在 transaction 内通过 engine metadata 二次取连接；启动前已存在的 partial history 继续只读 fail closed。

## Impact

- 生产实现：`admin/object/aicodex_schema_migration.go` 中 history table 首建/竞争协调边界。
- 测试：`admin/object/aicodex_schema_migration_test.go` 及必要的窄 SQLite 并发测试 helper。
- OpenSpec：当前 change artifacts 与 `aicodex-owned-schema-migrations` 主规格归档同步。
- API、数据模型字段、migration V1 内容、第三方依赖、CI workflow、`web-admin`、运行时配置和共享环境均不受影响。
