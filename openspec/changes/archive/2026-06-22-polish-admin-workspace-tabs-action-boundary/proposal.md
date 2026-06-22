## Why

Admin 身份控制台桌面 workspace tabs 已经具备固定总览、横向滚动、左右滚动按钮和常驻 `关闭` 菜单，但当前右侧工具区与滚动标签区视觉距离较近。管理员在多标签密集场景下容易把 `>` 滚动按钮或 `关闭` 操作误读为当前 active tab 的延续。

本 change 只修右侧工具区的视觉边界和密度，不改变 workspace tabs 的交互模型。

## What Changes

- 强化桌面 workspace tabs 的三段式视觉分组：固定总览、滚动标签区、右侧工具区。
- 让右侧工具区通过间距、分隔线、浅背景、稳定尺寸和低噪按钮样式，与 active tab 区分开。
- 保留桌面左/右滚动按钮，并保持 `关闭` 菜单与标签导航同级可见。
- 保持移动端现有“当前页 + 更多”紧凑模式。

## Non-Goals

- 不新增桌面 `More` / `...` overflow 模型。
- 不把 `关闭当前`、`关闭其他`、`关闭所有` 藏进新的 `...` 操作层级。
- 不修改 workspace tab 状态逻辑、route allowlist、sessionStorage 恢复、关闭规则或移动端交互。
- 不修改服务凭据治理、API/Gateway/Insight、认证/OIDC、后端接口或数据库。
- 不 touch、merge 或 push `test`。

## Impact

- 主要影响 `web-admin/src/common/WorkspaceTabs.tsx`、`web-admin/src/common/WorkspaceTabs.test.tsx` 和 `web-admin/src/App.less`。
- 需要聚焦 Jest、typecheck、build 和浏览器 smoke 验证桌面/移动边界。
