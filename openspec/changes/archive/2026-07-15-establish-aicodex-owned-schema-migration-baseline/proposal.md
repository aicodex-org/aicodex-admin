## Why

Admin 已有 39 个 AICodex-owned model 的单一 registry，但生产启动仍通过无版本的 `Sync2` 直接调整这些表，无法证明已存在部署是否安全采用当前基线，也不能阻止多实例并发、schema 漂移或已发布迁移被静默改写。现在需要在不接管约 77 个 legacy Casdoor `Sync2` 的前提下，为该已稳定 owner 边界建立可诊断、可重复验证的版本化迁移基线。

## What Changes

- 为当前 39-model AICodex-owned registry 增加有序 migration registry、schema history/version、稳定 migration identity 和 checksum 校验；生产启动与测试 fixture 使用同一 migration source of truth。
- 支持空库从 0 初始化、重复启动幂等、事务失败恢复，以及数据库版本高于程序支持或历史 checksum 不匹配时 fail closed。
- 对版本表缺失但 AICodex-owned 表已存在的部署执行只读 baseline adoption 检查：只有全部 registry 表及其必需列的归一化类型族、长度下限、nullability、主键和唯一约束可证明兼容时才记录 adoption；partial 或不兼容 schema 阻止启动并给出可操作诊断。
- 通过数据库事务、唯一约束和 singleton lock row 串行化多实例迁移；不使用仅进程内 mutex，不自动执行 destructive down migration。
- PostgreSQL 作为主要部署方言验证首次、重复、并发与 cleanup；SQLite 覆盖 hermetic 行为和失败恢复；MySQL 保留 compatibility CI 路径；MSSQL 保留未授权运行态风险。
- legacy Casdoor 表继续沿用现有 `Sync2`；不改变业务 API、runtime config、Provider/usage contract、前端/Jest/Vite 或 `test` 分支。

## Capabilities

### New Capabilities

- `aicodex-owned-schema-migrations`: 规定 AICodex-owned schema 的版本顺序、不可变校验、兼容 adoption、并发串行化、失败诊断与多数据库验证层级。

### Modified Capabilities

- `admin-go-test-baseline-and-fixtures`: 将生产 bootstrap、SQLite fixture 和 DB integration 从直接 registry `Sync2` 调整为复用同一 versioned migration 入口，同时继续保持 legacy Casdoor `Sync2` 在该边界之外。

## Impact

- 后端 schema bootstrap：`admin/object/aicodex_schema_registry.go`、`admin/object/ormer.go` 及新增 migration executor/history model；不改变公开 API 或业务表 owner。
- 测试：`admin/object` 的 SQLite 聚焦测试和 build-tagged PostgreSQL/MySQL integration；复用现有 39-model registry，不新增第二份手工表清单。
- CI/命令：复用现有 hermetic、PostgreSQL integration 和 MySQL compatibility 入口；只在证明 migration 行为需要时做窄调整，不触碰前端 job/tooling。
- 部署：启动时在当前配置的 table prefix/schema 下创建 migration history 表；不执行 down migration，不保存或输出 DSN、账号密码、token、私有 URL 等敏感信息。
