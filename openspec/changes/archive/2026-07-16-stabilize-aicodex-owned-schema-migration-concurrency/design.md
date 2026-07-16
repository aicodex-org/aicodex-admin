## Context

当前 executor 为 history table 首建打开 Xorm session transaction，并在该 transaction 中调用 `Session.Sync2(new(AicodexSchemaMigration))`。Xorm v1.1.6 的 `Session.Sync2` 虽然用 transaction queryer 读取表清单，但只要表已存在，就会调用 `engine.loadTableInfo`，再通过 engine 的 `sql.DB` 连接池读取列和索引。

并发首次迁移时，两个 engine 都可能在 transaction 外观察到 history 不存在。第一侧先创建 history 并继续 baseline DDL；第二侧随后在单连接 transaction 内观察到 history 已存在，`engine.loadTableInfo` 等待该 transaction 自己占用的唯一连接，同时 transaction 保留 SQLite read lock。第一侧等待 SQLite exclusive lock完成索引/表创建，于是形成循环。`PRAGMA busy_timeout` 只约束 SQLite 锁等待，不能解除 `database/sql` 连接池自等待。

旧实现受控证据不是固定顺序依赖：目标测试曾在高次数第 2 次和独立单次分别触发 3 分钟/60 秒超时，也曾在相关组合和完整包 1+3 轮中快速通过。超时栈稳定落在 history `Session.Sync2 -> engine.loadTableInfo -> database/sql.(*DB).conn`，另一侧位于 baseline `Session.Sync2` 的 SQLite exclusive lock 等待。

## Goals / Non-Goals

**Goals:**

- 消除 history 首建竞争中的 connection-pool/SQLite-lock 循环，使两个独立单连接 SQLite engine 均能完成首次 migration。
- 保留 transaction-bound history 建表、约束创建、失败 rollback、竞争结果兼容性证明和后续 migration 数据库锁语义。
- 用旧实现 RED、窄回归测试、高次数目标测试、相关组合和完整包多轮证明修复，不依赖一次绿灯。
- 保持实现最窄，并使关键注释解释 Xorm v1.1.6 的非直观连接边界。

**Non-Goals:**

- 不修改 migration registry、V1 identity/checksum、39-model registry、业务 DDL 或 history model 字段。
- 不升级/替换 Xorm 或 SQLite driver，不新增依赖，不修改 CI workflow。
- 不通过提高连接池上限、延长 timeout、sleep/retry、skip、弱化断言、固定测试顺序或串行整个 package 掩盖等待。
- 不访问 PostgreSQL/MySQL/MSSQL、60、共享或真实数据库；本 change 只使用 `t.TempDir` SQLite。
- 不修改 Provider/Syncer model、TLS policy、schema registry 内容、runtime config、`web-admin` 或 `test` 分支。

## Decisions

### 1. 新 history table 使用显式 transaction DDL，而不是 `Session.Sync2`

新增窄 helper，在同一 session transaction 中按 Xorm 新表分支的既有顺序调用 `CreateTable`、`CreateUniques`、`CreateIndexes`。这三步只通过当前 session 执行 DDL，不读取 engine-level metadata；生成的 history table、主键和 version unique constraint 与当前 `Sync2` 新表路径一致。

外层 `IsTableExist` 只有观察到 history 缺失时才进入显式 DDL transaction，因此启动前已存在的 partial history 不会被该 helper 修补。并发另一实例开始创建后，Xorm 方言的 `CREATE TABLE IF NOT EXISTS` 可能让 loser 在 table 步骤幂等继续：完整竞争结果通常在重复 unique constraint 返回错误并 rollback；若只观察到同一并发 create 的中间状态，当前 transaction 只会补齐 model 定义的相同 unique/index 后 commit。无论 transaction 以 commit 还是 rollback 结束，后续都在 transaction 外通过 `inspectModelTableCompatibility` 单次重新证明 history 的列、PK 和 unique 完整兼容，无法证明即 fail closed。

没有选择在 create transaction 内先调用 `Session.IsTableExist` 返回竞争 sentinel：两个 SQLite transaction 可能先各自取得 read lock，再同时升级 write lock，重新引入锁升级竞态。状态驱动的显式 model DDL 不读取 engine-level metadata，且由 transaction 外完整证明兜底。显式 DDL 竞争无需以 5×10ms 轮询 sleep 猜测可见性；本 change 删除该任意等待。create 与 reconcile 同时失败时，外层以 `errors.Join` 保留两条 cause chain，错误字符串仍只输出 cause 类型，避免泄漏原始数据库文本。

