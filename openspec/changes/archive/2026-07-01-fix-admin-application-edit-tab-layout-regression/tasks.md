# Tasks

- [x] 1. 确认基线与复现：读取近期 `stabilize-admin-large-edit-form-layout` 对 `ApplicationEditPage.tsx`、`App.less` 的改动，浏览器复现 Provider tab 窄列和 UI Customization tab 白屏，并记录错误栈或 DOM 证据。
- [x] 2. 写回归测试 RED：覆盖 Provider tab/full-width 内容不携带主字段 row 布局 hook，以及 UI Customization tab 可切换渲染不崩。
- [x] 3. 修复根因：将应用编辑页主字段 Row 与 tab/nested full-width Row 明确分离，收窄 scoped CSS 或 class hook，不使用全局 AntD 覆盖硬糊。
- [x] 4. 运行聚焦 Jest，确认回归测试从失败转为通过，并检查既有大编辑页 `.content-warp-card`/布局测试不回退。
- [x] 5. 运行浏览器 smoke：切换 `提供商` 与 `界面定制`，断言无白屏/webpack overlay、Provider 内容宽度合理、无页面级水平溢出，并将脱敏证据保存到 `output/playwright`。
- [x] 6. 运行门禁：`openspec validate fix-admin-application-edit-tab-layout-regression --strict`、`git diff --check origin/hfl-test-base..HEAD`、聚焦 Jest、`yarn typecheck`、`node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`、`yarn build`。
- [x] 7. 更新 `verification.md`，完成归档前 review，并准备进入 archive 与 self-closeout。
