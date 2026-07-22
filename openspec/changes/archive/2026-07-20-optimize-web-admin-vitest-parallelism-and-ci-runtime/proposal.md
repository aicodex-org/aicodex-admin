## Why

`web-admin` 完成Jest至Vitest迁移后，强隔离单worker普通全量耗时`3579.75s`、coverage耗时`3824.30s`，明显慢于原Jest `543.836s`。本change通过单变量profiling与正式采用门禁评估AntD/icons dependency optimizer、文件并行、CI sharding和降低isolation等路径，目标是在不牺牲157条路径、1510 tests、warning、coverage与默认timeout的前提下决定是否采用。

## What Changes

- 设计阶段证明“精确ESM根alias + `test.deps.optimizer.client` + 单worker强隔离”是最大性能杠杆：file-only shuffle曾达到`873.621s`，但默认顺序存在timeout；CJS alias、CJS optimizer、`server.deps.external`、2/4 workers与`isolate=false`均被拒绝或延期。
- 实施阶段按TDD增加直接配置契约并最小实现候选，确认optimizer metadata的两个入口均为`es/index.js`、`needsInterop=false`；根partial mock、`antd/es/*` subpath mock、App/Modal/ConfigProvider组合和icons singleton正反顺序专项均通过。
- 首个正式默认顺序完整候选在批准的5个owner之外暴露`OrganizationTreeOperationsPage.test.tsx`默认timeout，触发“第6个owner立即fail-closed”硬门禁。候选配置与新增契约已经回退，5个条件式owner均未修改。
- 最终公共runner继续使用当前未优化的Vitest 4.1.10、`globals=false`、单worker、file-serial、`isolate=true`、`mockReset=true`与默认5秒timeout；不启用AntD/icons root alias或dependency optimizer，不修改CI workflow、package、`bun.lock`或production。
- 更新前端agent规则、技术债基线、verification与本change记录，明确本change为NO-GO证据收口；未来重启必须独立设计owner治理边界，并在Vitest大版本升级时回归`vi.mock("antd/es/*")`与optimizer协作。
- change名称保留首版`parallelism-and-ci-runtime`字样，以维持分支与资源锁连续；最终没有交付并行化或CI拓扑修改。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

无。两份delta specs只保留本次NO-GO与fail-closed决策证据，归档时应使用`skip-specs`，不把失败候选同步到主规格。当前主规格描述的串行Vitest、warning与coverage契约继续保持不变。

## Impact

- 最终tracked修改只包含本change OpenSpec artifacts、`web-admin/AGENTS.md`与技术债基线；候选 `web-admin/vitest.config.ts`、`FrontendCiGates.test.ts`与5个owner已回退为实施前状态。
- `web-admin/package.json`、`web-admin/bun.lock`、`.github/workflows/build.yml`、Playwright、production source、Admin backend、Docker/Makefile与60环境均不变。
- 本change不宣称性能优化已交付。`873.621s`只保留为候选证据；当前公共runner已知慢于Jest的风险继续存在。
