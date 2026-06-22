## 1. OpenSpec 与范围

- [x] 1.1 创建 `polish-admin-workspace-tabs-scroll-and-close-actions` change artifacts，并将范围锁定为桌面多标签滚动与关闭管理
- [x] 1.2 完成 implementation-ready review，确认不触碰移动端标签模式、不触碰业务页和后端链路

## 2. 标签状态逻辑

- [x] 2.1 以 TDD 为 `workspaceTabState.ts` 补充批量关闭逻辑：关闭当前、关闭其他、关闭所有
- [x] 2.2 保证固定总览标签始终保留，关闭全部后回到 `/`
- [x] 2.3 保持现有标签打开顺序稳定，重新激活时不重排

## 3. 桌面标签组件

- [x] 3.1 以 TDD 调整 `WorkspaceTabs.tsx`，实现固定总览 + 中间滚动区 + 右侧常驻关闭菜单
- [x] 3.2 为滚动区补充左右箭头，且仅在对应方向存在可滚动内容时显示
- [x] 3.3 当前激活标签切换时自动滚入可视区
- [x] 3.4 保持移动端当前“当前页 + 更多”降级模式不变

## 4. Shell 接线与样式

- [x] 4.1 在 `ManagementPage.js` 接入关闭当前/其他/所有动作，保持现有 sessionStorage 持久化
- [x] 4.2 调整 `App.less`，保证固定标签、滚动标签和关闭菜单的布局稳定
- [x] 4.3 保持现有 Admin 字体、字号、按钮高度和分隔层级，不引入新的大字号体系

## 5. 验证与收口

- [x] 5.1 运行 `openspec validate polish-admin-workspace-tabs-scroll-and-close-actions --strict`
- [x] 5.2 运行 `openspec validate --changes --strict`、`openspec validate --specs --strict`、`git diff --check`
- [x] 5.3 运行 `cd web-admin; node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`
- [x] 5.4 运行 `cd web-admin; yarn typecheck`
- [x] 5.5 运行聚焦 Jest/coverage，覆盖 `WorkspaceTabs` 与 `workspaceTabState`
- [x] 5.6 运行 `cd web-admin; yarn build`
- [x] 5.7 做桌面浏览器验证，确认滚动箭头显隐、常驻关闭菜单和固定标签保留行为
- [x] 5.8 完成 pre-archive review、archive、单 commit closeout 和最终 report
