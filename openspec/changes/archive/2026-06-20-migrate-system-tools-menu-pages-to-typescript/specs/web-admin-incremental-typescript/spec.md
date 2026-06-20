## ADDED Requirements

### Requirement: 管理工具菜单页面渐进迁移
Admin 前端 SHALL 支持将“管理工具”一级菜单下的系统信息、表单和工单页面按渐进 TypeScript 路线迁移为 `.tsx`，并保持现有路由、权限、接口、文案、页面行为、动态表单字段逻辑和 JS/TS 共存边界兼容。

#### Scenario: 管理工具 React 页面迁移
- **WHEN** 开发者迁移“管理工具”一级菜单下的 React 页面
- **THEN** `/sysinfo`、`/forms`、`/forms/:formName`、`/tickets`、`/tickets/:organizationName/:ticketName` 对应页面 SHALL 使用 `.tsx`
- **AND** 迁移 SHALL NOT 要求同一 change 迁移 `FormBackend`、`TicketBackend`、`SystemInfo` backend client、`BaseListPage`、`FormItemTable`、`PrometheusInfoTable`、`ToolTable`、`Setting` 或其它动态表单使用方

#### Scenario: API 文档外链保持不变
- **WHEN** 管理工具菜单页面迁移为 TSX
- **THEN** `/swagger` SHALL 保持为现有 `enterpriseNavigation` 配置承载的外部导航入口
- **AND** 迁移 SHALL NOT 为 API 文档创建新的 React 页面或路由实现
- **AND** `/swagger` 的本地和非本地 URL 计算 SHALL 保持现有 `Setting.isLocalhost()` 分支行为

#### Scenario: 页面行为和运行边界保持不变
- **WHEN** 管理工具页面迁移为 TSX
- **THEN** 迁移 SHALL 保持原有 `ManagementPage` 路由、菜单 key、权限可见性、分页、筛选、排序、表格列、操作按钮、轮询清理、表单预览、工单消息和后端 API 调用契约
- **AND** 迁移 SHALL NOT 修改认证/OIDC、Gateway、真实密钥、生产配置或类生产配置
- **AND** 页面 SHALL NOT 新增展示 token、secret、Cookie、私有 URL 或其它敏感字段原值

#### Scenario: 迁移测试和验证
- **WHEN** 管理工具页面迁移完成
- **THEN** 本次触碰且包含 JSX 的测试 SHALL 使用 `.test.tsx`
- **AND** 迁移 SHALL 运行增量 TypeScript gate、`yarn typecheck`、focused Jest coverage 和 `yarn build`
- **AND** 覆盖率记录 SHALL 以 touched production files 或等价受影响文件集合为统计对象
