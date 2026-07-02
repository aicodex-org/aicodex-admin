## ADDED Requirements

### Requirement: 钉钉组织同步前端使用 TypeScript
Admin 前端 SHALL 按当前 TypeScript/TSX 稳态规则实现钉钉组织同步页面、API 模型和测试。

#### Scenario: 新增钉钉同步页面使用 TSX
- **WHEN** 钉钉组织同步页面新增到 `web-admin/src`
- **THEN** 页面 SHALL 是 `.tsx` 组件
- **AND** 包含 JSX 的新增业务测试 SHALL 使用 `.test.tsx`

#### Scenario: 新增钉钉同步请求封装使用 TS
- **WHEN** 新增钉钉组织同步请求/响应模型或后端辅助模块
- **THEN** 它们 SHALL 是 `.ts` 文件，并使用明确的局部 interfaces
- **AND** SHOULD 避免无解释的 `any`

#### Scenario: 钉钉前端变更验证
- **WHEN** 钉钉组织同步前端实现准备交付
- **THEN** 聚焦 Jest 测试、`yarn typecheck` 和增量 TypeScript gate SHALL 对触达的 TS/TSX 路径通过
