## Context

当前 `web-admin` Vitest 4.1.10真值为`forks`、`globals=false`、`maxWorkers=1`、`fileParallelism=false`、`sequence.concurrent=false`、`isolate=true`、`mockReset=true`与默认5秒timeout。迁移基线保持157 files / 1510 tests；普通全量`3579.75s`、coverage `3824.30s`，原Jest普通基线为`543.836s`。

设计与实施profiling均在同一固定Windows workspace执行，资源为6物理核/12逻辑CPU、约32GiB内存，Bun 1.3.14、Node 24.14、Vite 8.1.4、jsdom 28.1.0。没有清空Windows OS page cache；cold仅表示optimizer cache重建，不代表机器冷启动。

### 候选矩阵

| 范围 | 候选 | wall | correctness / 结论 |
| --- | --- | ---: | --- |
| 17文件 | 当前配置，forks/true/1 | 550.333s成功参照 | 326/326通过 |
| 17文件 | CJS exact-root alias/1 | 534.306s | 326/326，但与当前实际`lib/index.js`解析相同，仅改善2.9%，拒绝 |
| 17文件 | CJS alias/2 | 297.220s | 323/326，3个timeout，无独立alias收益，拒绝 |
| 17文件 | 当前配置/2 | 292.255s | 样本通过；完整shuffle与coverage曾失败，延期 |
| 17文件 | 当前配置/4 | 182.528s | 默认timeout，拒绝 |
| 17文件 | threads/2 | 284.566s | 只比forks/2快2.6%，拒绝 |
| 17文件 | CJS根包client optimizer | 91.976s | 95 tests失败、25 errors、interop破坏，拒绝 |
| 17文件 | ESM exact-root client optimizer/1，cache重建 | 171.997s | 325/326，1个既有重型timeout |
| 17文件 | 同上，warm | 159.459s | 326/326通过，较参照改善71.0% |
| 完整157 | ESM optimizer/1，默认顺序 | 982.253s | 1505/1510，5个timeout，设计阶段FAIL |
| 完整157 | ESM optimizer/1，file-only shuffle | 873.621s | 157/157、1510/1510通过 |
| 完整157 | isolate=false/2 | 301.753s | 26 files / 104 tests失败、49 errors、24 unhandled、43 act warning，拒绝 |

当前根 `antd@5.29.3` 与 `@ant-design/icons@5.6.1` 均默认解析到CJS `lib/index.js`。Vitest 4.1.10的jsdom依赖优化入口是`test.deps.optimizer.client`；先用精确根alias指向`es/index.js`再预构建时，metadata的两个入口均`needsInterop=false`。`server.deps.external`根正则面对resolved absolute ID不命中，短轮没有收益。

## Goals / Non-Goals

**Goals:**

- 用TDD与真实候选配置验证ESM optimizer的alias、metadata、mock/subpath/singleton与完整运行边界。
- 在批准的5个owner和默认timeout内fail-closed决定采用；出现第6个owner立即回退。
- NO-GO时保持公共runner、依赖、CI、production与coverage真值不变，并形成可审计verification。

**Non-Goals:**

- 不扩大到第6个测试owner，不修改production或backend。
- 不提高timeout、添加sleep、删测/删断言、扩大业务mock或过滤warning。
- 不采用2/4/8 workers、threads、CI matrix/sharding或`isolate=false`。
- 不升级/降级依赖，不修改`package.json`或`bun.lock`。
- 不访问60，不声明业务运行态或生产E2E。

## Implementation Outcome

### 1. TDD候选验证完成

`FrontendCiGates.test.ts`先建立有效RED：12个既有test通过，新增契约只因缺少精确ESM root alias与client optimizer失败。随后在测试专用`vitest.config.ts`最小实现候选，GREEN为13/13，`typecheck:build-tooling`通过，optimizer metadata确认两个`es/index.js`入口均`needsInterop=false`。

