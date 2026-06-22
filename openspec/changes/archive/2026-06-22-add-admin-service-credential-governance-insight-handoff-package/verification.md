# Verification

## TDD RED/GREEN

- RED: `yarn test ApplicationAccessCenter.test.tsx --watchAll=false --runInBand`
  - 结果：失败，新增 helper 测试报 `buildServiceCredentialGovernanceHandoffPackage is not a function`，符合缺少生成契约的预期。
- RED: `yarn test ApplicationAccessCenter.test.tsx --watchAll=false --runInBand`
  - 结果：失败，新增 UI 测试找不到“生成/查看交接包”，符合缺少 UI 入口的预期。
- GREEN: `yarn test ApplicationAccessCenter.test.tsx --watchAll=false --runInBand`
  - 结果：通过，16 个测试全部通过。

## Focused Jest / Coverage

- 命令：`yarn test ApplicationAccessCenter.test.tsx --watchAll=false --runInBand --coverage --collectCoverageFrom=src/ApplicationAccessCenter.tsx --collectCoverageFrom=src/backend/ApplicationAccessServiceCredentialGovernanceBackend.ts`
- 结果：通过，16 个测试全部通过。
- 覆盖率对象：
  - `src/ApplicationAccessCenter.tsx`: statements 86.39%，branches 80.96%，functions 93.33%，lines 86.25%。
  - `src/backend/ApplicationAccessServiceCredentialGovernanceBackend.ts`: statements 87.36%，branches 79.62%，functions 96.42%，lines 87.05%。
- 结论：受影响实现文件 statement/line coverage 达到 85% 目标；branch coverage 低于 85% 的未覆盖行主要为既有状态/错误分支和 helper 的少量防御分支。

## TypeScript / Build

- 命令：`node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`
  - 结果：通过，无输出。
- 命令：`yarn typecheck`
  - 结果：通过。
- 命令：`yarn build`
  - 结果：通过。构建输出包含既有 Browserslist 过期提示和 bundle size 提示。

## OpenSpec / Diff

- 命令：`openspec validate add-admin-service-credential-governance-insight-handoff-package --strict`
  - 结果：通过。
- 命令：`openspec validate --changes --strict`
  - 结果：4 个 active changes 全部通过。
- 命令：`openspec validate --specs --strict`
  - 结果：28 个 specs 全部通过。
- 命令：`git diff --check`
  - 结果：通过，无输出。

## Browser Smoke

未启动本地 dev server 做浏览器 smoke。本次变更的 UI 行为已由 `ApplicationAccessCenter.test.tsx` 覆盖生成/查看交接包、保存后回读输入、诊断/保存入口保持可用和敏感字段不渲染；继续启动浏览器 smoke 的边际收益低，且该页面依赖 mock fetch fixture 时浏览器 smoke 需要额外测试 harness。

## Sanitizer Summary

- handoff package helper 仅输出 schema/version/source、consumer/admin alias、group readiness、owner/source/reference/caller/bounded policy/keep-in-env/cannot-infer/stable aliases。
- 测试断言 package 和 UI 预览不包含 fixture 中的 token-like value、完整私有 URL、`clientSecret`、`Authorization`、`Cookie`、raw payload 标识。
- helper 对 `env_config`、`keepInEnv`、missing reference、disabled group、blocked status、external secret unresolved 和 cannot-infer diagnostic 均 fail closed，不输出 ready/full success。

## Remaining Risk

- 本地验证不代表 Insight/API-Gateway 运行态接入成功；交接包仅作为 Admin owner copy-safe handoff evidence。
- 浏览器 smoke 未执行，剩余风险主要是真实浏览器布局细节；当前预览复用既有紧凑 row/tag 结构，未新增全局样式。
