## MODIFIED Requirements

### Requirement: 认证源中心工作区
Admin 企业认证中心 SHALL 在认证源分组下提供紧凑的认证源中心工作区，使管理员能够从 `/providers` 首屏扫描企业微信、飞书、OIDC 等认证源的接入状态、同步/授权风险和 Provider 列表操作。

#### Scenario: 管理员打开认证源中心
- **WHEN** 已登录管理员访问 `/providers`
- **THEN** 页面展示认证源中心标题、接入诊断条和企业微信、飞书、OIDC 的关键状态
- **AND** 页面仍展示既有 Provider 列表和新增/编辑入口
- **AND** Provider 列表或列表入口在 1440x900 桌面首屏内可感知

#### Scenario: 认证源中心展示控制台结构
- **WHEN** 管理员访问 `/providers`
- **THEN** 页面 SHALL 使用紧凑接入诊断结构展示认证源摘要、配置完整度、同步/授权诊断、失败摘要和配置入口
- **AND** 页面 SHALL NOT 在 Provider 列表前堆叠多层说明卡、入口卡和风险卡
- **AND** 页面 SHALL 明确该状态是只读核对，不触发同步、授权刷新或真实探测

#### Scenario: 认证源列表仍可操作
- **WHEN** 管理员在认证源中心查看 Provider 表格
- **THEN** 既有 Provider 分页、筛选、新增、编辑和删除行为保持可用
- **AND** 认证源中心不得改变 Provider 表格的路由、权限 key 或数据写入行为

#### Scenario: TSX 迁移保持行为兼容
- **WHEN** 认证源中心从 JavaScript 迁移为 TSX
- **THEN** `/providers` 路由、Provider 列表加载、表格操作、配置入口和同步诊断链接 SHALL 保持现有行为兼容
- **AND** 迁移 SHALL NOT 触发后端写入、组织同步、OAuth/OIDC 授权、真实 provider 探测或权限模型变更
