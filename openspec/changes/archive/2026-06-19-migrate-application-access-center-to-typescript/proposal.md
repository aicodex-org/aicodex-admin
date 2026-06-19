## Why

“应用接入”菜单下的 `ApplicationAccessCenter` 是只读摘要入口，已有聚焦测试覆盖脱敏、空态、加载态和链接行为，适合作为应用接入区域渐进 TypeScript 迁移的第一步。

本 change 通过低风险 TSX 迁移验证 `.js` 列表页与 `.tsx` 摘要组件共存，为后续资源、证书、密钥、API 网关映射和 Webhook 页面迁移提供可复用节奏。

## What Changes

- 将 `web-admin/src/ApplicationAccessCenter.js` 迁移为 `ApplicationAccessCenter.tsx`。
- 将对应 React 测试 `ApplicationAccessCenter.test.js` 迁移为 `ApplicationAccessCenter.test.tsx`。
- 为组件 props、应用记录、Provider 绑定、摘要指标、卡片和风险项补充局部 TypeScript 类型。
- 保持现有路由、权限、接口、可见文案、页面行为、链接和敏感信息脱敏逻辑不变。
- 不迁移 `ApplicationListPage.js`、应用编辑页、资源、证书、密钥、API 网关映射、Webhook 页面或后端接口。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `web-admin-incremental-typescript`: 增加“应用接入中心”作为应用接入菜单低风险入口 TSX 迁移的约束和验证场景。

## Impact

- 前端：仅触碰 `web-admin/src/ApplicationAccessCenter.*` 文件和必要的导入类型；承载它的 `ApplicationListPage.js` 保持现状。
- 测试：聚焦 Jest 测试迁移到 `.test.tsx`，继续覆盖摘要推导、脱敏、空态、加载态和现有链接。
- OpenSpec：新增本 change 的 proposal/design/tasks/spec delta，归档后更新 `web-admin-incremental-typescript` 主规格。
- 不影响后端 API、数据库、认证/OIDC、Provider contract、Gateway projection、密钥或生产/类生产配置。
