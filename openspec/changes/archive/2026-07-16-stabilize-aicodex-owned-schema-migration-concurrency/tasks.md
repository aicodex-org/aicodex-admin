## 1. 启动门禁与根因证据

- [x] 1.1 在 `D:\CodeRepo\LeagProject\aicodex-2\aicodex-admin` fetch/prune，ff-only 对齐 `origin/hfl-test-base@dcf7f00902c5b4b6735caddadefdafaf801c0537`，确认 clean、active changes 为空、目标分支与写集无冲突后创建 `hfl-test/stabilize-aicodex-owned-schema-migration-concurrency`。
- [x] 1.2 读取 `openspec/specs/aicodex-owned-schema-migrations/spec.md`、`admin-go-test-baseline-and-fixtures` 主规格、前置 migration/fixture archive、Web3 archive verification、`admin/object/aicodex_schema_migration.go`、对应测试与 SQLite fixture。
- [x] 1.3 运行旧实现目标测试高次数与单次 timeout RED，记录触发次数、条件和完整 goroutine 栈；对照 Xorm v1.1.6 `Session.Sync2`/`engine.loadTableInfo` 源码，确认“transaction 占用唯一连接后 engine metadata 二次取连接 + 另一 transaction 等待 SQLite exclusive lock”的循环根因。
- [x] 1.4 运行旧实现相关 history 组合及完整 `object` 包 1+3 轮，记录概率绿灯，证明不能用固定前置顺序或一次通过替代根因修复。

## 2. OpenSpec 与实施前审查

- [x] 2.1 创建中文 `proposal.md`、`design.md` 和 `aicodex-owned-schema-migrations` delta spec，明确显式 transaction DDL、禁止捷径、SQLite-only 边界、风险和 self-closeout。
- [x] 2.2 完成本 `tasks.md` 后运行 `openspec validate stabilize-aicodex-owned-schema-migration-concurrency --strict`、`openspec validate --changes --strict` 与 `git diff --check`，按 pre-implementation review 修复所有 Blocking/Fixable 项直到 READY。

## 3. TDD 修复 history 首建竞争

- [x] 3.1 在 `admin/object/aicodex_schema_migration_test.go` 新增窄回归测试：期望 `createAICodexSchemaMigrationHistory(*xorm.Session)` 在空库 transaction 中创建兼容 history；第二次显式 create 返回竞争错误并在 rollback 后可由 `reconcileConcurrentAICodexSchemaMigrationHistoryCreate` 证明兼容。先运行 `go test -count=1 -run '^(TestCreateAICodexSchemaMigrationHistoryAvoidsSessionMetadataSelfWait|TestMigrateAICodexOwnedSchemaSerializesConcurrentSQLiteEngines)$' -timeout 90s -v ./object`，确认测试在旧实现因缺少 helper 或旧并发等待而 RED。
- [x] 3.2 在 `admin/object/aicodex_schema_migration.go` 实现 `createAICodexSchemaMigrationHistory`，依次调用当前 transaction session 的 `CreateTable`、`CreateUniques`、`CreateIndexes`；用中文注释说明不能在单连接 transaction 中对竞争后已存在表调用 Xorm v1.1.6 `Session.Sync2`。
- [x] 3.3 将 `ensureAICodexSchemaMigrationHistory` 的生产 create closure 与 history rollback/recovery 测试切到该 helper；把 `reconcileConcurrentAICodexSchemaMigrationHistoryCreate` 收敛为 rollback 后单次 transaction 外兼容性证明，删除现有 5×10ms 轮询 sleep；保留失败 rollback、稳定错误码、history PK/version unique constraint 和现有 registry/migration 内容。
- [x] 3.4 运行步骤 3.1 的 focused 命令并确认 GREEN；检查 diff 只涉及 AICodex-owned history 首建实现、直接测试和当前 OpenSpec artifacts，不改连接数、timeout、断言、测试顺序、migration V1 或业务 DDL。

## 4. 稳定性、覆盖率与静态门禁

- [x] 4.1 运行 `go test -count=50 -run '^TestMigrateAICodexOwnedSchemaSerializesConcurrentSQLiteEngines$' -timeout 10m -v ./object`；单轮实测最高约 6 秒，10 分钟为 50 轮总命令的诊断上界；50/50 必须通过且无低 CPU 等待或 goroutine/engine 清理残留。
- [x] 4.2 运行 `go test -count=20 -run '^(TestReconcileConcurrentAICodexSchemaMigrationHistoryRequiresCompatibleTable|TestCreateAICodexSchemaMigrationHistoryAvoidsSessionMetadataSelfWait|TestCreateAICodexSchemaMigrationHistoryRollsBackAndRecovers|TestMigrateAICodexOwnedSchemaSerializesConcurrentSQLiteEngines)$' -timeout 5m ./object`；相关组合 20/20 必须通过。
- [x] 4.3 运行完整 `go test -count=3 -timeout 5m ./object`，并至少一轮 `go test -count=1 -shuffle=on -timeout 3m ./object`；记录 shuffle seed、每轮耗时和结果，不依赖固定顺序。
- [x] 4.4 运行 focused `go test -race`；如 Windows/SQLite/toolchain 不支持，记录实际错误与替代证据。生成 ignored coverprofile 并统计 `admin/object/aicodex_schema_migration.go` 本 change 受影响 statements，coverage 必须不低于 85%。
- [x] 4.5 对受影响 Go 文件运行 gofumpt；运行相关及全仓 `go vet`、仓库固定 `golangci-lint` 适用门禁，区分任何无关 fixture/toolchain blocker，不新增/升级依赖或修改 workflow。
- [x] 4.6 创建中文 `verification.md`，记录 RED/GREEN、稳定性矩阵、coverage、静态检查、证据层级、未访问外部数据库、remaining risk 和脱敏检查；运行 target/changes/specs strict、`git diff --check`、中文/TBD/敏感信息/EOF 审计。

## 5. Pre-archive 与 self-closeout

- [x] 5.1 使用 `openspec-pre-archive-review` 迭代审查 artifacts、主规格同步语义、最终代码、测试质量、coverage、注释与验证记录，修复所有 Blocking/Fixable 项直到 READY。
- [x] 5.2 archive `stabilize-aicodex-owned-schema-migration-concurrency`，确认 `aicodex-owned-schema-migrations` 主规格同步并重新运行 target/changes/specs strict 与关键 GREEN 矩阵。
- [ ] 5.3 fetch 最新 `origin/hfl-test-base`，将本 change 收敛为 latest base 加 1 个 Conventional Commit，普通非强制 push `HEAD:hfl-test-base`；不得 push/merge `test`。
- [ ] 5.4 删除本地/远端工作分支，清理临时 DB、coverage、planning 和测试进程，使固定 workspace 回到 clean/aligned `hfl-test-base`，再向 controller 回传 `lifecycle_state=RELEASED`、root cause、final HEAD/archive、复现/稳定性矩阵、changed files、validation/coverage、remaining risk、resource locks released、`push_test=false`、`lease_release=true`。
