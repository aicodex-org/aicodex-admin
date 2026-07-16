## MODIFIED Requirements

### Requirement: Migration 执行跨实例串行且失败可恢复
Admin MUST 使用数据库 transaction、history 唯一约束和 singleton lock row 串行化同一物理 schema/prefix 上的 migration；完整 adoption/drift metadata compatibility SHALL 在持锁前只读执行，持锁后 MUST 重读 history，且 migration DDL、transaction-visible 目标表存在性检查和 history insert SHALL 使用同一 transaction-bound session，不得仅依赖进程内 mutex。history table 并发首次创建只能在 transaction 外 precheck 已确认表缺失时执行相同 model 定义的显式 create DDL；当前 create transaction 无论 commit 或 rollback，均 MUST 先结束并释放其连接/锁，再通过 transaction 外的 metadata 重读证明 history 完全兼容。启动前已存在的 partial history MUST 只读 fail closed，不得通过 create helper 修补；不得在单连接 transaction 内通过 engine 连接池二次读取已存在 history metadata，也不得形成无界等待。

#### Scenario: 两个实例并发首次启动
- **WHEN** 两个独立数据库 engine 同时对同一空 schema 执行 migration
- **THEN** 数据库锁必须串行化执行，最终只存在一组 version history，两个实例均观察到一致的当前版本和兼容 schema

#### Scenario: Migration 中途失败
- **WHEN** transactional dialect 的 migration 在写入 history 前返回错误
- **THEN** executor 必须 rollback migration transaction，不记录该 version，并允许后续修复后的重复执行从最后成功 version 继续

#### Scenario: History table 并发首次创建
- **WHEN** 多个实例同时发现 migration history table 不存在
- **THEN** 最终 history table 必须满足预期列、主键和 unique constraint；实例只能在显式 create transaction 结束并重新证明该表兼容后容忍竞争结果，且启动前已存在的 partial history 不得被自动补齐

#### Scenario: 单连接 SQLite history 创建竞争
- **WHEN** 两个独立、单连接的 SQLite engine 同时对同一 `t.TempDir` 数据库执行首次 migration，且其中一侧在 create transaction 中观察到另一侧已创建 history table
- **THEN** 观察到竞争结果的一侧必须退出当前 transaction 后再验证 history 兼容性，两个 engine 必须在有限测试期限内成功完成，不得等待自身连接池或依赖 package 测试顺序

#### Scenario: History table 创建失败恢复
- **WHEN** transactional dialect 在 history table 或其约束创建完成前返回错误
- **THEN** history 创建 transaction 必须 rollback，且后续启动必须能够重新创建兼容 history 并从 version 0 继续
