## 验证摘要

本 change 修改 LLM AI / Gateway 编辑页的 scoped class hook 与内部表单布局样式，不修改 API、保存 payload、路由、权限或 Gateway projection 行为。验证证据按源码/构建/浏览器布局层级记录，不声明真实后端链路已通过。

## 命令验证

- `openspec validate stabilize-admin-gateway-edit-form-layout --strict`：通过，目标 change 有效。
- `openspec validate --changes --strict`：通过，4 个 active changes 全部有效。
- `openspec validate --specs --strict`：通过，30 个主规格全部有效。
- `git diff --check origin/hfl-test-base...HEAD`：通过，无 whitespace error。
- `web-admin > node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`：通过，无新增 JS/JSX 或 TS 稳态回退。
- `web-admin > yarn typecheck`：通过，`tsc --noEmit` 退出码 0。
- `web-admin > yarn test --watchAll=false AgentEditPage.test.tsx EntryEditPage.test.tsx ServerEditPage.test.tsx SiteEditPage.test.tsx RuleEditPage.test.tsx`：通过，5 个 suite、56 个测试全部通过。
- `web-admin > yarn build`：通过，生产构建成功并生成 `web-admin/build`；命令输出包含既有 `Browserslist: caniuse-lite is outdated` 和 bundle size 提示。

## TDD 证据

- RED：新增 scoped layout hook 测试后，目标 5 个 suite 均因找不到 `.admin-gateway-edit-page` 失败；既有 51 个行为断言通过。
- GREEN：增加页面/卡片/字段行 hook 与 scoped CSS 后，同一聚焦 Jest 命令通过，56/56 测试通过。

## 浏览器 Smoke

- 使用 Playwright CLI 在本地脱敏 fixture DOM 上截图验证布局，不访问真实后端、不使用真实账号、token、Cookie 或完整私有 URL。
- 桌面 1280px：主编辑卡片内 label 列稳定，长 label 自动换行，control 列占满剩余宽度，目视未见页面级横向 overflow。
- 窄屏 640px：label 与 control 自动上下换行，输入框宽度受容器约束，目视未见页面级横向 overflow。
- 本 smoke 只证明本次 scoped CSS 的浏览器布局契约，不证明真实 API、权限或 Gateway projection 运行态链路。

## 覆盖率口径

- 未单独运行 coverage。依据 `web-admin/AGENTS.md`，普通 UI class/style 布局任务不默认要求 coverage；本 change 的实施代码风险由聚焦 Jest 契约测试、typecheck、build 和浏览器 smoke 覆盖。

## 剩余风险

- 浏览器 smoke 使用 fixture DOM，而非登录态真实页面；若真实后端数据包含异常长字段或子组件内部极端内容，仍需后续真实环境 UI 巡检。
- `App.less` 与并行 Admin-0 change 可能存在文本冲突，closeout 前需要 fetch/rebase 最新 `origin/hfl-test-base` 并重新跑关键验证。
