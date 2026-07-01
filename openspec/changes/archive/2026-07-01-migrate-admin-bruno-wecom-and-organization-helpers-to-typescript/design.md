## Goals / Non-Goals

Goals:
- 将 chosen batch 固定为 `wecomSource*.js/.test.js` 与 `organizationTreeOperations*.js/.test.js`。
- 提供可复现的 TypeScript 源到同名 CommonJS `.js` 入口生成路径，现有 `require("./helper")` 和 `node --test *.test.js` 继续可用。
- 保持 helper 既有 alias、owner handoff、redaction/fail-closed、non-extrapolation boundary 和 release guardrail 行为不变。

Non-Goals:
- 不迁移或读取改写 `gatewayProjection*`，避免与 Admin-0 的 Gateway helper 迁移冲突。
- 不修改 `api-tests/bruno/aicodex-admin/README.md`；RC 回传记录运行命令即可。
- 不触碰 `web-admin/**`、public raw scripts、build tooling、Cypress、Swagger vendor JS、真实 60 环境、DB、fixture 或配置。
- 不引入生产依赖，也不依赖 Admin-0 分支尚未合入的 `node-globals.d.ts`。

## Decisions

- Source/entry strategy: 每个目标 helper 和测试保留同名 `.js` CommonJS 入口，同时新增对应 `.ts` 源文件。`.ts` 源以 `// @ts-nocheck` 头部包裹现有 CommonJS 内容，生成/一致性检查通过移除该头部得到同名 `.js` 入口，因此 Bruno 和 `node --test` 仍使用现有 `.js` 入口。
- TypeScript tooling: 使用仓库已有 `web-admin/node_modules/typescript`，通过本批专属 `api-tests/bruno/aicodex-admin/scripts/tsconfig.wecom-organization-helpers.json` 控制 include 范围并执行 `noEmit` 解析检查，不修改根配置或 `web-admin` 配置。
- Local types: 如需 Node/CommonJS 和宽松动态对象类型，使用本批专属 `wecomSource.types.d.ts` 与 `organizationTreeOperations.types.d.ts`，不创建或修改 `node-globals.d.ts`。
- Consistency gate: final validation 先运行 TypeScript `noEmit`，再逐个检查 `.ts` 去掉 `// @ts-nocheck` 头部后与同名 `.js` 完全一致；随后运行目标 `.test.js`，证明实际执行的是保留的 CommonJS entry。

## Risks / Mitigations

- Risk: `tsc` printer 输出格式可能改变 CommonJS helper 文本。
  Mitigation: 不使用 `tsc` 原地 emit 作为提交内容；使用 `noEmit` 验证 TS 源可解析，并用源镜像一致性检查确认 `.js` 入口没有非预期 diff。
- Risk: 动态证据对象的严格建模牵出大量行为风险。
  Mitigation: 本批采用窄的 Node/CommonJS 声明与 `LooseRecord` 边界，不重构 helper 内部业务判断。
- Risk: 与 Admin-0 Gateway helper 迁移产生写集冲突。
  Mitigation: 不触碰 `gatewayProjection*`、`README.md` 或共享 `node-globals.d.ts`。

## Deferred

- `gatewayProjection*` helpers/tests: 由 Admin-0 的 `migrate-admin-bruno-handoff-helpers-to-typescript` 处理。
- Swagger vendor JS、web-admin public raw scripts、build tooling、Cypress: 明确不属于本批。
- 完整 Bruno README 运行说明：本 RC 不改 README，验证命令写入 `verification.md` 和最终回传。
