## Why

Admin Go 测试目前把 hermetic 检查、真实数据库操作和外部系统脚本混在同一入口：无外部数据库的本地执行会遇到陈旧断言、错误的 i18n 判重、SQLite fixture 性能/漂移和仓库内测试产物，CI 又只用 MySQL 5.7 覆盖一条混合路径。现在需要建立可重复、可解释且不污染工作区的后端测试基线，为后续 AICodex-owned versioned schema migration change 提供稳定但不越界的注册入口。

## What Changes

- 建立明确的 Go hermetic 与 DB integration 分层入口：SQLite 是无外部依赖的快速基线，PostgreSQL 是实际主部署方言的运行态验收，MySQL 保留 legacy compatibility，MSSQL 仅保留编译/方言边界和显式风险。
- 让 integration 在缺少环境变量或隔离 schema 能力时以清晰诊断失败，不把“未运行”或连接配置缺失伪装成业务绿灯。
- 抽取窄的 AICodex-owned schema registry，供生产 schema bootstrap、SQLite fixture 和 PostgreSQL/MySQL integration 复用；legacy Casdoor `Sync2` 及 versioned migration 均保持不变。
- 只修最新基线有证据的问题：OIDC discovery 陈旧断言、i18n namespace 判重语义、DB/外部测试误入 hermetic、SQLite fixture 漂移/性能，以及证书、key、DB、coverage 等测试产物污染。
- 将 CI 的 Go hermetic、PostgreSQL integration 可用性和 MySQL compatibility 结果分开记录；PostgreSQL 未配置时明确记录 `NOT_RUN`，启用后若凭据缺失或测试失败则 job 失败。
- 不修改前端构建/测试段、runtime credential/provider/gateway 配置，不部署服务、不执行 schema migration。

## Capabilities

### New Capabilities

- `admin-go-test-baseline-and-fixtures`: 规定 Admin Go hermetic、数据库集成矩阵、测试产物隔离、AICodex-owned schema registry 复用和 CI 结果信号。

### Modified Capabilities

无。

## Impact

- 后端测试与 fixture：`admin/**/*_test.go` 中有证据的 DB/外部边界、SQLite helper、OIDC 与 i18n 测试。
- schema bootstrap：`admin/object/ormer.go` 及新增的窄 registry/helper；不改变 legacy Casdoor 表的 `Sync2` 语义。
- 开发/CI 入口：`Makefile` 和 `.github/workflows/build.yml` 的 Go test job/step；不触碰 frontend/Vite/lint build tooling 段。
- 运行态验证：仅使用已授权的 60 PostgreSQL 测试环境，在唯一隔离 schema 内创建并清理本 change 的临时表；验证记录不包含连接信息或原始数据。
- 依赖与兼容：不新增生产依赖；继续使用现有 SQLite、PostgreSQL、MySQL 和 MSSQL driver。