没有选择“把目标测试连接池从 1 改为 2”：这会绕开已证实的 transaction 内二次取连接，却不能修复 executor 对单连接 pool 的循环，也无法证明 history create 的 transaction 边界正确。

没有选择“为 migration 增加 context/timeout”：deadline 只能把无界等待改成失败，不能满足两个实例均成功和只保留一条 history 的主规格。

没有选择维护手写 SQL：Xorm 的 `CreateTable`/`CreateUniques`/`CreateIndexes` 已提供与现有 model/tag/方言一致的 DDL，不需要引入第二份 history schema 真值。

### 2. RED 由真实旧 executor 提供，回归测试覆盖显式 DDL 与并发契约

已在未改生产代码前运行真实目标测试：高次数在第 2 次超时，独立单次也超时，且完整栈证明循环。实施时先新增/调整窄测试，使 history create helper 在空库 transaction 中创建完整约束，并在完整已存在表上从显式 DDL 返回竞争错误、由 reconcile 路径重读；随后才替换 production closure。新增测试还证明启动前已存在但缺 unique 的 partial history 只读 fail closed，不会被 helper 修补。

两个独立 engine 的现有目标测试继续使用同一 `t.TempDir` 文件、`SetMaxOpenConns(1)` 和连接级 busy timeout，以证明真实 executor 的跨 engine 串行化。测试不新增任意 sleep、无界 retry、放宽断言或测试顺序依赖。

### 3. 稳定性矩阵分层证明

- RED：记录旧实现命令、触发次数/条件和 goroutine/SQLite 锁栈；概率绿灯不覆盖 RED。
- GREEN focused：目标测试至少 `-count=50`；history create/reconcile/rollback 与 migration 并发相关组合至少 `-count=20`。
- package：完整 `./object` 无缓存至少 3 轮，另以 `-shuffle=on`/合理 CPU 调度检查顺序独立性；每条命令使用有限 Go test timeout，只作为失败诊断上界。
- correctness：适用时运行 focused `-race`；Windows/SQLite/toolchain 不支持时记录具体结果。若生产实现有 diff，统计受影响 implementation statements，目标不低于 85%；若最终仅测试 diff，则 coverage 记 N/A 并证明生产 diff 为零。
- quality：gofumpt、相关/全仓 go vet、仓库固定 golangci-lint、OpenSpec target/changes/specs strict、`git diff --check`、中文/TBD/脱敏/EOF 检查。

## Risks / Trade-offs

- [显式 DDL 步骤与 Xorm 新表 `Sync2` 路径漂移] → helper 严格复用 Xorm 公开的 `CreateTable`、`CreateUniques`、`CreateIndexes`，并测试 history PK/version unique constraint 与失败 rollback。
- [`IF NOT EXISTS` 可能幂等补齐并发中间态] → helper 仅在 transaction 外 precheck 已确认表缺失时进入，只执行同一 history model 的 table/unique/index；启动前已存在 partial history 的精确测试证明它绕过 helper并 fail closed。transaction 结束后仍必须完整验证列、PK 和 unique。
- [移除短轮询后暴露真实 transient failure] → transaction 外单次检查只接受立即可证明的完整 history；不能证明时 fail closed，不用时间猜测替代 schema 事实。
- [create/reconcile 双重失败丢失诊断链] → 使用 `errors.Join` 同时保留两条 cause，测试通过 production `ensure` 路径验证；operator 错误仍只输出 cause 类型而不输出原始连接/数据库文本。
- [目标测试仍为概率调度] → 保留真实并发测试并提高次数，同时增加窄的 history DDL/helper 契约；验收看组合矩阵和超时栈消失，不把一次通过当结论。
- [SQLite 修复误改跨方言 DDL] → 不写方言 SQL，不改 model/tag/registry；只替换 Xorm 新表操作的调用方式。任务明确不执行外部数据库运行态，跨方言风险由已有 model-driven DDL 和静态/单测边界覆盖。

## Migration Plan

1. 在现有工作分支完成 TDD、SQLite 稳定性矩阵和静态门禁。
2. archive 后同步 `aicodex-owned-schema-migrations` 主规格；收敛为最新 `origin/hfl-test-base` 加一个逻辑提交。
3. 普通非强制 push `HEAD:hfl-test-base`，不 push/merge `test`；删除本地/远端工作分支并恢复固定 workspace clean/aligned base。
4. 若回滚代码，只回退本 change 的 helper/调用方式；不删除 history、业务表或 migration 记录。由于 DDL 结果不变，不需要数据迁移或运行态 cleanup。

## Open Questions

无。根因、写集、数据库边界、验证强度和 self-closeout 权限均由超时栈、Xorm 源码、主规格与正式 controller envelope 确定。
