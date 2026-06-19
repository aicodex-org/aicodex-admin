## MODIFIED Requirements

### Requirement: 后续新增代码约定
Admin 前端后续新增 React 组件 SHALL 默认使用 `.tsx`；新增共享逻辑、接口模型和类型定义 SHALL 默认使用 `.ts`；既有 JS SHALL 只在被需求触及时渐进迁移。

#### Scenario: 应用接入中心低风险入口迁移
- **WHEN** 后续 change 触碰“应用接入”菜单下低风险只读 React 区块，例如 `/applications` 中的 `ApplicationAccessCenter`
- **THEN** 该区块 SHOULD 迁移为 `.tsx` 并使用明确局部类型描述 props、应用记录、Provider 绑定和派生展示状态
- **AND** 对应 React 测试 SHOULD 使用 `.test.tsx`
- **AND** 迁移 SHALL 保持现有路由、权限、接口、文案、页面行为、链接和敏感信息脱敏逻辑
- **AND** 迁移 SHALL NOT 要求同一 change 迁移承载它的历史 JS 列表页、编辑页、资源、证书、密钥、API 网关映射或 Webhook 页面
