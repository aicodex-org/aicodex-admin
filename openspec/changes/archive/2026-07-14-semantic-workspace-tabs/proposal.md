## Why

工作页标签当前直接复用菜单名称。管理员同时打开列表和多个对象编辑页时，多个标签都会显示为“接入中心”等相同名称，无法在标签栏中快速识别正在编辑的对象。

## What Changes

- 为已纳入工作页标签的对象编辑路由提供语义化标题：列表页保持现有菜单名称，编辑页显示编辑语义和对象标识。
- 对应用、组织、证书等已接入详情加载链路的编辑页，在详情数据加载后使用显示名称更新标签；加载前继续使用路由中的对象标识，避免空标题。
- 对自身具有 `displayName` 和稳定详情加载链路的低风险对象编辑页逐批接入同一规则；不以页面 DOM 或 Shell 推断业务名称。
- 对已接入显示名称的编辑页，页内标题与工作页标签使用相同的显示名称优先规则，避免同一对象在同一界面出现两套主标识。
- 为对象详情路由声明精确匹配深度，避免购买、支付、结果等非编辑子页被误标为编辑页。
- 列表页按导航 route 复用同一工作页标签；已存在对象和新增草稿均按其唯一编辑路径保留独立标签，避免覆盖未保存内容或隐藏服务端草稿。
- 统一桌面标签、移动端当前页标题及“更多工作页面”菜单使用同一标签标题。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `admin-enterprise-identity-console-shell`: 调整 route-driven workspace tabs 对对象编辑路由及动作子路由的标题派生要求。

## Impact

- 影响 `web-admin/src/common/workspaceTabState.ts`、`web-admin/src/enterpriseNavigation.tsx`、应用、组织、证书编辑页及其聚焦测试。
- 不修改后端 API、认证、权限、侧边菜单结构、路由 path、sessionStorage 格式或对象编辑表单逻辑。
