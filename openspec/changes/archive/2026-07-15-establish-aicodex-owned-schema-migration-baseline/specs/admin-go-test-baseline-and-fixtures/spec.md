## MODIFIED Requirements

### Requirement: 数据库集成矩阵具有明确真值层级
Admin 仓库 MUST 将 PostgreSQL 作为主要部署方言的 integration 验收，将 MySQL 作为 legacy compatibility，将 SQLite 作为 hermetic fixture，并且不得把 MSSQL 编译成功表述为真实数据库验收。

#### Scenario: PostgreSQL 环境完整
- **WHEN** integration 命令获得授权测试 PostgreSQL DSN 并能创建隔离 schema
- **THEN** 命令必须在唯一 schema 中验证 versioned migration 的首次并发执行、重复执行、history/registry 表存在性，并在结束时清理该 schema

#### Scenario: PostgreSQL 环境缺失
- **WHEN** integration 命令缺少 driver、DSN 或隔离 schema 权限
- **THEN** 命令必须以非零结果和不包含敏感值的可操作诊断结束，不得报告业务测试通过

#### Scenario: MySQL compatibility
- **WHEN** CI 启动 disposable MySQL 5.7 service
- **THEN** CI 必须以 compatibility 名义运行同一 versioned migration 与 legacy DB 基线并单独记录结果，不得将结果等同于 PostgreSQL 主部署验收

#### Scenario: MSSQL 无运行环境
- **WHEN** 当前没有授权 MSSQL 测试环境
- **THEN** 验证记录只能声明编译/方言边界，并必须保留未做真实 DB 验证的风险

### Requirement: AICodex-owned schema 集合只有一个注册边界
生产 schema bootstrap、SQLite registry fixture 和 DB integration SHALL 复用同一个窄 AICodex-owned model registry 及其 versioned migration executor；legacy Casdoor `Sync2` MUST 保持在该 registry 和 migration history 之外。

#### Scenario: 空 SQLite fixture 执行 migration
- **WHEN** 测试对空的 SQLite engine 执行 AICodex-owned versioned migration
- **THEN** migration history 和 registry 中每个 model 对应的表都必须存在，第二次执行仍成功且不得重复记录 version

#### Scenario: 生产 bootstrap 使用 migration registry
- **WHEN** Admin 执行当前 `CreateTables()` bootstrap
- **THEN** AICodex-owned 表必须通过同一 versioned migration executor 管理，legacy Casdoor 表继续使用既有 `Sync2` 路径

#### Scenario: Fixture 不维护第二份表清单
- **WHEN** AICodex-owned registry 增加后续显式 migration
- **THEN** 生产 bootstrap、SQLite fixture 和 DB integration 必须从同一 migration/registry 定义取得目标集合，不得各自维护手工模型列表
