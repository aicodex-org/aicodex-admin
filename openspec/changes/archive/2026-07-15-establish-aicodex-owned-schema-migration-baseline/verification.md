## 验证结论

本 change 已在最新 `origin/hfl-test-base@10542c65` 上完成 release-candidate 级实现与验证。AICodex-owned schema 当前以 39-model registry 作为唯一模型集合，发布 V1 `001_aicodex_owned_schema_baseline`，canonical fingerprint 为 `7e35d58a9997af87b45bac713c5ee07945848c5a131e94283545f30fa93438d2`。生产 `CreateTables()` 只把原有单一 AICodex helper 接入点切换到 versioned executor；调用前后 legacy Casdoor `Sync2` 保持不变。

本 worker 仅交付 RC：不 archive、不合入或 push `hfl-test-base`/`test`、不部署服务、不操作生产。60 PostgreSQL 只使用授权私有环境说明和独立测试 schema，本文不包含 DSN、host、端口、账号密码、token、Cookie、私有 URL 或 raw database error。

## SQLite hermetic 与 TDD 证据

- definitions/fingerprint：先因 `aicodexSchemaMigrations` 缺失 RED；实现后验证 version/identity 严格递增唯一、prefix/schema-independent manifest 和 V1 golden fingerprint。
- 空库/重复：空 SQLite 从 version 0 创建 history + 39 registry 表，只记录一条 `applied` V1；重复执行不重复写 history，version unique 和 lock sentinel 均生效。
- history table 失败恢复：首次建表与约束在独立 session transaction 内执行；注入“表创建后失败”会 rollback 且不留半成品，下一次启动可重新创建并从 version 0 成功迁移。
- existing deployment adoption：39 表完整且类型族、长度下限、nullability、PK、unique 均兼容时只记录 `adopted`，不先运行 baseline `Sync2`；partial、缺列、错误类型、过窄长度、nullability、PK/unique drift 和 unknown type 均 fail closed。
- history/schema fail-closed：higher version、identity/checksum mismatch、history table 不兼容、recorded schema drift 均返回稳定 code；schema drift 测试确认不会自动重建被删表或执行 destructive down。
- 失败恢复：可注入 V2 在 transaction 内创建 probe 后失败，SQLite DDL rollback、history 不提前记录；修复后 retry 从 V1 继续到 V2。
- 并发：两个独立 engine 对同一临时 SQLite 文件并发首次 migration；首次 history create 竞争只在重读证明完全兼容时容忍，lock row 串行执行；`-count=5` 全部通过，无进程内 mutex 或无限重试。
- diagnostics：typed error 只输出稳定 code/detail/cause type，测试确认不会回显 cause 中模拟的 DSN 文本，同时保留 `errors.Is/As` unwrap。

聚焦与全包命令：

- `go test -count=1 ./object`：通过。
- `go test -count=5 ./object -run '^TestMigrateAICodexOwnedSchemaSerializesConcurrentSQLiteEngines$' -v`：5 次通过。
- `go test -count=1 -tags skipCi ./...`：最新 base 上全量 hermetic 通过；`object` 12.467 秒，无 package 失败。
- 缺少 integration 环境变量时，build-tagged 命令按预期非零，只报告缺少 `AICODEX_TEST_DB_DRIVER`，不输出值。

## PostgreSQL、MySQL 与 MSSQL

### PostgreSQL 主部署方言

最终 fresh 运行在授权 60 PostgreSQL 的唯一隔离 schema：

- 两个独立 Xorm engine 并发执行首次 migration；数据库 history lock row/transaction/unique constraint 串行成功。
- 39 个 registry model 对应表全部存在，history current version 为 1，重复 migration 成功且只保留一条 version row。
- marker hash：`sha256:ba6b4bc050b037c4`。
- schema cleanup：`complete`；未部署或重启任何服务，未保留 fixture。

调试阶段曾复现 Xorm v1.1.6 PostgreSQL `DBMetas()` 把单一 PK 列重复返回的问题。数据库 catalog 证明真实 history PK 仍为唯一 `identity`；本 change 添加回归测试并只在 PK/unique “列集合”比较时做大小写归一与去重，没有弱化真实 PK/unique 要求。修复后最终 fresh PostgreSQL 并发 smoke 通过。

### MySQL compatibility

