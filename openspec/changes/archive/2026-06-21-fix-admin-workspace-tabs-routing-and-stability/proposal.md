## Why

60/Admin 视觉核对发现身份控制台多标签工作区存在两个 P0 问题：历史或无效路由可恢复为 `/404` 标签，且点击/再次打开已有标签时标签顺序不稳定。多标签是 Shell 层的工作流状态，如果允许 404、旧快捷访问路径或未知路径进入持久化状态，会让管理员误以为这些页面是可用工作区；如果激活已有标签会重排，会破坏用户对打开顺序和关闭相邻行为的预期。

本 change 只修复 workspace tabs 的路由恢复、顺序稳定、关闭行为和轻量视觉/可访问性，不重构表格字段、行操作按钮、后端、认证/OIDC、Gateway 或 Provider 行为。

## What Changes

- 从现有企业导航 route metadata 派生有效 workspace tab 白名单，恢复和打开标签时 fail-closed 过滤未知 path、`/404`、旧快捷访问路径和空 path。
- 保持标签打开顺序稳定：点击已有标签或再次打开已有 route 只激活，不移动标签位置；总览固定在最左。
- 调整关闭当前标签后的相邻切换规则：优先右侧，否则左侧，否则默认总览。
- 轻量打磨标签栏 active、hover、focus-visible、关闭按钮和长文本截断状态，不改变页面业务布局。
- 增加聚焦单测、覆盖率、typecheck/build 和浏览器验证记录。

## Capabilities

### Modified Capabilities

- `admin-enterprise-identity-console-shell`: 收紧 workspace tabs 的有效路由恢复、顺序稳定、关闭相邻和视觉可访问性要求。

## Impact

- 预计修改 `web-admin/src/common/workspaceTabState.ts`、其测试、`WorkspaceTabs.tsx` 或 `App.less` 的小范围样式。
- 不修改后端接口、认证/OIDC、Gateway projection、Provider contract、数据库、真实运行环境或 `test` 分支。
- 表格字段技术化和行操作按钮过重只记录为后续候选任务，不在本 change 展开。
