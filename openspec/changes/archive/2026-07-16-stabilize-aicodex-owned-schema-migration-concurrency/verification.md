# 验证记录

## 结论与证据边界

本 change 修复 AICodex-owned migration history 并发首次创建时的 SQLite 单连接循环等待。验证仅使用 `t.TempDir` SQLite 和本地 Go 工具链；未访问 60、共享/真实数据库、PostgreSQL、MySQL 或 MSSQL，未部署或重启服务。

本 change 不修改 migration registry、V1 identity/checksum、39-model registry、业务 DDL、Provider/Syncer 字段、TLS policy、runtime config、CI workflow、依赖、`web-admin` 或 `test` 分支。

## 根因与 RED

旧实现为 history 首建打开 transaction 后调用 Xorm v1.1.6 `Session.Sync2`。并发竞争中，第二个单连接 engine 可能在 transaction 内观察到 history 已存在；Xorm 随后调用 `engine.loadTableInfo`，通过 engine pool 再取连接，等待该 transaction 自己占用的唯一连接。与此同时，另一 migration transaction 在 baseline `Sync2` 中等待 SQLite exclusive lock，形成循环。

旧实现受控证据：

- `go test -count=50 -run '^TestMigrateAICodexOwnedSchemaSerializesConcurrentSQLiteEngines$' -timeout 3m -v ./object`：第 1 次约 5.88 秒通过，第 2 次等待，整条命令在 3 分钟 timeout；goroutine 栈一侧为 `database/sql.(*DB).conn -> sqlite3.GetColumns -> Engine.loadTableInfo -> Session.Sync2 -> ensureAICodexSchemaMigrationHistory`，另一侧为 SQLite busy handler/exclusive lock -> `Session.createIndexes -> migration.Apply`。
- 同一旧实现单独 `-count=1 -timeout 60s` 也触发 60 秒 timeout，栈再次位于 history metadata 的连接池获取。
- 相关 history 组合曾在 2.197 秒通过；完整 `object` 包 1 轮 13.334 秒、3 轮 34.839 秒也曾通过。概率绿灯与 RED 并存，证明一次/固定顺序通过不能排除该循环。
- 新增窄测试后、实现 helper 前，focused 命令因 `undefined: createAICodexSchemaMigrationHistory` 编译 RED，证明 transaction-bound 显式 DDL 能力尚不存在。
- reconcile metadata 错误传播分支按微型 TDD 回退后，`TestReconcileConcurrentAICodexSchemaMigrationHistoryReturnsMetadataErrors` 得到 `err=<nil>` RED；恢复 fail-closed 实现后通过。
- reviewer 复查后新增 production 组合路径 RED：只读空库同时触发 create/reconcile 失败时，旧 wrapper 的 cause 为单一 `*sqlite.Error`，未保留 reconcile 原因；改用安全 joined cause 后 GREEN。另有精确测试证明启动前已存在但缺 unique 的 partial history 不会被修补。

## 实现与 GREEN

- `createAICodexSchemaMigrationHistory` 在同一 transaction session 内依次调用 Xorm `CreateTable`、`CreateUniques`、`CreateIndexes`，生成与原新表 `Sync2` 路径相同的 model-driven DDL，但不会对竞争后已存在表走 engine-level metadata。
- create transaction 无论 commit 或 rollback 均先结束，再由 transaction 外 `inspectModelTableCompatibility` 单次证明 history 完整兼容；删除原 5×10ms 轮询 sleep。无法立即证明时 fail closed，不用时间猜测 schema 事实。create/reconcile 双重失败使用 `errors.Join` 保留两条 cause chain，外层错误仍只输出 cause 类型。
- focused GREEN：新 helper 测试 0.00 秒、双单连接 engine 并发 migration 6.00 秒，package 7.130 秒。
- 新增真实失败契约覆盖只读 SQLite DDL、关闭 engine metadata、非法 lock row、create/reconcile 双重错误链、pre-existing partial history 不修补与 reconcile metadata 错误；未添加只断言 mock、DTO 拼装或纯行覆盖测试。
- reviewer 修复后的最终 focused 组合包含上述新增契约与双 engine 并发测试，`-count=1` 为 2.693 秒、exit 0。

## 稳定性矩阵

| 层级 | 命令/条件 | 结果 |
| --- | --- | --- |
| 目标高次数 | `go test -count=50 -run '^TestMigrateAICodexOwnedSchemaSerializesConcurrentSQLiteEngines$' -timeout 10m ./object` | 50/50 通过；69.818 秒；无 timeout/低 CPU 长等待 |
| 相关组合 | history reconcile、显式 DDL、rollback/recovery、双错误链、partial history、只读失败与双 engine 并发，`-count=20` | 扩展组合 20/20 通过；206.220 秒；执行期间另一路全模块测试争用构建/CPU，但未出现 timeout 或锁栈 |
| 完整 object | `go test -count=3 -timeout 5m ./object` | 3/3 通过；40.310 秒 |
| 顺序独立 | `go test -count=1 -shuffle=1039733175 -timeout 3m ./object` | 通过；12.047 秒 |
| coverage 全包 | `go test -count=1 -coverprofile <ignored>/schema-migration-concurrency.coverage.out ./object` | 通过；object 42.8%，受影响实现见下节 |
| 全 module hermetic | `GOTOOLCHAIN=go1.25.8 go test -count=1 -tags skipCi -timeout 10m ./...` | 最终重跑 exit 0；`object` 15.112 秒，`proxy` 1.933 秒，其余有测试的 package 均通过 |

