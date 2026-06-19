## Context

`ApplicationAccessCenter` 当前由 `ApplicationListPage.js` 引入，用于展示应用接入摘要和优先处理项。组件本身不发起请求、不写入配置、不触发真实认证或 Gateway 调用，主要风险集中在 TypeScript 类型补充时不能改变既有宽松输入兼容行为。

## Goals / Non-Goals

### Goals

- 使用 `.tsx` 保留现有 React 组件导出形态，继续支持历史 `.js` 调用方直接 `import ApplicationAccessCenter from "./ApplicationAccessCenter"`。
- 使用局部类型描述应用记录、Provider 绑定、摘要结构和 props，避免无解释 `any`。
- 保持 `buildApplicationAccessCenterSummary` 的可测试导出和现有脱敏约束。
- 将包含 JSX 的测试迁移为 `.test.tsx`，符合 `web-admin/AGENTS.md` 的测试文件规则。

### Non-Goals

- 不迁移 `ApplicationListPage.js`、`ApplicationEditPage` 或应用接入其它子页面。
- 不调整应用接入中心的视觉布局、文案、路由链接、权限或 i18n 策略。
- 不新增后端接口、运行态探测、真实 OAuth/OIDC 调用、密钥读取或 Gateway projection 行为。
- 不修改 TypeScript 基建、`package.json`、lockfile 或 `tsconfig.json`。

## Decisions

- 保留 helper 与组件同文件迁移：该文件当前规模可控，拆分 helper 会扩大 diff 和调用边界，当前 change 只做低风险类型迁移。
- 对外部输入采用宽松局部类型：历史数据可能出现数组、标量、对象或空值，`toArray`、`hasNonEmptyValue` 等兼容逻辑必须保留；类型只表达当前组件消费的字段，不收窄后端契约。
- 测试保持行为断言：既有测试已经覆盖摘要、脱敏和状态文案，迁移测试后只做 TypeScript 必要调整，不引入快照或低价值 mock 断言。

## Rollout / Compatibility

- React Scripts/CRACO 会按现有 TS 基建解析 `.tsx`，`ApplicationListPage.js` 的无后缀导入可继续解析到迁移后的文件。
- 迁移不改变构建产物入口、路由表或权限判断。
- 如果 typecheck 暴露历史测试类型缺口，只在本测试文件内做最小类型修复，不扩大到全局测试环境重构。

## Validation Strategy

- `openspec validate migrate-application-access-center-to-typescript --strict`
- `openspec validate --changes --strict`
- `openspec validate --specs --strict`
- `git diff --check`
- `cd web-admin; node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`
- `cd web-admin; yarn typecheck`
- `cd web-admin; yarn test --watchAll=false --runInBand --coverage --collectCoverageFrom=src/ApplicationAccessCenter.tsx --runTestsByPath src/ApplicationAccessCenter.test.tsx`
- `cd web-admin; yarn build`
