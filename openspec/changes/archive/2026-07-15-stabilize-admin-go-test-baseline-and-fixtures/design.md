## Context

当前 `Makefile ut` 将 coverage 写入 `admin/coverage.out`，CI `go-tests` 则启动 MySQL 5.7 后执行带 `skipCi` tag 的全量测试。`skipCi` 只排除了部分 `!skipCi` 文件，仍有默认编译的测试会调用 `InitConfig()`、写真实 DB 或外部存储；因此“无 MySQL”不是一个稳定入口。最新基线还复现了 OIDC discovery 的 issuer/JWKS 陈旧断言、跨 namespace i18n 误判，以及 Windows 上 file-backed SQLite `Sync2` journal flush 导致单个用例耗时十几到二十多秒。

生产 `admin/object/ormer.go` 把 legacy Casdoor 表与 AICodex 近期新增的组织主模型、同步、Gateway 投影、服务凭据治理和 secure handoff 表逐项混排。多个 SQLite 测试又各自维护表子集，无法证明 fixture 与生产 AICodex-owned 集合一致。实际常用部署数据库是 PostgreSQL；60 Fanley 测试环境已授权用于本 change 的隔离 schema 验证，MySQL 仅代表 legacy compatibility。

## Goals / Non-Goals

**Goals:**

- 提供无外部 DB、无仓库产物、可重复的 SQLite/hermetic Go test 入口。
- 提供显式 DB integration 入口：PostgreSQL 为主运行态证据，MySQL 保留 CI compatibility，缺环境时给出机器可见的 `NOT_RUN` 或失败原因。
- 建立一个返回新 model pointer 的窄 AICodex-owned schema registry，让生产 bootstrap、SQLite fixture 和 DB integration 使用同一集合。
- 只修最新命令可复现的断言、namespace 语义、fixture 性能/漂移和临时产物问题。
- CI 中分别记录 hermetic、PostgreSQL integration 状态和 MySQL compatibility。

**Non-Goals:**

- 不建立 schema version、migration history、rollback migration 或 migration CLI；这些属于后续 `establish-aicodex-owned-schema-migration-baseline`。
- 不替换或重构 legacy Casdoor `Sync2`，不改变业务表结构、API、认证/runtime config/provider/gateway 行为。
- 不为 MSSQL 虚构运行态环境；仅保证现有 driver 继续编译，并记录未做真实 DB 验证的风险。
- 不修改前端源码、Vite/Jest/package 配置或 workflow 的前端 job/step。
- 不把所有历史 `!skipCi` 脚本改造成可靠自动化测试；只让它们不混入新 hermetic/DB 基线。

## Decisions

### 1. 使用正向 `integration` tag 加显式环境契约

hermetic 命令继续带 `skipCi` 以兼容仓库现有排除约定，同时将已证实会初始化真实 DB 的测试文件改为正向 `integration` tag。DB 命令使用 `skipCi,integration`，使默认 hermetic 文件与 DB 文件一起编译，但继续排除 legacy `!skipCi` 外部脚本。涉及第三方存储、真实同步或部署的脚本使用更窄的 `integration && external`，不进入标准 DB compatibility。

选择该方案而不是维护 shell 级 package 黑名单，因为 tag 与依赖前置条件跟随源码，新增调用真实 DB 的测试必须显式选择层级。也不把所有测试统一改为 `integration`，避免无关的大面积 tag 噪声。

### 2. registry 只描述 AICodex-owned 当前 bootstrap 集合

新增 `aicodexOwnedSchemaModels()`，每次返回新的 model pointer；`syncAICodexOwnedSchema(engine)` 负责调用现有 Xorm `Sync2`。集合包含 `OrganizationSyncApiKey`、Platform 主模型与映射、Gateway publish/cleanup audit、service credential governance、Admin secure handoff，以及 WeCom/Feishu/DingTalk 的配置、run、dry-run、schedule、consent、mapping 与 leader 表。

生产 `createTable()` 在原先第一个 AICodex-owned 注册点调用该 helper，并移除同一集合后续的重复逐表调用；其余 legacy Casdoor `Sync2` 保持原实现和错误行为。SQLite 全量 fixture 与 PostgreSQL/MySQL integration 直接调用同一 helper。

选择 model registry 而不是 SQL migration 或 dialect-specific DDL，是因为本 change 只稳定“哪些 AICodex 表由现有 bootstrap 管理”的边界；版本顺序和不可变 migration 属于后续 change。

### 3. SQLite fixture 使用内存数据库和单连接

新增 test-only helper 创建 `:memory:` SQLite engine、限制 `MaxOpenConns(1)`、同步调用方传入的模型并在 `t.Cleanup` 关闭。最新超时栈已证明 file-backed SQLite 在 Windows journal flush 上造成显著非业务耗时，因此把有证据的 file-backed object fixture 切到该 helper；确实需要检查磁盘路径语义的测试才继续使用 `t.TempDir()`。

