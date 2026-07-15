# aicodex-owned-schema-migrations Specification

## Purpose
规定 AICodex-owned schema 的版本化迁移、兼容部署基线采纳、跨实例串行、不可变校验、失败诊断与数据库验证边界，确保生产启动和测试 fixture 复用同一迁移真值源并在无法证明安全时停止。
## Requirements
### Requirement: AICodex-owned migration registry 有序且不可变
Admin SHALL 维护严格递增且 identity/version 唯一的 AICodex-owned migration registry，并 MUST 为每个已应用或 adopted migration 保存由 canonical schema manifest 生成的 checksum；已发布 migration 的 identity、version 或 schema manifest 变化不得被静默接受。

#### Scenario: 空库迁移到当前版本
- **WHEN** 空数据库首次启动且没有 AICodex-owned 业务表
- **THEN** executor 必须按 version 顺序执行全部 migration、验证目标 schema，并只在成功后记录当前 version、identity、checksum 和 `applied` mode

#### Scenario: 重复启动
- **WHEN** 数据库已应用当前程序支持的全部 migration 且 checksum 与 schema 均兼容
- **THEN** executor 必须不重复执行已记录 migration，并以幂等成功结束

#### Scenario: 已应用 migration 被改写
- **WHEN** 数据库 history 中某个已知 version 的 identity 或 checksum 与当前程序定义不一致
- **THEN** executor 必须在执行任何业务 schema 变更前以 `checksum_mismatch` fail closed

#### Scenario: 数据库版本高于程序
- **WHEN** 数据库 history 的最高 version 大于当前程序支持的 latest version
- **THEN** executor 必须以 `higher_version` fail closed，且不得自动执行 down migration 或删除 history

### Requirement: Existing deployment adoption 必须证明兼容
当 history 尚未记录 baseline migration 时，Admin MUST 先只读分类并验证当前 AICodex-owned schema；只有完整 registry 表集合及其必需列的方言归一化类型族、长度下限、nullability、主键和 unique constraint 均兼容时，才可记录 `adopted`，不得先用 `Sync2` 修补后宣称兼容。未识别的数据库类型 MUST 视为无法证明兼容并 fail closed。

#### Scenario: 已存在部署完整兼容
- **WHEN** history 不含 baseline version，且当前 39 个 registry 表全部存在并通过关键兼容检查
- **THEN** executor 必须不执行 baseline DDL，只记录匹配 checksum 的 `adopted` history 后成功

#### Scenario: 只存在部分 registry 表
- **WHEN** history 不含 baseline version，且只存在部分 AICodex-owned registry 表
- **THEN** executor 必须以 `partial_baseline` fail closed，并报告缺失/已存在对象的脱敏诊断，不得自动补齐或记录 adoption

#### Scenario: 全部表存在但关键条件不兼容
- **WHEN** history 不含 baseline version，全部 registry 表存在但任一必需列的类型族、长度、nullability、主键或 unique constraint 不兼容
- **THEN** executor 必须以 `incompatible_schema` fail closed，指出可操作的对象级原因且不得改写业务 schema

#### Scenario: 已记录版本发生 schema drift
- **WHEN** migration history checksum 正确但当前目标 schema 缺少必需表/列或存在类型族、长度、nullability、主键、unique constraint drift
- **THEN** executor 必须以 `incompatible_schema` fail closed，不得把 history 当作 schema 仍兼容的充分证据

### Requirement: Migration 执行跨实例串行且失败可恢复
Admin MUST 使用数据库 transaction、history 唯一约束和 singleton lock row 串行化同一物理 schema/prefix 上的 migration；完整 adoption/drift metadata compatibility SHALL 在持锁前只读执行，持锁后 MUST 重读 history，且 migration DDL、transaction-visible 目标表存在性检查和 history insert SHALL 使用同一 transaction-bound session，不得仅依赖进程内 mutex。

#### Scenario: 两个实例并发首次启动
- **WHEN** 两个独立数据库 engine 同时对同一空 schema 执行 migration
- **THEN** 数据库锁必须串行化执行，最终只存在一组 version history，两个实例均观察到一致的当前版本和兼容 schema

#### Scenario: Migration 中途失败
- **WHEN** transactional dialect 的 migration 在写入 history 前返回错误
- **THEN** executor 必须 rollback migration transaction，不记录该 version，并允许后续修复后的重复执行从最后成功 version 继续

#### Scenario: History table 并发首次创建
- **WHEN** 多个实例同时发现 migration history table 不存在
- **THEN** 最终 history table 必须满足预期列、主键和 unique constraint；实例只能在重新证明该表兼容后容忍已被其它实例创建的竞争结果

#### Scenario: History table 创建失败恢复
- **WHEN** transactional dialect 在 history table 或其约束创建完成前返回错误
- **THEN** history 创建 transaction 必须 rollback，且后续启动必须能够重新创建兼容 history 并从 version 0 继续

### Requirement: Migration 失败诊断可操作且不泄密
Admin MUST 为不兼容 history、higher version、checksum mismatch、partial baseline、schema drift 和 lock failure 返回稳定错误码与有限对象级上下文，并 MUST NOT 输出 DSN、账号密码、token、Cookie、私有 URL 或原始连接配置。

#### Scenario: Operator 收到 blocker
- **WHEN** 启动因 migration blocker 停止
- **THEN** 诊断必须包含稳定 code、相关 version/identity 或 schema 对象以及人工检查方向，同时不包含敏感连接值

#### Scenario: 不执行 destructive down
- **WHEN** 当前程序不能安全处理数据库 history 或 schema
- **THEN** executor 必须停止并保留现有 history/业务表，不得自动 drop、truncate、删除列或执行 down migration

### Requirement: 数据库验证证据具有明确层级
Migration baseline MUST 以 PostgreSQL 作为主要部署方言、SQLite 作为 hermetic、MySQL 作为 compatibility，并 MUST 将未授权 MSSQL 运行态列为风险；真实环境验证只能使用独立可清理对象并输出脱敏证据。

#### Scenario: PostgreSQL 独立 schema 验证
- **WHEN** 在已授权 PostgreSQL 测试环境执行 release-candidate 验证
- **THEN** 测试必须在唯一 schema 内覆盖首次并发 migration、重复 migration、history/目标表检查和 cleanup，报告不得包含连接细节

#### Scenario: SQLite hermetic 验证
- **WHEN** 无外部数据库执行 object package 测试
- **THEN** SQLite 必须覆盖从 0、重复、adoption、blocker、failure recovery、higher-version、checksum 和并发锁语义

#### Scenario: MySQL 与 MSSQL 证据边界
- **WHEN** 汇报跨数据库兼容性
- **THEN** MySQL 只能报告 disposable CI compatibility，MSSQL 只能报告编译/设计边界和未运行风险，不得等同于 PostgreSQL 运行态通过