上述 10 分钟 timeout 是 50 轮整条命令的诊断上界，依据 focused 单轮最高约 6 秒设置；它没有放宽单轮断言或替代根因修复。

## Coverage 与 race

- object package statement coverage：42.8%，该包包含大量未触碰 legacy 实现。
- `ensureAICodexSchemaMigrationHistory`：90.5%。
- `createAICodexSchemaMigrationHistory`：100.0%。
- `reconcileConcurrentAICodexSchemaMigrationHistoryCreate`：100.0%。
- 三个受影响函数全部达到 85% 门槛；coverprofile 位于 ignored `tmp/test-results`，closeout 前清理。
- focused `go test -race` 未运行：当前 `GOOS=windows`、`GOARCH=amd64`、`CGO_ENABLED=0`，系统无 gcc，Go 返回 `-race requires cgo`。该项记 N/A，不声明通过；替代证据为真实双 engine 50/20 次、完整包与 shuffle 矩阵。

## 格式、静态与全仓说明

- 受影响 Go 文件 `gofumpt` 后无 diff；`git diff --check` 首轮通过。
- `GOTOOLCHAIN=go1.25.8 go vet ./object`：exit 0。
- `GOTOOLCHAIN=go1.25.8 go vet ./...`：exit 0。
- fixed `golangci-lint v2.11.4`（go1.25.8 构建）全仓只报 `object/user_util_test.go:1` 的既有 gofumpt 问题；`git diff --exit-code origin/hfl-test-base -- object/user_util_test.go` 为 0，证明不在本 change 写集。受影响文件直接 gofumpt 无 diff，package-level govet-only linter 返回 `0 issues`。
- 较早一次全 module hermetic 中，`proxy/TestSOCKS5HandshakeDeadlineClosesStalledConnection` 曾断言底层连接未关闭；`git diff --exit-code origin/hfl-test-base -- proxy` 为 0，精确测试 `-count=5` 为 5/5 通过。最终全模块重跑也已 exit 0，因此该历史 timing 波动不构成当前 closeout blocker。
- 未新增/升级依赖、未修改 `go.mod`/`go.sum`/workflow；ignored `vendor` 仅按 Makefile lint 前置生成，closeout 前清理。

## OpenSpec、文档与脱敏

- pre-implementation review 已修复“沿用 5×10ms sleep”问题，结论 READY。
- target change strict、active changes strict、48/48 主规格 strict 与 `git diff --check` 在 reviewer 修复后的最终源码状态重新运行并通过；archive 后仍将复验仓库级 changes/specs strict。
- 独立只读 reviewer 已复查两项 Important 的最终修复，确认双 cause chain 与 pre-existing partial history fail-closed 契约均已闭合，结论 `Ready to merge: Yes`。
- 最终 pre-archive review 对 artifacts、主规格同步、代码/测试质量、受影响函数 coverage、关键注释、文档语言、证据层级与脱敏逐项复核；审查范围内未发现阻断问题，结论 `READY`。
- change 已归档到 `openspec/changes/archive/2026-07-16-stabilize-aicodex-owned-schema-migration-concurrency`，并同步 `aicodex-owned-schema-migrations` 主规格的并发首次创建 requirement。
- archive 后 active changes 为空、48/48 主规格 strict、`git diff --check`、archive/main spec UTF-8/无 BOM/EOF 与 TBD/敏感信息扫描均通过；archive 工具生成的主规格末尾多余空行已删除并复验。
- artifacts 与验证记录以简体中文说明为主；OpenSpec 结构关键字、命令、类型/函数名和数据库术语保留英文。
- 本记录不含 DSN、账号、密码、token、Cookie、私有 URL、真实主机/端口、raw 数据库错误或个人信息。

## 剩余风险

- Windows 当前 toolchain 无法提供 race 证据；由实际 SQLite 多 engine 高次数矩阵替代，但不等同于 race detector。
- fixed 全仓 golangci-lint 仍有一个已证明不在本 change diff 的 `user_util_test.go` baseline 格式问题；本 worker 按 write set 不修改该文件。全 module hermetic 最终重跑已通过。
- 本 change 按正式 envelope 不运行 PostgreSQL/MySQL/MSSQL；显式 DDL 继续使用 Xorm model/tag/方言生成器，且 history model/约束不变，但没有新增外部方言运行态证据。
