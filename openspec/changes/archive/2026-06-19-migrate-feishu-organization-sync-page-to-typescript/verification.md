## 验证记录

本 change 只迁移飞书组织同步前端页面、backend client 和主页面测试到 TS/TSX；所有测试均使用 mock backend client，未读取真实 Feishu/Lark secret，未调用真实 Contact v3，未触发真实租户同步。

## 命令结果

- `openspec validate migrate-feishu-organization-sync-page-to-typescript --strict`：通过。
- `openspec validate --changes --strict`：通过，5 个 active changes 全部通过。
- `openspec validate --specs --strict`：通过，26 个主规格全部通过。
- `git diff --check`：通过。
- `cd web-admin; node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`：通过。
- `cd web-admin; yarn typecheck`：通过。
- `cd web-admin; CI=true yarn test --watchAll=false --runTestsByPath src/FeishuOrganizationSyncPage.test.tsx src/FeishuOrganizationSyncPageTenantTarget.test.tsx src/backend/FeishuOrganizationSyncBackend.test.js`：通过，3 个 test suites / 37 个 tests 通过。
- `cd web-admin; CI=true yarn test --watchAll=false --coverage --collectCoverageFrom=src/FeishuOrganizationSyncPage.tsx --collectCoverageFrom=src/backend/FeishuOrganizationSyncBackend.ts --runTestsByPath src/FeishuOrganizationSyncPage.test.tsx src/FeishuOrganizationSyncPageTenantTarget.test.tsx src/backend/FeishuOrganizationSyncBackend.test.js`：通过。
- `cd web-admin; yarn build`：通过；保留既有 bundle size warning。

## Coverage 口径

- `src/backend/FeishuOrganizationSyncBackend.ts`：statements 100%，branches 63.33%，functions 100%，lines 100%。
- `src/FeishuOrganizationSyncPage.tsx`：statements 86.46%，branches 72.63%，functions 80.39%，lines 86.35%。

页面整文件 coverage 已达到 85% 门槛。新增测试覆盖配置保存/连接失败、刷新失败、辅助诊断失败、组织切换状态清理、运行中轮询、preview/save/test 失败分支、fallback label、handoff checklist 渲染与复制/导出 fallback 等 operator 可观察行为；未为了覆盖率添加只覆盖行号的低价值断言。

## 既有测试/构建 warning

- 聚焦 Jest 存在既有 `ReactDOM.render is no longer supported in React 18`、Ant Design/rc-motion `act(...)` 和 jsdom `window.computedStyle(elt, pseudoElt)` console warning；命令退出码为 0，所有断言通过。
- `yarn build` 存在既有 bundle size、Browserslist outdated 和 Node `fs.F_OK` deprecation warning；构建成功并完成 `build-temp` 到 `build` 的移动。

## 证据层级

- 单元/组件层：聚焦 Jest 覆盖飞书页面主流程、租户目标组织推导和 backend client URL/payload 行为。
- 类型层：`yarn typecheck` 覆盖 TS/TSX 类型边界。
- 构建层：`yarn build` 覆盖 CRACO/ESLint/production bundle。
- OpenSpec 层：target change、active changes 和主规格 strict validate 全部通过。
- 运行态/provider 层：未验证真实飞书租户、真实 Contact v3 scope 或真实同步结果；本 change 不包含运行态 provider 验收。
