## 1. 基线、设计与实施前门禁

- [x] 1.1 核对最新 `origin/hfl-test-base`、tracked clean 状态、active changes、前置 fixture archive/main spec、`aicodexOwnedSchemaModels()`、`CreateTables()` 和 DB integration 调用链，确认写集不触碰 runtime config、Jest/Vite/UI 或 legacy Casdoor `Sync2`。
- [x] 1.2 从 Xorm v1.1.6 源码确认 `Session.Sync2` transaction 路径、`TableInfo`/`DBMetas` adoption 能力和四方言约束，把 39-model scope、history/checksum、lock row、fail-closed 与 MySQL/MSSQL 风险收口到 design/spec。
- [x] 1.3 完成 proposal/design/spec/tasks 实施前 review，修复所有可直接收口问题，运行 `openspec validate establish-aicodex-owned-schema-migration-baseline --strict`、`openspec validate --changes --strict` 与 `git diff --check` 至通过。

## 2. Migration registry 与不可变 fingerprint（TDD）

- [x] 2.1 在 `admin/object/aicodex_schema_migration_test.go` 先写 migration definitions 严格递增、version/identity 唯一和 V1 canonical fingerprint golden 测试，运行 `go test -count=1 ./object -run 'TestAICodexSchemaMigration(Definitions|Fingerprint)' -v` 并确认因实现缺失而 RED。
- [x] 2.2 在 `admin/object/aicodex_schema_migration.go` 最小实现 migration definition、V1 identity `001_aicodex_owned_schema_baseline` 和由现有 39-model registry 元数据生成的稳定 manifest/checksum；不新增第二份 model slice。
- [x] 2.3 重跑 fingerprint 聚焦测试至 GREEN，并确认 manifest 不包含 table prefix、PostgreSQL schema、运行时间、DSN 或其它环境值。

## 3. History table 与空库/重复迁移（TDD）

- [x] 3.1 先写空 SQLite 从 version 0 到 V1、history `applied` row、39 表存在、第二次执行不重复记录的测试，运行聚焦命令确认 executor/history 尚不存在导致 RED。
- [x] 3.2 最小实现默认 mapper/table prefix 生效的 history model、identity 主键、version unique、version 0 singleton lock row，以及 history table transaction 创建/失败 rollback/已存在只读兼容校验；未知建表错误不得吞掉。
- [x] 3.3 实现 executor：持锁前完成只读 metadata preflight；事务内更新 lock row、重读 history、按序执行 V1 `Session.Sync2(aicodexOwnedSchemaModels()...)`、确认目标表存在、写 history 后 commit；任一步失败 rollback。
- [x] 3.4 重跑空库与重复执行测试至 GREEN，并断言 history table 本身、版本唯一约束和 lock sentinel 均满足设计且 sentinel 不计入 current version。

## 4. Adoption、drift 与 fail-closed（TDD）

- [x] 4.1 先写 existing compatible schema 无 history 时只记录 `adopted`、partial registry blocker、全表但缺关键列/错误类型族/过窄长度/nullability/主键/unique blocker，以及 history 正确但目标 schema drift blocker 测试并观察预期 RED。
- [x] 4.2 实现基于同一 model registry 的只读 schema classifier/compatibility validator，显式归一化四方言类型族并比较必需列、长度下限、nullability、主键和 unique constraint；允许额外非冲突列/普通索引，未识别类型 fail closed，诊断限制对象数量且不包含连接配置。
- [x] 4.3 先写数据库 history 高于程序 latest version、known version identity/checksum mismatch、history table 不兼容和禁止 destructive down 的测试并观察预期 RED。
- [x] 4.4 最小实现 `higher_version`、`checksum_mismatch`、`partial_baseline`、`incompatible_schema`、`history_incompatible` 等稳定 fail-closed 分支，重跑本组聚焦测试至 GREEN。

## 5. 事务失败恢复与多实例锁（TDD）

