## Context

当前前端样式已经经历两轮收敛：列表页统一到 `web-admin/src/styles/list-pages.less`，大型编辑页统一到 `web-admin/src/styles/large-edit-pages.less`。这减少了 `App.less` 的直接压力，但三个文件仍分别承载过多页面级职责：

- `App.less` 混合全局 shell、工作区 tabs、身份控制台页面、同步/审计/系统信息等页面样式、响应式规则和登录页样式。
- `list-pages.less` 混合列表公共壳、组织/群组/用户列表、应用/Provider 列表、查询 toolbar 和移动端规则。
- `large-edit-pages.less` 混合编辑壳公共原子、组织/用户/应用、群组/角色/权限以及兼容型编辑页样式。

这次 change 的性质是工程整理，不改变用户可见能力。

## Goals / Non-Goals

**Goals:**

- 将后台页面样式拆成按职责命名的 Less 模块，降低单文件定位成本。
- 保持现有 selector、页面作用域 class、DOM 结构和 cascade 结果稳定。
- 保留 `styles/identity-console-pages.less`、`styles/list-pages.less` 与 `styles/large-edit-pages.less` 作为聚合入口，减少调用方和测试心智变化。
- 更新样式 contract 测试和迁移指南，说明后续新增样式应写入哪个模块。

**Non-Goals:**

- 不做视觉 polish，不调整颜色、间距、字号、按钮尺寸或表格密度。
- 不重命名 `.organization-edit-*`、`.user-edit-*`、`.enterprise-list-*` 等既有 selector。
- 不把业务页面样式抽成新 React 组件。
- 不迁移业务 JS/TS，不修改 API、权限、保存 payload、i18n 文案或路由。

## Decisions

1. `App.less` 改为顶层聚合入口。
   - 拆出 `styles/admin-shell.less`：全局 theme token、后台 header/sidebar/content、workspace tabs、通用 page scroll shell。
   - 拆出 `styles/identity-console-pages.less`：身份控制台和相关后台工作页的聚合入口。
   - `styles/identity/` 按连续页面族拆分身份控制台样式，包括概览/共享控制台、Server Store、接入中心工作流、应用接入凭据、审计治理和向导、组织同步、系统信息、平台运维和证据链。
   - 拆出 `styles/admin-responsive.less`：当前 `App.less` 尾部跨页面响应式规则。
   - 拆出 `styles/login-pages.less`：登录页和登录背景样式。
   - 保持 import 顺序等同原始声明顺序，避免 cascade 变化。

2. `list-pages.less` 保留为列表样式聚合入口。
   - 子模块放在 `styles/list/`。
   - 建议按公共列表壳、组织/用户类列表、应用/Provider 类列表、查询 toolbar/移动端规则拆分。
   - 不改变 `.enterprise-list-*`、`.group-*`、`.user-*`、`.application-*`、`.provider-*` selector。

3. `large-edit-pages.less` 保留为编辑页样式聚合入口。
   - 子模块放在 `styles/edit/`。
   - 建议按公共编辑壳与 mixin、组织编辑、身份对象/权限/群组、用户编辑、应用与兼容编辑页拆分。
   - 不改变页面专属 selector，避免影响 AntD 覆盖边界。

4. 验证以“模块化不改变行为”为主。
   - Less 编译和构建必须通过。
   - 样式 contract 测试应确认聚合入口和关键模块存在。
   - 对 UI 行为只做轻量 smoke 或已有视觉 contract 检查，不把本 change 扩展成新视觉验收。

## Risks / Trade-offs

- [Risk] 机械拆分改变 import 顺序导致视觉回归 → 按原文件顺序拆分，并通过构建、聚焦测试和浏览器 smoke 验证。
- [Risk] 过度拆文件导致定位更复杂 → 聚合入口保留旧文件名，子模块按页面域命名，不拆到单个组件粒度。
- [Risk] 后续开发者不知道写到哪里 → 更新迁移指南，说明公共壳、列表页、编辑页和页面私有样式的归属。