- 现有 `make test-go-integration-mysql` 与 workflow disposable MySQL 5.7 job 继续调用同名 build-tagged integration test；该 test 现在复用 versioned executor，并清理本次唯一 prefix 下的 history + registry 表。
- build-tagged integration 已在本机编译并验证缺环境 fail-closed；本机没有 disposable MySQL 运行环境，因此不声明本地 MySQL 运行态通过。
- MySQL DDL 可能隐式提交，失败恢复与多实例锁不声明和 PostgreSQL/SQLite 等价；保留为 compatibility gate 与剩余风险。

### MSSQL 风险

- 现有 driver、全仓编译、`go vet` 与通用 transaction/constraint 代码边界通过。
- 没有授权 MSSQL 运行环境，不声明真实 DB migration/adoption/concurrency 兼容。

## 覆盖率

- 最新命令：`go test -count=1 -coverprofile ../tmp/test-results/schema-migration.coverage.out ./object`。
- `object` package statement coverage：`41.5%`；该包包含大量本 change 未触碰的 legacy 实现。
- 实际新增/修改 schema implementation：`249/279 statements = 89.2%`，超过 85% 目标；统计覆盖 `aicodex_schema_migration.go` 与 `aicodex_schema_registry.go`，未排除失败/并发/诊断实现。
- 未通过只断言 mock、DTO 拼装或 getter/setter 的低价值测试制造覆盖率。

## Correctness、格式与文档门禁

- `golangci-lint fmt ./...`（配置使用 gofumpt）：通过，无格式化残留。
- `go vet ./...`：exit 0。
- `GOTOOLCHAIN=go1.25.8 golangci-lint run ./...`（v2.11.4）：`0 issues`；按仓库 `make lint: vendor` 语义先同步 ignored vendor。
- `.github/workflows/build.yml`：Python `yaml.safe_load` 结构化解析通过；本 change 未修改 workflow/Makefile，因为现有 selector 已覆盖升级后的同名 integration test。
- `openspec validate establish-aicodex-owned-schema-migration-baseline --strict`、`openspec validate --changes --strict`、`openspec validate --specs --strict`：均通过。
- `git diff --check`：通过。
- pre-commit hook：安装仓库既有 Yarn 依赖后执行 Husky v4 hook，staged-files gate 正常运行；未使用 `--no-verify`。
- 测试前后 Git 状态没有新增 coverage、DB、key/cert 或 fixture 产物；ignored `vendor/`、`node_modules/` 和 `tmp/test-results/` 不进入提交。

## 剩余风险

- MySQL 只保留 CI disposable compatibility 路径，本机未取得运行态结果；其 DDL 隐式提交使失败恢复/并发语义弱于 PostgreSQL/SQLite。
- MSSQL 没有授权运行态证据。
- Xorm v1.1.6 完整 metadata 只通过 `Engine.DBMetas()` 暴露；完整 adoption/drift compatibility 在持锁前只读 preflight，持锁后重读 history 并用同 session 检查 39 表存在。部署 migration 窗口必须禁止 operator 同时手工 DDL。
- 不提供 down migration 或自动 destructive repair；不兼容部署需要 operator 备份、检查诊断并前向修复。

## Pre-archive review

归档准备状态：**READY（release-candidate-only）**。

- 已审查 proposal/design/tasks/两个 delta specs、主规格同步语义、最终代码、测试质量、覆盖率、关键注释、验证语言和脱敏记录。
- 第一轮发现并修复两项阻断：关键迁移安全规则注释不足；history table 自身缺少 transaction failure recovery 测试与实现。修复后重新运行 SQLite、coverage、full hermetic、vet/lint、OpenSpec strict 和 PostgreSQL 并发 smoke。
- OpenSpec 文档以简体中文说明为主；保留的 `Requirement`/`Scenario`/`WHEN`/`THEN`/`SHALL`/`MUST`、数据库名、命令、错误码和代码标识属于工具结构或标准技术术语。
- 验证记录脱敏扫描未发现真实环境地址、私有 URL、凭据或连接串；只使用“60 PostgreSQL”别名和 marker hash。
- archive 时将创建 `aicodex-owned-schema-migrations` 主规格，并把 `admin-go-test-baseline-and-fixtures` 的两个完整 `MODIFIED Requirements` 同步到现有主规格；本 worker 按 RC-only 约束不执行 archive。
- `origin/hfl-test-base..HEAD` 收敛为单个本 change commit，base ancestor 检查通过。
