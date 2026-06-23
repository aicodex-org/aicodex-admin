## 1. Implementation

- [x] 将桌面侧边栏收起/展开按钮移动到 `Sider` 内部，并保持 expanded/collapsed 可达。
- [x] 增加 workspace tabs 标签栏级关闭菜单，支持关闭当前、关闭其他、关闭所有。
- [x] 将单标签关闭按钮改为 active 默认显示、inactive hover/focus 显示，保留 aria-label。
- [x] 降低侧边栏父级 selected 样式权重，子项保持主要选中态。
- [x] 保持移动端 Drawer 和 workspace tabs 降级行为不变。
- [x] 将标签栏级关闭入口收敛为 icon-only 按钮，不显示 `关闭` 文案。
- [x] 登录后管理台 Shell 去掉可见底部 `Powered by` footprint，并保留隐藏账号桥接字段。
- [x] 将 workspace tabs 左右滚动步长调整为更小段距，避免常见桌面宽度下一次点击直接跳到两端。
- [x] 将登录后 Shell 高度限定在视口内，侧栏菜单独立纵向滚动，侧栏收起/展开按钮固定在侧栏底部。
- [x] 简化 workspace tabs 与内容区域之间的色带层级，仅保留细分隔线。
- [x] 降低非 active 标签、滚动箭头和全局关闭入口的常态视觉权重，保留 active 标签焦点。
- [x] 禁用侧栏展开/收起期间的布局动画，避免 AntD Sider/Menu transition 不同步造成闪烁。
- [x] 统一 legacy `content-warp-card` 页面与新版身份控制台页面在 workspace tabs 下方的内容边界。
- [x] 进一步降低 active workspace tab 选中态和 active 单标签关闭按钮的常态权重。
- [x] 压缩 desktop workspace tabs 高度，保持移动端降级可达性不变。
- [x] 同步收紧 desktop tabs 下方内容区起始边距，保持新旧承载页一致。

## 2. Tests

- [x] 更新 `ManagementPage.shell.test.tsx` 覆盖 header 不再承载侧栏切换、Sider 内部有切换按钮。
- [x] 更新 `WorkspaceTabs.test.tsx` 覆盖全局关闭菜单、active/deferred 关闭按钮状态和原有 fallback。
- [x] 更新 `WorkspaceTabs.test.tsx` 覆盖 icon-only 全局关闭入口和更小滚动步长。
- [x] 完成浏览器 desktop/mobile smoke 并记录截图或预览 URL。

## 3. Validation

- [x] 运行 focused Jest：`yarn test --watchAll=false src/common/WorkspaceTabs.test.tsx src/ManagementPage.shell.test.tsx`。
- [x] 运行增量 TS gate：`node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`。
- [x] 运行 `yarn typecheck`。
- [x] 运行 `yarn build`。
- [x] 运行 `git diff --check`。
- [x] 运行 OpenSpec current change / changes / specs strict validate。
- [x] 写 release-candidate report 并回传 `needs_user_review=true`、`lease_release=false`、`push_test=false`。
- [x] 复查 `/webhook-events`、`/`、`/users` 等新旧承载页的 tabs 下方边界一致性。
