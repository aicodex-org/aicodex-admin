## Context

前置 `stabilize-admin-go-test-baseline-and-fixtures` 已把 39 个近期 AICodex-owned model 收口到 `aicodexOwnedSchemaModels()`，并让生产 `createTable()`、SQLite fixture、PostgreSQL/MySQL integration 复用 `syncAICodexOwnedSchema()`。该边界已有 SQLite、60 PostgreSQL 和 MySQL CI 路径证据，但仍是每次启动直接执行 Xorm `Sync2`：没有 migration history、顺序、不可变身份、existing deployment adoption 或多实例串行化。

`CreateTables()` 仍在同一个启动路径内逐项同步 legacy Casdoor 表。AICodex migration 必须只替换其中一个 registry helper 调用，不能扩展为全仓约 77 个 `Sync2` 重写。Xorm v1.1.6 的 `Session.Sync2` 会通过同一 session 的 transaction query/exec 路径工作，`TableInfo` 和 `DBMetas` 可用于执行前的只读兼容检查；但 `Sync2` 自身会补列和调整索引，不能当作 adoption validation。

## Goals / Non-Goals

**Goals:**

- 为当前 39-model registry 建立从 version 0 到 version 1 的有序、不可变、可诊断迁移基线。
- 让生产启动、SQLite hermetic 和 PostgreSQL/MySQL integration 调用同一个 migration executor 和 registry。
- 支持空库初始化、重复运行、兼容 existing deployment adoption、transactional dialect 失败恢复、higher-version/checksum/schema drift fail closed。
- 使用数据库事务、唯一约束和 lock row 串行化同一 schema/prefix 上的多个 Admin 实例。
- 对 operator 只输出 migration version、identity、表/字段和稳定错误码，不输出连接凭据或私有环境信息。

**Non-Goals:**

- 不迁移或重写 legacy Casdoor 表的 `Sync2`，不改变 39 个 model 的业务字段、API 或 owner。
- 不提供自动 down migration、destructive repair、部分 schema 自动 adoption 或通用 migration CLI。
- 不修改 runtime config、Provider/usage contract、前端、Jest、Vite、认证链路或共享测试环境。
- 不把 MySQL/MSSQL 的证据提升为 PostgreSQL 主部署验收；不为未授权 MSSQL 环境虚构运行态结果。

## Decisions

### 1. Version 1 覆盖当前完整 39-model registry

V1 identity 固定为 `001_aicodex_owned_schema_baseline`，apply 继续读取 `aicodexOwnedSchemaModels()` 并通过 transaction-bound Xorm session 执行 `Sync2`。不再建立 migration 专用 model slice；测试用同一 registry 证明模型数量和物理表存在。

选择完整 39-model scope，而不是任意截取近期子集，因为前置 change 已完成 owner 划分、生产接入和三方言 fixture 复用，当前仓库没有第二个可信 owner 边界。截取子集会重新引入两份手工表清单，并不能降低 existing deployment adoption 风险。

### 2. History 表同时承担版本事实、不可变校验和锁锚点

新增带显式逻辑表名的 AICodex schema migration history model；物理表继续接受当前 Xorm table prefix 和 PostgreSQL schema。history row 至少记录 migration identity、递增 version、checksum、`applied`/`adopted` mode 和 UTC 时间；identity 为主键、version 为唯一约束。version 0 的保留 singleton row 只作为锁锚点，不计入已应用版本。

启动先在独立 Xorm session transaction 内幂等创建 history 表；创建或约束步骤失败统一 rollback，后续启动可以重新创建。若表已存在，必须只读验证其必需列、主键和唯一约束，不能用 `Sync2` 静默修补。并发创建发生错误时，仅当 rollback 后能够证明另一实例已创建出完全兼容的 history 表才继续。

选择 repo-owned history model 而不是引入第三方 migration framework，可保持当前四方言依赖不变，并把第一阶段严格限制在已有 registry。history 表不会保存 DSN、实例标识、原始错误或业务数据。

### 3. Checksum 来自稳定的 schema manifest

