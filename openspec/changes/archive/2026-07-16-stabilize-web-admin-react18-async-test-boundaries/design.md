## Context

`web-admin` 已固定 React 18.2、RTL 16.3.2 与 Jest 27.5.1。2026-07-17 在 `origin/hfl-test-base@f955924d`、固定 `BABEL_ENV=test` / `NODE_ENV=test` / `PUBLIC_URL=` / `CI=true`、non-silent、`--runInBand` 条件下，全量 Jest 为 153/153 suites、1450/1450 tests、0 failure，同时输出 376 条 `Warning:` 行：326 条含 `not wrapped in act`，47 条 AntD warning，3 条其它 React/runtime warning；另有 1 组 FakeTimers/native timer 提示。

可见 act warning 分布为：`WecomOrganizationSyncPage` 253、`ProviderEditPage` 23、`RolePermissionEditPages` 16、`GroupTreePage` 8、`DingTalkOrganizationSyncPage` 7、`ProductCatalogPages` 5、`PlanPricingSubscriptionPages` 4，`ApplicationEditPageUiCustomization`、`FeishuOrganizationSyncPage`、`CertEditPage`、`EnforcerEditPolicyTable` 各 2，`ManagementPage.shell`、`App` 各 1。除此之外，`ApplicationUsageAccessPage` 与 `UserEditPage` 仍按 `not wrapped in act` 文本返回，属于不可见但已确认的 suppression owner。

聚焦复现进一步表明：`PaymentPages` 单独运行稳定产生 1 组 native timer 提示；`SystemToolsMenuPages` 和 `Antd5ModalOpen` 单独运行不产生该提示。`WecomOrganizationSyncPage` 单独运行 26 tests 时 warning 为 0，但在完整串行运行中其未完成更新会在 Jest 为该 suite 汇总 console 时集中出现，因此必须用全量/相邻 suite 运行与显式完成条件验证，不能用单文件绿灯否认泄漏。

本 change 是 test-only 稳定性治理。生产源码、依赖、Jest 全局 setup/config、Signup、AntD 生命周期生产 owner、Go/schema/workflow 均不在默认写集；若真实修复必须修改生产行为，则停止为 `RC_READY` 请求扩写集。

## Goals / Non-Goals

**Goals:**

- 让治理范围内的测试在断言和卸载前等待真实 promise、DOM 状态、timer 或 cleanup 完成条件。
- 删除两个已知局部 act warning suppression，并增加 test-only 防回退断言。
- 将可行动 React act 与 FakeTimers/native timer warning 降为 0，同时保持 153 suites / 1450 tests 或更高 discovery、0 failure、默认 timeout 和断言强度。
- 保持 AntD deprecated API、生产 runtime warning 与其它非目标类别可见并分类，不借 test-only change 修改生产 owner。

**Non-Goals:**

- 不升级 React、RTL、Jest、AntD、Vite、Playwright 或任何依赖，不修改 package/lock。
- 不建立全局 console policy、全局 timer cleanup 或全仓测试调度框架。
- 不通过 warning 文本静默、skip/only、扩大 mock、提高 timeout、空 `act`、任意 sleep 或 legacy ReactDOM 制造通过。
- 不处理需要生产源码改动的 AntD deprecated API、unique key、未挂载 class `setState` 等独立 owner。

## Decisions

### 1. 以 warning 类别和完成条件为边界，不机械包裹 fireEvent

React act warning 先沿 stack、backend mock、timer 和 DOM 断言定位最后一个未等待边界。同步 `fireEvent` 已由 RTL 包装时不重复套无信息量 `act`；异步 backend resolution 使用 `await waitFor` / `findBy` 或捕获 request promise，timer 使用 `await act(async () => { advanceTimers...; await microtask; })`，portal/motion 使用用户可观察的出现、消失或 cleanup 条件。

替代方案“给所有交互套 `act`”会掩盖究竟等待了什么，且仍可能把 promise 留到测试结束后，故不采用。

### 2. 防回退 guard 只检测治理类别并保留原始 console

必要时提供局部 test-only helper：使用不替换默认实现的 `jest.spyOn(console, "error")` / `console.warn` 收集调用，在测试完成后断言没有 React act 或目标 FakeTimers 文本。helper 不吞掉调用、不放入全局 setup、不忽略 AntD/其它 warning，并在 `finally` / afterEach 中恢复 spy。