- [x] 5.1 用可注入的 test migration 先写 SQLite transaction 中途失败不记录 version、DDL rollback、修复后 retry 成功的测试并观察预期 RED。
- [x] 5.2 最小调整 executor 使 apply、transaction-visible 表检查和 history 全部使用同一 session transaction，统一 rollback 包装原始类型而不泄露 DSN，重跑失败恢复测试至 GREEN。
- [x] 5.3 使用同一临时 SQLite 文件的两个独立 engine 先写 history table 首次创建竞争与并发首次 migration 测试；配置单连接和有限 busy timeout，观察当前实现的预期 RED 或竞争失败。
- [x] 5.4 修复且仅修复数据库竞争路径，使 lock row/transaction/唯一约束串行化两个实例；重跑并发测试多次至 GREEN，不增加进程内 mutex 或无限重试。

## 6. 生产 bootstrap 与 integration 复用

- [x] 6.1 将 `admin/object/ormer.go` 的单一 `syncAICodexOwnedSchema` 调用切到 versioned executor，保持调用前后全部 legacy Casdoor `Sync2`、panic-on-bootstrap-error、API 和配置行为不变。
- [x] 6.2 更新 `admin/object/aicodex_schema_registry_test.go` 和 SQLite fixture 断言，使 fixture 通过 migration executor 验证 history + 39 models；registry fresh pointer/source-of-truth 测试继续保留。
- [x] 6.3 更新 build-tagged PostgreSQL/MySQL integration：PostgreSQL 在唯一 schema 用两个独立 engine 并发首次 migration、重复 migration、history/39 表检查和 cleanup；MySQL compatibility 调用同一 executor并只清理本次 prefix 下 history/registry 表。
- [x] 6.4 检查 `Makefile` 与 `.github/workflows/build.yml`；现有 selector/命令已覆盖升级后的同名 integration test，因此不制造 workflow/Makefile diff，YAML 结构化解析留在最终门禁。

## 7. 验证、覆盖率与脱敏证据

- [x] 7.1 记录测试前 `git status`，运行 migration/registry 聚焦测试、`go test -count=1 ./object` 和 `go test -count=1 -tags skipCi ./...`，确认测试后没有新增产物。
- [x] 7.2 运行缺少 DB 环境变量的 integration 命令并确认非零、只报告变量名；确认 MySQL disposable CI/命令路径继续覆盖同名 integration，本机无 MySQL 时记录为 compatibility gate 而非通过。
- [x] 7.3 按 `aicodex-runtime-smoke-60` 与授权私有说明，在 60 PostgreSQL 唯一 schema 运行首次并发、重复、history/表检查和 cleanup；只记录环境别名、marker hash、版本、表数和 cleanup，不输出 DSN/host/账号/密码/私有 URL。
- [x] 7.4 对实际新增/修改实现运行 `go test -coverprofile` 与 `go tool cover -func`；changed schema implementation 为 249/279 statements = 89.2%，`object` package 总覆盖率 41.5%，不添加低价值测试。
- [x] 7.5 fresh 运行 `golangci-lint fmt`（gofumpt）、`go vet ./...`、固定 `GOTOOLCHAIN=go1.25.8 golangci-lint v2.11.4`、workflow YAML parse、OpenSpec target/all/spec strict 和 `git diff --check`，逐项记录 exit/result。

## 8. Pre-archive review 与 release candidate 收口

- [x] 8.1 更新中文 `verification.md`，逐项记录 SQLite、PostgreSQL、MySQL/MSSQL、coverage、correctness、脱敏和测试前后 workspace 证据；把未验证项明确列为剩余风险。
- [x] 8.2 执行 `openspec-pre-archive-review` 循环，修复关键注释与 history transaction failure recovery findings；第二轮结论 READY，不 archive change。
- [x] 8.3 fetch 最新 `origin/hfl-test-base@10542c65`，确认并行 worker 写集后 rebase；目标工作分支收敛为恰好一个 Conventional Commit，并复跑最终关键验证。
- [x] 8.4 推送 `hfl-test/establish-aicodex-owned-schema-migration-baseline`，确认工作区 clean 和远端 HEAD；不 push/merge `test` 或 base，不释放 lease，并结构化回传 `push_test=false`、`lease_release=false`、`needs_master_decision=true`。
