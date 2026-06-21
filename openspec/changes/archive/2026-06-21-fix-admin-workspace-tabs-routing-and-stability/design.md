# Design

## 目标

- 使用现有 `enterpriseNavigation` 派生的 `WorkspaceRouteItem[]` 作为唯一有效 tab route 来源，避免维护第二套路由白名单。
- 在 `workspaceTabState.ts` 内集中处理持久化恢复、打开、关闭和可见标签拆分规则，Shell 组件只负责渲染和回调。
- 通过测试证明历史坏数据不会生成标签、点击/重复打开不重排、关闭当前页按右侧/左侧/总览 fallback 稳定切换。

## 非目标

- 不恢复或新增“快捷访问”入口。
- 不新增一级菜单、抽象中心或业务页面。
- 不重构表格列、行操作按钮、认证/OIDC、Gateway、Provider 或后端行为。
- 不对真实环境、DB、OAuth/OIDC 回调、同步或 Gateway projection 触发写链路。

## 方案

### 有效路由判定

- `findWorkspaceRoute(path, routes)` 继续作为 route 是否可被 workspace tabs 接纳的判定来源。
- 新增或内联 `isValidWorkspacePath` 规则：
  - `normalizeWorkspacePath(path)` 后必须匹配 `routes` 中某个 route。
  - `/404`、未知 path、旧 `/shortcuts` 等不可见/未注册路径不匹配则丢弃。
  - `/` 总览始终由 route metadata 或 fallback overview route 支撑。
- `hydrateWorkspaceTabs` 对 persisted `paths` 先去重、过滤无效，再调用打开逻辑加入当前有效 route；如果历史标签全无效，回退到总览加当前有效 route。
- `openWorkspaceTab` 对当前 path fail-closed：如果当前 path 不匹配 route，则不生成未知标签，只返回已过滤的标签集合；当没有非固定标签时保留总览。

### 顺序与关闭规则

- `openWorkspaceTab` 对已存在 path 返回原数组顺序，只刷新 route label/fixed/closable metadata，不先删除再 append。
- 对新 route 按打开顺序追加到末尾；`ensureOverviewFirst` 保证总览固定在最左。
- `closeWorkspaceTab` 关闭当前标签时先尝试目标 index 位置上的右侧标签；没有右侧时使用左侧标签；再没有则回到 `/`。

### 视觉与可访问性

- `WorkspaceTabs` 继续使用 button 和 aria-label。
- 标签文字保持 `min-width: 0`、`text-overflow: ellipsis`，关闭按钮和标签 label 补充 hover/focus-visible 状态。
- 标签栏高度、border/gutter 固定，不因 active/hover/click 改变高度。

## 验证计划

- 先写 `workspaceTabState.test.ts` 失败测试：
  - 恢复 `/404`、`/shortcuts`、未知 path 时过滤。
  - 混合有效/无效持久化只保留有效 tabs。
  - 点击/再次打开已有 route 不改变 tabs 顺序。
  - 关闭当前标签优先激活右侧，否则左侧，否则 `/`。
- 视样式和 aria 变化补 `WorkspaceTabs.test.tsx`。
- 运行：
  - `openspec validate fix-admin-workspace-tabs-routing-and-stability --strict`
  - `openspec validate --changes --strict`
  - `openspec validate --specs --strict`
  - `git diff --check`
  - `cd web-admin; node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`
  - `cd web-admin; yarn typecheck`
  - focused Jest with coverage for workspace tabs
  - `cd web-admin; yarn build`
  - 浏览器桌面和移动抽样验证；若本地浏览器或 dev server 阻塞，记录 blocker 和替代证据。
