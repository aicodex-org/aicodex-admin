## ADDED Requirements

### Requirement: 应用接入中心保留通用接入职责
`/applications` 应用接入中心 SHALL 保留通用 Application、OAuth/OIDC、API 映射和 Provider 接入入口职责；用量链路服务凭据治理内容 MAY 被独立 `用量接入` 页面承接，但应用接入中心不得因此扩成泛配置中心或破坏既有 Application 列表工作流。

#### Scenario: 应用接入中心仍展示通用入口
- **WHEN** 管理员打开 `/applications`
- **THEN** 页面 SHALL 继续展示 Application 列表、接入完整度摘要、通用配置缺口和 Application 新增、复制、编辑、删除入口
- **AND** 页面 SHALL 继续提供 API 映射、OAuth/OIDC Provider、资源、证书、密钥、Webhook 和审计记录等既有入口
- **AND** 页面 SHALL NOT 渲染 `服务凭据治理` 摘要、状态或入口卡片；`/application-usage-access` 仅通过 `应用接入` 分组二级导航进入

#### Scenario: 用量链路治理从中心页降噪
- **WHEN** 页面需要展示 Insight provider trust、Usage identity resolver、Gateway organization projection 或 keep-in-env/config 治理内容
- **THEN** `/applications` SHALL NOT 请求或渲染服务凭据治理运行态状态
- **AND** 详细治理摘要、状态、诊断或交接包内容 SHALL 在 `/application-usage-access` 聚焦页承接
- **AND** 应用接入中心 SHALL NOT 新增与用量链路相关或无直接关系的泛服务凭据配置区