每个 migration checksum 从稳定排序的 canonical manifest 计算。V1 manifest 由 migration version/identity 以及 registry 中每个 model 的 Go type、逻辑表名、顺序化列属性、主键和排序后索引组成；不包含 table prefix、PostgreSQL schema、运行时间或数据库连接信息。单测固定 V1 fingerprint literal，并验证 migration definitions version/identity 唯一且严格递增。

每次启动都比较程序定义与已存 history checksum；任何差异在执行 DDL 前以 `checksum_mismatch` fail closed。这样 model/tag/index 的变化会改变 V1 fingerprint，迫使后续开发者新增 V2，而不是静默改写已发布 V1。选择 manifest checksum 而不是只 hash migration 名称，因为后者无法感知 `Sync2` 行为来源的 schema 变化。

### 4. Baseline adoption 是只读证明，不是修复

history 中没有 version 1 时，executor 先忽略 history 表并分类 39 个业务表：

- 0 个存在：作为空库执行 V1，完成后验证目标 schema 并写 `applied` history。
- 39 个全部存在：用 `TableInfo`/`DBMetas` 验证每个必需列的方言归一化类型族、长度下限、nullability、主键和期望 unique index；全部兼容才写 `adopted` history，不执行 V1 `Sync2`。
- 只存在部分表，或全表存在但关键条件不兼容：回滚并返回稳定 blocker，列出有限数量的缺失/不兼容对象和人工检查建议。

已存在 V1 history 时也重新验证目标 schema，防止 history 正确但业务表发生漂移。兼容检查不要求数据库中不存在额外列或非冲突普通索引，以兼容 legacy 部署的非破坏性扩展；它不接受缺列、类型族不兼容、字符串/二进制长度窄于模型、nullability 不一致、主键不一致或缺失/冲突 unique constraint。类型比较使用显式、受测试的 PostgreSQL/SQLite/MySQL/MSSQL alias family；遇到未识别类型时视为无法证明兼容并 fail closed。

### 5. 数据库 transaction 与 singleton row lock 串行化实例

history 表和 lock row 确认可用后，executor 先通过 Xorm `Engine.DBMetas()` 完成只读 adoption/drift compatibility preflight，再创建 Xorm session 并开启 transaction；事务内更新 singleton lock row，取得数据库级 row/write lock，然后重读 history、apply、确认目标表存在并插入 version row。所有 migration DDL、transaction-visible table existence check 与 history insert 均使用同一 session。成功统一 commit；任一步失败统一 rollback，绝不先写“已完成”。

完整列/index metadata preflight 不能放进 Xorm transaction session：v1.1.6 只在 `Engine` 暴露 `DBMetas()`；SQLite 单连接持有写事务时再通过 engine 查询会等待自身连接。为消除 preflight 与锁之间的多实例竞态，持锁后必须重读 history：若其它实例已经完成 V1，则校验其 identity/checksum 并在同 session 确认 39 表存在；若仍未完成，才根据 preflight 的 empty/compatible 结论 apply 或 adopt。数据库之外的 operator 同时手工 DDL 不属于 migration lock 协议，部署 runbook 必须禁止 migration 窗口内手工改 schema。

该机制在 PostgreSQL、MySQL 和 MSSQL 上使用行锁语义，在 SQLite 上由 lock-row update 提前取得写锁；identity 主键和 version unique constraint 是最终重复写保护。选择数据库锁而不是 Go mutex，是因为多个进程/容器不共享内存。选择通用 lock row 而不是每方言单独的 advisory lock，可让测试和生产共用同一 executor，并避免连接池中 advisory lock 连接归属不清。

### 6. Fail-closed 顺序与诊断

持锁后先验证 migration registry，再读取 history。若数据库最高 version 高于程序 latest version、已知 version identity/checksum 不匹配、history table 不兼容或目标 schema 不兼容，executor 在任何业务 DDL 前失败。错误使用稳定 code（例如 `higher_version`、`checksum_mismatch`、`partial_baseline`、`incompatible_schema`、`lock_failed`），并包含 version/identity 和脱敏对象名；启动路径继续沿用现有 panic-on-bootstrap-error 行为。

