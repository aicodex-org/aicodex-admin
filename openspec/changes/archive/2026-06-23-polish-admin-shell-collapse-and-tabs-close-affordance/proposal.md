## Why

用户验收截图显示 Admin 身份控制台 Shell 的几个 affordance 层级仍不清楚：侧边栏收起/展开按钮放在全局 header 品牌区，标签栏每个标签常驻关闭按钮造成噪声，侧边栏父子选中态同时使用强紫色左条导致重复强调。

本 change 将这些 UI polish 纳入 OpenSpec active change，便于用户先验收效果，并在同一 change 内继续提出调整意见。

## What Changes

- 将桌面侧边栏收起/展开按钮从全局 header 移到侧边栏内部，保持展开态和收起态都可达。
- 标签栏新增标签栏级关闭菜单，提供 `关闭当前`、`关闭其他`、`关闭所有`。
- 单标签关闭按钮保留可访问性和 active/hover/focus 状态，但非活动标签默认不再常驻醒目关闭按钮。
- 降低侧边栏父级菜单选中态权重，当前子项作为主要选中态，父级只保留轻量归属提示。
- 保留现有 icon、路由、API、权限过滤、移动端 Drawer 降级、workspace tabs fallback 和 collapsed 子菜单可达性。
- 不触碰 `test`、生产/类生产配置、认证链路、后端接口或数据模型。

## Capabilities

### New Capabilities

- 无。

### Modified Capabilities

- `admin-enterprise-identity-console-shell`: 调整桌面侧栏切换控件归属、workspace tabs 关闭入口层级和侧边栏选中态视觉契约。

## Impact

- 代码：`web-admin/src/ManagementPage.js`、`web-admin/src/common/WorkspaceTabs.tsx`、`web-admin/src/App.less`。
- 测试：`web-admin/src/ManagementPage.shell.test.tsx`、`web-admin/src/common/WorkspaceTabs.test.tsx`。
- OpenSpec：新增当前 active change 的 proposal、design、tasks、spec delta 和 verification。
- 无后端、API、路由、权限、数据模型或依赖变更。
