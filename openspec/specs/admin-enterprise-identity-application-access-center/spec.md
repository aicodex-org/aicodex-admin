# admin-enterprise-identity-application-access-center Specification

## Purpose
TBD - created by archiving change implement-admin-enterprise-identity-application-access-center. Update Purpose after archive.
## Requirements
### Requirement: 应用接入中心工作区
Admin 企业认证中心 SHALL 在应用接入分组下提供应用接入中心工作区，使管理员能够从 `/applications` 首屏扫描已接入应用、OAuth/OIDC client、API 映射、回调地址和授权范围的只读状态与后续操作入口。

#### Scenario: 管理员打开应用接入中心
- **WHEN** 已登录管理员访问 `/applications`
- **THEN** 页面展示应用接入中心标题、接入完整度摘要、风险摘要和配置入口
- **AND** 页面仍展示既有 Application 列表和新增、复制、编辑、删除入口

#### Scenario: 既有应用列表仍可操作
- **WHEN** 管理员在应用接入中心查看 Application 表格
- **THEN** 既有分页、筛选、排序、新增、复制、编辑和删除行为保持可用
- **AND** 应用接入中心不得改变 Application 表格的路由、权限 key 或数据写入行为

### Requirement: 应用接入状态与配置完整度
应用接入中心 SHALL 基于现有只读 Application 数据展示当前列表视图的接入完整度、启用/停用、回调地址配置、授权范围、Provider 绑定和 OAuth/OIDC client 配置状态，不得展示 client secret、token 或其它敏感字段原值。

#### Scenario: 应用配置完整
- **WHEN** Application 列表中存在启用应用
- **AND** 该应用具备 `clientId`、回调地址、授权范围和 Provider 绑定
- **THEN** 应用接入中心将该应用计入“接入完整”或“低风险”摘要
- **AND** 页面提供进入应用编辑、API 映射和审计记录的入口

#### Scenario: 应用配置不完整
- **WHEN** Application 缺少回调地址、授权范围、Provider 绑定或 `clientId`
- **THEN** 应用接入中心 SHALL 展示对应待补全风险摘要
- **AND** 页面 SHALL 提供进入应用编辑或相关配置页的入口

#### Scenario: 应用停用或禁止登录
- **WHEN** Application 标记为停用或 `disableSignin` 为 true
- **THEN** 应用接入中心 SHALL 将其展示为停用或需核对状态
- **AND** 不得触发任何启用、授权或回调执行动作

#### Scenario: Application 数据加载中或为空
- **WHEN** Application 列表正在加载或返回空数组
- **THEN** 应用接入中心 SHALL 展示加载、待接入或空态提示
- **AND** 页面仍保留进入新增应用、API 映射、Provider 和审计记录的入口

### Requirement: 配置入口聚合
应用接入中心 SHALL 聚合应用接入相关入口，至少覆盖 Application 编辑、API 网关映射、OAuth/OIDC Provider 配置、资源、证书、密钥、Webhook 和审计记录。

#### Scenario: 管理员查看配置入口
- **WHEN** 管理员查看应用接入中心
- **THEN** 页面展示应用列表、API 映射、认证源、资源、证书、密钥、Webhook 和审计记录入口
- **AND** 每个入口 SHALL 跳转到既有路由，不新增不兼容路由

#### Scenario: 缺少真实后端聚合接口
- **WHEN** 前端没有真实全量应用接入聚合接口
- **THEN** 页面 SHALL 明确当前摘要来自现有列表视图或既有配置页
- **AND** 后续全量只读聚合接口契约 SHALL 通过单独 change 定义

### Requirement: 只读安全边界与企业管理台视觉
应用接入中心 SHALL 使用安静、信息密度合理的企业管理台布局，避免营销式 hero、装饰背景和卡片套卡片；该工作区 SHALL 只展示只读状态和入口，不得触发认证、授权、回调、密钥写入、同步执行或 Gateway projection publish。

#### Scenario: 只读风险摘要
- **WHEN** 管理员查看应用接入风险摘要
- **THEN** 页面只展示风险类别、数量、状态标签和跳转入口
- **AND** 不展示 `clientSecret`、token、真实敏感配置或可复用凭据

#### Scenario: 桌面和窄屏访问
- **WHEN** 管理员在桌面端或窄屏访问应用接入中心
- **THEN** 文本、状态标签、按钮、卡片和表格区域不发生重叠或不可读溢出
- **AND** 配置和诊断入口仍可触达