替代方案“console mockImplementation 遇到目标文本直接 return”正是本 change 要删除的 suppression，禁止继续使用。

### 3. 分域 TDD 矩阵

| 分域 | RED 证据 | GREEN 语义 | 代表 owner |
|---|---|---|---|
| suppression owner | 删除文本返回并启用局部 guard 后，现有未等待更新使断言失败 | await select/form 的可观察 DOM 或 backend completion | `ApplicationUsageAccessPage`、`UserEditPage` |
| 组织同步 promise/轮询 | 相邻 suite 或 non-silent 全量运行稳定暴露 class state、table、portal/motion act warning | 捕获 backend promise，使用 `findBy`/`waitFor`，在 `act` 内推进 fake timer 并恢复 real timer | WeCom、DingTalk、Feishu 组织同步 |
| timer ownership | `PaymentPages` 单 suite 输出 native timer 提示 | 在创建 timer 前启用 fake timers，推进/清理后恢复；不清理不属于 fake timer 的句柄 | `PaymentPages` |
| portal/lazy/legacy class | 聚焦 non-silent 或局部 guard 捕获卸载后更新 | 等待 dialog/select/tree/lazy content 稳定或显式 unmount/cleanup | Provider、Role、GroupTree、Product/Plan、Cert、Enforcer、Management、App |
| 第三方/生产 owner | 分类计数而非伪造 RED | 保持可见，记录不在 test-only 写集的原因 | AntD deprecated API、unique key、生产生命周期 warning |

每个分域至少保留一次“guard 在修复前因目标 warning 失败”的 RED 输出摘要；GREEN 后先跑 owner 聚焦，再跑 non-silent 全量。原始日志只存在 ignored 临时目录，`verification.md` 只记录脱敏计数和 owner。

### 4. 全量结果是真值，聚焦结果用于定位

单 suite 可能在进程退出前尚未给遗留 microtask/timer 继续执行的机会，因此“单文件 0 warning”不是 closeout 证据。最终目标以固定环境 non-silent、`--runInBand` 全量 Jest 为准；聚焦 suite、相邻 suite 和测试名过滤只用于建立 RED、定位根因和快速 GREEN。

### 5. fail-closed 写集

如果 warning 只能通过生产源码、依赖、Jest 全局 config/setup、Signup 或 AntD 生命周期 owner 修复，保留可复现证据并停止对应路径，不扩大写集。生产 warning 不能通过测试 mock 或 suppression 从输出中消失。

## Risks / Trade-offs

- [AntD portal/motion 更新缺少稳定 DOM 终点] → 优先等待 dialog/option/tree 的出现或消失并显式 cleanup；若只能依赖生产生命周期修改，则分类保留并请求扩写集。
- [通用 flush helper 变成掩盖未完成工作的空 act] → helper 必须推进已识别的 promise/microtask/timer，调用点紧邻对应交互；禁止只为消 warning 在 afterEach 统一 drain。
- [全量 warning 顺序受 suite 调度影响] → 固定 `runInBand`，记录组件 stack 和 suite 汇总；使用相邻 suite/全量复验跨 suite 泄漏。
- [局部 console spy 改变输出] → 默认 spy 继续调用原实现，仅在结束时断言调用；任何 `mockImplementation(... return)` 均禁止。
- [测试数量继续增长] → 以最终 latest base discovery 为准，只允许持平或增加，不照抄 1450 作为永久固定上限。

## Migration Plan

1. 保存最新 non-silent 基线分类和 top owner，确认 no-op 门禁未触发。
2. 创建局部防回退 RED，按 suppression、组织同步、timer、portal/lazy 四个分域逐个修复并运行 GREEN。
3. 运行 owner 聚焦、non-silent 全量和 silent `test:ci`，对比 warning 分类与 discovery。
4. 运行 frozen Yarn（证明 lock 不变）、三类 typecheck、增量 TS、lint、public scripts、Vite build、Playwright discovery 与 OpenSpec 门禁。
5. pre-archive READY 后 archive/sync specs，rebase latest base，收敛为一个 commit并 self-closeout。

回滚只需 revert 单个 test-only change commit；没有生产部署、数据迁移或 runtime rollback。

## Open Questions

无。若实施中证明确需生产源码修改，按写集约束转为 `RC_READY/needs_master_decision`，不在本设计内预授权。