候选配置专项结果：根`vi.mock("antd") + vi.importActual("antd")`为4 files / 76 tests通过；`antd/es/*` subpath局部mock为6 files / 153 tests通过；App/Modal/WorkspaceTabs/WeComLoginPanel默认与反序各4 files / 41 tests通过；icons `setTwoToneColor`轻量sentinel正反顺序各2/2通过。

### 2. 正式完整门禁触发NO-GO

首个正式默认顺序完整候选开跑前竞争测试进程为0，使用warm可重建optimizer cache，仍保持1 worker、file-serial、强隔离与默认5秒timeout。运行到`416.332s`时，`OrganizationTreeOperationsPage.test.tsx`的“renders organization tree operations diagnostics without treating display data as authority”耗时`5032ms`并timeout；进程树峰值`966.8MiB`。

该文件不属于批准的5个owner：

1. `ApplicationAccessMenuPages.test.tsx`
2. `AuditOperationsListPages.test.tsx`
3. `EntryListPage.test.tsx`
4. `InvitationListPage.test.tsx`
5. `common/ListPageIdentityCell.test.tsx`

因此不再等待完整轮结束，不修改范围外owner，也不启动重复全量、shuffle或coverage。候选配置与新增契约测试立即回退，5个条件式owner没有修改。回退后`FrontendCiGates`恢复12/12、`typecheck:build-tooling`通过。

### 3. 最终决策：保持当前未优化runner

最终公共runner不增加AntD/icons测试root alias，不启用`test.deps.optimizer.client`，不改变workers、timeout、isolation、warning或coverage配置。`873.621s`只证明潜在性能杠杆，不能覆盖默认顺序和正式实施暴露的范围外timeout。

未来若重新评估，必须建立新的owner治理write_set与资源锁，并重新执行两次默认顺序、file-only shuffle、coverage、mock/subpath/singleton及warning门禁。Vitest大版本升级还必须专项回归`vi.mock("antd/es/*")`与optimizer协作。

## Final Write Set

最终tracked写集：

- `web-admin/AGENTS.md`
- `docs/admin-technical-debt-baseline-2026-07-14.md`
- `openspec/changes/optimize-web-admin-vitest-parallelism-and-ci-runtime/**`

已回退、最终不变：`web-admin/vitest.config.ts`、`web-admin/src/FrontendCiGates.test.ts`与5个条件式owner。只读不变：`web-admin/config/vitest/testConfig.ts`、`package.json`、`bun.lock`、`.github/workflows/build.yml`、Playwright配置、Docker与Makefile。production与Admin backend无修改。

## Risks / Trade-offs

- 当前强隔离单workerVitest仍明显慢于Jest；本change选择正确性与有界写集，不用timeout或范围扩张换取性能。
- `OrganizationTreeOperationsPage`只在完整候选上下文中触发timeout，聚焦修复不在本change授权内；未来需要新设计判断是测试长尾、顺序或module graph交互。
- 没有最终候选coverage，因为正式普通correctness先失败；既有公共runner coverage契约由上一迁移change的382 production条目与四类reporter证据继续覆盖。
- 未观察外部CI wall；不为此等待CI或修改workflow。

## Finalization Plan

1. 保持运行时rollback，完成FrontendCi与三组typecheck、增量TS、lint、public scripts、Vite build与Playwright discovery回归。
2. 更新agent规则、技术债基线、verification、proposal/design/tasks/delta specs，使全部artifact描述同一NO-GO结论。
3. 运行OpenSpec strict、diff/写集/乱码/skip-only/suppression与临时残留审计。
4. 执行pre-archive review到READY，fetch最新base/test并收敛为latest base上的一个逻辑commit，只push工作分支并回传NO-GO RC_READY。

## Archive Recommendation

本change最终没有运行时、测试配置、测试owner、依赖或CI行为变化。归档时建议使用`skip-specs`：保留proposal、design、tasks、delta specs与verification作为NO-GO决策证据，但不把失败候选或一次性fail-closed过程同步到`openspec/specs/**`。当前两份主规格在本change前后均保持不变。

## Open Questions

无。当前change的最终技术结论为NO-GO；未来优化属于新的独立决策。