registry 聚焦测试将同步全量 AICodex-owned 集合并逐个调用 `IsTableExist`，同时验证重复同步幂等。该 fixture 不替代 PostgreSQL 方言证据。

### 4. PostgreSQL integration 自建并清理唯一 schema

build-tagged integration test 读取 `AICODEX_TEST_DB_DRIVER` 与 `AICODEX_TEST_DB_DSN`。缺任一变量直接失败并输出变量名，不输出值。PostgreSQL 路径生成只含安全字符的唯一 schema marker，先建立 schema，再将 `search_path` 限定到该 schema，运行 registry sync/表存在性/重复 sync，最后 `DROP SCHEMA ... CASCADE` 清理自己的对象。

60 验证通过 SSH/私有配置注入 DSN，但命令输出、`verification.md` 和最终回传只记录环境别名、marker hash、表数量、cleanup 状态。若角色不能创建/删除隔离 schema，测试失败并作为 RC blocker，不回退到共享 schema。

MySQL compatibility 使用 CI disposable database 和唯一 table prefix，同步后只删除该 prefix 下 registry 表。MSSQL 仅通过现有 driver 编译，不执行同一测试。

### 5. CI 将“未执行”与“失败”分开

- 保留现有 job id `go-tests` 以避免修改 `frontend.needs`，将显示名改为 `Go tests (hermetic)`；该 job 不启动数据库服务并执行稳定 hermetic target。
- `go-tests-postgres-integration` 始终写入 job summary：未启用时明确为 `NOT_RUN`；通过 repository variable 启用后，缺 secret 必须失败，配置完整才执行 PostgreSQL integration。
- `go-tests-mysql-compatibility` 启动现有 MySQL 5.7 service，执行 legacy compatibility target；名称和 summary 不再把它表述为主要部署数据库验收。

`frontend` 和 `linter` 继续只依赖原 job id `go-tests`，避免触碰其所有权；允许写集内的 `backend.needs` 同时依赖 `go-tests` 与 `go-tests-mysql-compatibility`，从而保持原 MySQL 基线失败会阻断后端/release 链的语义。

不把 PostgreSQL 未配置当成测试通过；RC 是否可交付由本 change 的 60 手工授权证据补齐。也不把私有 60 DSN 固化到 workflow、Makefile 或文档。

### 6. 临时产物遵循测试生命周期

key/cert/DB 文件写入 `t.TempDir()`；coverage 写入仓库已 ignore 的 `tmp/test-results/`。对 tracked key 覆盖的回归采用“测试前后 `git status --short` 一致”验收。OIDC 仅把断言改为当前实现与标准共享 issuer/JWKS 行为；i18n 判重按完整 `namespace:key` 身份判断，并用手写重复 JSON 验证同 namespace 重复仍会失败。

## Risks / Trade-offs

- [正向 tag 可能漏标新的 DB 测试] → hermetic CI 无 DB 运行，并在贡献说明/目标名称中明确要求；本 change 先覆盖所有当前 `InitConfig()` 证据。
- [registry 调整 AICodex-owned 表在 bootstrap 中的相对创建顺序] → 只移动无外键 migration 依赖的 `Sync2` 调用，SQLite/PostgreSQL/MySQL 重复同步验证；legacy 集合不进入 helper。
- [全量 object package 仍较大] → 只优化有实测超时证据的 file-backed fixture，不进行无关性能重构；命令保留合理 Go test timeout 与 package 级失败信息。
- [CI 无法默认访问私有 60] → job 明确记录 `NOT_RUN`，RC 使用授权 60 脱敏证据；启用 CI 变量后缺 secret fail-closed。
- [受影响 package 总覆盖率受超大 legacy package 稀释] → 记录 package coverage，并额外用 coverprofile 核对新增 registry helper 的函数覆盖；不通过低价值测试制造全包 85%。
- [MSSQL 方言未运行] → 保持编译与现有 driver，不宣称运行态兼容，列为剩余风险。

## Migration Plan

1. 先合入测试分层、registry 和 fixture 修复；不改现有业务数据或运行配置。
2. CI 首次运行分别观察 `go-tests` hermetic、PostgreSQL `NOT_RUN`/执行状态和 MySQL compatibility；frontend/linter 的既有 `needs: [go-tests]` 不改，backend 增加 MySQL compatibility 依赖。
3. RC 在 60 PostgreSQL 独立 schema 完成一次创建、重复同步、表集合与清理验证。
4. 回滚只需回退本 change commit；本 change 不留下 migration version、共享 schema 对象或服务配置。

## Open Questions

无。PostgreSQL 60 授权、数据库优先级、closeout 仅 RC 和写集边界已由任务明确。
