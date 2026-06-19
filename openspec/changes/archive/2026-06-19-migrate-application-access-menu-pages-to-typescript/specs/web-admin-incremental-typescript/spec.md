## ADDED Requirements

### Requirement: 应用接入二级菜单页面渐进迁移
Admin 前端 SHALL 支持将“应用接入”一级菜单下的二级菜单落地页按渐进 TypeScript 路线迁移为 `.tsx`，并保持现有路由、权限、接口、文案、页面行为、敏感信息脱敏和 JS/TS 共存边界兼容。

#### Scenario: 应用接入二级菜单落地页迁移
- **WHEN** 开发者迁移“应用接入”一级菜单下的二级菜单落地页
- **THEN** `/applications`、`/resources`、`/certs`、`/keys`、`/platform-api-mappings`、`/webhooks`、`/webhook-events` 对应页面 SHOULD 使用 `.tsx`
- **AND** 已经是 TSX 的 `/access-wizard` 页面 SHALL 保持现有 TSX 路由和行为
- **AND** 迁移 SHALL NOT 要求同一 change 迁移应用、证书、密钥或 Webhook 编辑页

#### Scenario: 页面行为和运行边界保持不变
- **WHEN** 应用接入二级菜单页面迁移为 TSX
- **THEN** 迁移 SHALL 保持原有 `ManagementPage` 路由、菜单 key、权限可见性、分页、筛选、排序、表格列、操作按钮和后端 API 调用契约
- **AND** 迁移 SHALL NOT 修改认证/OIDC、Provider、Gateway projection、真实密钥、生产配置或类生产配置
- **AND** 页面 SHALL NOT 新增展示 client secret、token、Webhook secret、私有回调 payload 或其它敏感字段原值

#### Scenario: 迁移测试和验证
- **WHEN** 应用接入二级菜单页面迁移完成
- **THEN** 本次触碰且包含 JSX 的测试 SHOULD 使用 `.test.tsx`
- **AND** 迁移 SHALL 运行增量 TypeScript gate、`yarn typecheck`、focused Jest coverage 和 `yarn build`
- **AND** 覆盖率记录 SHALL 以 touched production files 或等价受影响文件集合为统计对象