不提供 down 或自动 destructive repair。当前 V1 只创建/同步 AICodex-owned 表；operator 回滚应用二进制时允许 history 表保留，旧版 legacy bootstrap 会忽略它。未来一旦有高于旧程序支持的 version，旧 migration-aware 程序必须 fail closed，而不是猜测兼容。

### 7. 数据库验证层级保持前置基线

- SQLite：空库、重复、兼容 adoption、不兼容 blocker、失败 rollback/retry、higher-version、checksum/golden、history table 创建/重复和两个独立 engine 并发。
- PostgreSQL：授权 60 环境的唯一 schema 内运行空库并发首次迁移、重复运行、history/39 表检查和 cleanup；报告只保留环境别名、marker hash、版本/表数和 cleanup 状态。
- MySQL：现有 disposable MySQL 5.7 compatibility job 调用同一 migration integration；MySQL DDL 隐式提交导致的中途失败恢复不声明与 PostgreSQL/SQLite 等价。
- MSSQL：保持 driver 编译、SQL/mapper 边界和明确风险，不声明真实运行态兼容。

## Risks / Trade-offs

- [39 models 的 generic compatibility 可能遇到方言类型别名] → 将数据库类型映射到受测试的整数、布尔、字符、二进制、时间和数值 family，并比较长度下限/nullability；未识别 alias fail closed。schema fingerprint 仍使用 model canonical metadata，不使用数据库返回类型字符串。
- [history table 首次创建本身发生并发竞争] → 创建失败后只做一次可证明的兼容重读；不吞掉未知数据库错误，并由 SQLite/PostgreSQL 并发测试覆盖。
- [history table 创建在 MySQL 上仍受 DDL 隐式提交影响] → PostgreSQL/SQLite 用 transaction rollback + retry 测试证明失败恢复；MySQL 继续按 compatibility 定位，部分建表需要 operator 检查。
- [SQLite 写锁可能返回 busy] → hermetic 并发测试使用独立 engine、单连接和有限 busy timeout；超时返回 `lock_failed`，不无限等待。
- [完整 metadata preflight 不在 transaction session 内] → 持锁后重读 history并执行 transaction-visible 39 表存在性检查，消除遵守同一 executor 的实例竞态；部署窗口禁止外部手工 DDL，后续 Xorm 若暴露 session metadata API 再收紧。
- [MySQL DDL 隐式提交破坏完整 transaction rollback] → MySQL 保持 compatibility 定位；部分迁移失败后不自动 adoption/repair，必须由 operator 检查，记录为剩余风险。
- [MSSQL 缺少真实环境] → 只保留编译和通用 transaction/constraint 设计证据，pre-archive/RC 明确未验证。
- [model 修改会让旧 checksum 不匹配] → 这是预期不可变保护；后续 schema 变化必须追加新 version，不更新 V1 golden/checksum 来绕过。

## Migration Plan

1. 先在 SQLite TDD 中固定 history、checksum、adoption、fail-closed、rollback 和并发语义，再把生产 `createTable()` 的单一 AICodex helper 调用切到 executor。
2. 让现有 build-tagged integration 调用 executor；在 60 PostgreSQL 唯一 schema 中执行首次并发、重复和 cleanup，不访问共享表。
3. 以 release-candidate-only 交付工作分支；不 archive、不合入 base/test、不部署生产。
4. 部署时先备份数据库并观察单实例 migration 诊断，再扩容其它实例。兼容 legacy 部署只写一条 `adopted` history，不重写业务表。
5. 代码级回滚只回退本 change；不删除 history 或业务表。若数据库已有程序不支持的更高 version，旧 migration-aware 程序保持 fail closed，需要前向修复而不是 down migration。

## Open Questions

无。39-model owner、adoption 证明边界、数据库优先级、60 授权范围和 RC-only closeout 均可由前置主规格、当前代码与任务约束推出。
