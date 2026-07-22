## Context

`web-admin` 当前使用Vitest 4.1.10、single-worker、file-serial与 `isolate=true`，普通全量约 `3579.75s`，coverage约 `3824.30s`；历史Jest为 `543.836s`。本change在12逻辑CPU、约32GiB内存、Bun 1.3.14、Node v24.14.0、Vite 8.1.4与jsdom 28.1.0的脱敏本地环境评估测试专用AntD/icons ESM optimizer。

设计阶段已证明include-only候选会内嵌第二ReactDOM renderer。唯一增加 `exclude=["react-dom"]` 后，metadata显示AntD/icons来自各自 `es/index.js`、`needsInterop=false`，`antd.js`只保留外部ReactDOM import；renderer、root/subpath mock与singleton专项均通过。

正式实施按TDD增加候选后，第一次默认顺序完整轮以 `823.598s` 完成157/157 files、1511/1511 tests且0 timeout；第二次默认轮在 `ApplicationEditPageUiCustomization.test.tsx` 的 `renders runtime-shaped UI customization tab without a white screen` 用例耗时5349ms并触发默认5秒timeout。该文件不属于批准的4个条件式owner，候选按设计fail-closed。

## Goals / Non-Goals

**Goals:**

- 评估在不改变single-worker、文件串行、强隔离与默认5秒timeout的前提下能否安全采用ESM optimizer。
- 以重复默认、固定shuffle、coverage、warning、module graph与资源门禁决定GO/NO-GO。
- 只允许有界owner治理，范围外owner立即回退。
- 最终保持production、依赖、lock、CI与共享分支不变。

**Non-Goals:**

- 不使用 `isolate=false`、threads、多workers、CI sharding/matrix或timeout提升。
- 不升级Vitest/Vite/jsdom/React/AntD或其它依赖。
- 不修改production页面、路由、API、后端、Docker、Makefile、Playwright实现或60环境。
- 不用sleep、删测/删断言、skip/only、扩大业务mock或warning suppression制造通过。

## Decisions

### 1. 最终结论为NO-GO并回退公共runner

第二次默认完整轮出现范围外timeout owner，已经满足不可扩大写集的fail-closed条件。最终删除本change增加的两个exact aliases、client optimizer与直接契约测试；4个条件式owner与范围外失败owner均不修改。当前 `vitest.config.ts` 继续只包含既有资产alias并直接使用 `testConfig`。

不把第一次823.598s绿灯解释为可采用，因为规范明确要求两次连续默认与一次shuffle全部通过。第二次运行虽然wall、资源和warning类别满足门槛，但1个默认timeout足以阻断correctness。

### 2. 不修改范围外 ApplicationEditPageUiCustomization owner

失败用例属于 `ApplicationEditPageUiCustomization.test.tsx`，不在以下条件写集：

1. `OrganizationDirectoryQualityPage.test.tsx`
2. `ApplicationUsageAccessPage.test.tsx`
3. `SyncerEditPage.test.tsx`
4. `OrganizationTreeOperationsPage.test.tsx`

因此不进行聚焦RED/GREEN、不拆分该测试、不提高timeout。未来若继续，需要新change明确把该文件列为owner，并重新判断其5349ms是重型render、调度抖动还是其它测试体成本；本change不猜测修复。

### 3. 保留module graph专项作为下一轮输入，不作为采用证据

候选专项均通过：renderer两轮29/29、root mock 76/76、subpath mock 153/153、App/Modal/WorkspaceTabs/WeCom两轮41/41、icons正反序2/2。metadata/bundle也证明唯一 `react-dom` exclude解决了第二renderer问题。

这些结果只证明module graph方案可行，不能覆盖重复完整correctness。未来新change可以复用“exact ESM roots + include +唯一exclude”的假设，但必须重新运行全部专项和完整门禁，不能沿用本次cache或绿灯。

### 4. 停止后续shuffle与coverage

第二次默认已阻断采用，继续运行shuffle或一小时级coverage不会改变NO-GO结论，因此按fail-closed停止。候选coverage、382 production entries与四类reporter结果均为N/A，不使用设计阶段或当前公共runner旧证据冒充最终候选通过。

Production source changed=0，changed-production coverage为N/A。回退后的当前公共runner coverage契约继续由既有主规格与上一迁移change拥有。

### 5. 回退后验证非单测工具链

候选回退后运行 `FrontendCiGates` 12/12、三组typecheck、增量TypeScript gate、lint、public scripts check/build/smoke、Vite build与Playwright discovery 19 files / 22 tests。package、lock、`testConfig.ts`、workflow、Docker、Makefile与Playwright配置hash保持开工值。

API项目只读对照仍只用于组织方式：其Vitest/Vite/jsdom版本、`globals=true`、默认并行、15s/60s timeout、全局ReactDOM mock与production `optimizeDeps`均不复制。

## Risks / Trade-offs

- [当前Vitest仍约一小时] → 明确保留为技术债，不通过不安全配置换性能；下一轮必须扩大书面owner边界后重新评估。
- [第一次完整绿灯证明性能杠杆但不能采用] → 保留823.598s与专项证据，主规格和公共runner不写入失败候选。
- [timeout具有调度抖动] → 重复默认正是用来发现抖动；不以“再跑一次可能通过”替代确定性门禁。
- [未运行候选coverage] → 普通correctness先失败，coverage标N/A；不声明report consumer已验证。
- [未来Vitest大版本可能改变optimizer图] → 重新审计 `vi.mock("antd/es/*")`、metadata、ReactDOM renderer与singleton，不沿用当前证据。

## Finalization Plan

1. 保持runtime/config/test owner回退，完成回退后工具链与只读hash验证。
2. 更新proposal、design、tasks、delta specs、verification、AGENTS与技术债基线为同一NO-GO结论。
3. 运行OpenSpec strict、diff、写集、中文、Purpose/TBD/EOF与脱敏审计。
4. 执行pre-archive review到READY，收敛为latest base上的一个逻辑commit并只push工作分支。
5. 回传NO-GO `RC_READY`；不archive、不push base/test、不删除分支、不释放locks。

## Archive Recommendation

本change最终没有runtime、测试配置、测试owner、依赖、CI或production行为变化。closeout已按主控授权使用 `skip-specs`：保留完整NO-GO archive证据，但不把失败候选同步到 `openspec/specs/**`。

## Open Questions

无。当前change结论为NO-GO；未来优化属于新的独立change。
