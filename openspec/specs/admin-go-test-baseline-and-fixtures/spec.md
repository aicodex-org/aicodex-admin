# admin-go-test-baseline-and-fixtures Specification

## Purpose
规定 Admin Go 测试的 hermetic 与数据库集成分层、AICodex-owned schema 注册边界、fixture/临时产物隔离和 CI 结果信号，确保无外部数据库时可重复验证，并以 PostgreSQL 作为主要部署方言的运行态证据。
## Requirements
### Requirement: Hermetic Go 测试不依赖外部数据库
Admin 仓库 SHALL 提供一个明确的 hermetic Go test 入口，该入口在没有 MySQL、PostgreSQL、MSSQL、第三方存储或真实 provider 凭据时确定性执行，并且不得运行会写真实 DB 或外部系统的脚本型测试。

#### Scenario: 无数据库环境执行 hermetic suite
- **WHEN** 开发者在未设置 DB integration 环境变量且没有本机数据库服务时运行 hermetic 命令
- **THEN** suite 使用 SQLite/内存 fixture 完成测试，且不会把连接缺失报告为业务测试失败

#### Scenario: DB 测试不能误入 hermetic
- **WHEN** 某个测试需要 `InitConfig()`、真实 DB 或外部存储才能执行
- **THEN** 该测试必须通过正向 integration/external build tag 与 hermetic suite 隔离

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

### Requirement: 测试产物不得污染工作区
测试生成的证书、private key、SQLite DB、coverage 和临时文件 MUST 写入 `t.TempDir()` 或仓库已 ignore 的测试结果目录，测试结束后不得新增 tracked/untracked 工作区变化。

#### Scenario: key 生成测试
- **WHEN** key/certificate 生成测试运行
- **THEN** 文件必须写入该测试的临时目录，且仓库内现有 key/cert fixture 内容不得变化

#### Scenario: coverage 采集
- **WHEN** 开发者通过 Makefile 运行 hermetic coverage
- **THEN** coverprofile 必须写入 ignored 测试结果目录，并提供可读取的函数 coverage 输出

### Requirement: 已证实的陈旧测试语义被修正
测试基线 MUST 按当前 OIDC discovery 合同断言共享 issuer/JWKS，并按完整 namespace 内的 key 身份执行 i18n 重复检查；不得通过删除断言、吞错或永久 skip 使 suite 变绿。

#### Scenario: 不同 namespace 使用同名 key
- **WHEN** 两个 i18n namespace 各自定义相同 key
- **THEN** deduplicate 测试不得把它们报告为重复

#### Scenario: 同一 namespace 重复定义 key
- **WHEN** 原始 JSON 在同一 namespace 内重复定义同名 key
- **THEN** deduplicate helper 必须返回包含完整 `namespace:key` 的重复记录

#### Scenario: 应用级 discovery route
- **WHEN** 通过 application-scoped discovery route 获取 OIDC metadata
- **THEN** 测试必须按当前共享 origin issuer/JWKS contract 断言，同时保留应用自定义 scope、refresh token 和 PKCE 检查

### Requirement: CI 分别记录测试层级
后端 CI SHALL 将 hermetic、PostgreSQL integration 状态和 MySQL compatibility 作为独立结果；任何未执行状态必须显式可见。

#### Scenario: PostgreSQL CI 未启用
- **WHEN** repository variable 未要求运行 PostgreSQL integration
- **THEN** job summary 必须记录 `NOT_RUN` 及需要 RC 运行态证据，不得写成通过

#### Scenario: PostgreSQL CI 已启用但 secret 缺失
- **WHEN** repository variable 要求运行但 DSN secret 为空
- **THEN** PostgreSQL integration job 必须失败并指出缺少的 secret 名称，不输出 secret 值

#### Scenario: Hermetic 与 compatibility 失败隔离
- **WHEN** hermetic 或 MySQL compatibility 任一层失败
- **THEN** CI 必须从独立 job 名称和日志识别失败层级，而不是只给出混合的 `go-tests` 结果
