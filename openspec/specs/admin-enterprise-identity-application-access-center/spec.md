# admin-enterprise-identity-application-access-center Specification

## Purpose
TBD - created by archiving change implement-admin-enterprise-identity-application-access-center. Update Purpose after archive.
## Requirements
### Requirement: 应用接入中心工作区
Admin 企业认证中心 SHALL 在应用接入分组下提供列表优先的应用接入中心工作区，使管理员能够从 `/applications` 首屏扫描已接入应用、OAuth/OIDC client、API 映射、回调地址、授权范围、配置缺口和后续操作入口。

#### Scenario: 管理员打开应用接入中心
- **WHEN** 已登录管理员访问 `/applications`
- **THEN** 页面展示应用接入中心标题、接入完整度摘要、配置缺口和主要配置入口
- **AND** 页面仍展示既有 Application 列表和新增、复制、编辑、删除入口
- **AND** Application 列表或列表操作入口在 1440x900 桌面首屏内可感知

#### Scenario: 应用接入中心展示控制台结构
- **WHEN** 管理员访问 `/applications`
- **THEN** 页面 SHALL 使用列表优先结构展示当前筛选摘要、应用接入缺口、关键配置入口和既有列表承载区
- **AND** 应用接入卡片网格 SHALL 降权为紧凑摘要或辅助入口，不得取代列表成为首屏主任务
- **AND** 页面 SHALL 使用“当前筛选”“只读核对”“配置缺口”等操作文案，不展示“只读推导”“当前列表视图”等实现痕迹文案

#### Scenario: 既有应用列表仍可操作
- **WHEN** 管理员在应用接入中心查看 Application 表格
- **THEN** 既有分页、筛选、排序、新增、复制、编辑和删除行为保持可用
- **AND** 应用接入中心不得改变 Application 表格的路由、权限 key 或数据写入行为

### Requirement: 应用接入状态与配置完整度
应用接入中心 SHALL 基于现有只读 Application 数据展示当前列表视图的接入完整度、启用/停用、回调地址配置、授权范围、Provider 绑定、Provider 身份源目标组织和 OAuth/OIDC client 配置状态，不得展示 client secret、token 或其它敏感字段原值。

#### Scenario: 应用配置完整
- **WHEN** Application 列表中存在启用应用
- **AND** 该应用具备 `clientId`、回调地址、授权范围和 Provider 绑定
- **AND** 启用的企业身份 Provider 具备明确目标组织或可解释的默认组织 fallback
- **THEN** 应用接入中心将该应用计入“接入完整”或“低风险”摘要
- **AND** 页面提供进入应用编辑、API 映射和审计记录的入口

#### Scenario: 应用配置不完整
- **WHEN** Application 缺少回调地址、授权范围、Provider 绑定、Provider 身份源目标组织或 `clientId`
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
应用接入中心 SHALL 聚合应用接入相关入口，至少覆盖 Application 编辑、API 网关映射、OAuth/OIDC Provider 配置、资源、证书、密钥、Webhook 和审计记录，并 SHALL 使用当前语言的企业管理台标签。

#### Scenario: 管理员查看配置入口
- **WHEN** 管理员查看应用接入中心
- **THEN** 页面展示应用列表、API 映射、认证源、资源、证书、密钥、Webhook 和审计记录入口
- **AND** 每个入口 SHALL 跳转到既有路由，不新增不兼容路由
- **AND** 中文界面 SHALL NOT 残留 `Keys`、`Webhooks`、`Webhook Events` 等未本地化入口标签

#### Scenario: 缺少真实后端聚合接口
- **WHEN** 前端没有真实全量应用接入聚合接口
- **THEN** 页面 SHALL 明确当前摘要来自当前筛选、已加载应用或既有配置页
- **AND** 后续全量只读聚合接口契约 SHALL 通过单独 change 定义

### Requirement: 只读安全边界与企业管理台视觉
应用接入中心 SHALL 使用安静、信息密度合理的企业管理台布局，避免营销式 hero、装饰背景和卡片套卡片；该工作区 SHALL 只展示只读状态和入口，不得触发认证、授权、回调、密钥写入、同步执行或 Gateway projection publish。

#### Scenario: 只读风险摘要
- **WHEN** 管理员查看应用接入风险摘要
- **THEN** 页面只展示风险类别、数量、状态标签和跳转入口
- **AND** 不展示 `clientSecret`、token、真实敏感配置或可复用凭据

#### Scenario: 应用接入治理闭环
- **WHEN** 管理员查看应用接入配置缺口
- **THEN** 页面 SHALL 同时展示缺口类别、影响数量、只读边界和进入应用编辑、API 映射、Provider 或审计记录的下一步入口
- **AND** 不仅展示孤立的指标数字

#### Scenario: 桌面和窄屏访问
- **WHEN** 管理员在桌面端或窄屏访问应用接入中心
- **THEN** 文本、状态标签、按钮、卡片和表格区域不发生重叠或不可读溢出
- **AND** 页头、摘要和入口区域 SHALL 使用紧凑间距，避免移动端几千像素后才出现列表
- **AND** 配置和诊断入口仍可触达

### Requirement: Provider 身份源绑定配置
应用编辑页 SHALL 允许管理员为每个启用的登录 Provider 配置目标组织，用于决定该 Provider 登录时在哪个组织中匹配用户。

#### Scenario: 管理员配置飞书目标组织
- **WHEN** 管理员在同一个 OIDC Application 中启用 Lark/Feishu Provider
- **THEN** 页面 SHALL 允许将该 Provider 的目标组织设置为飞书组织同步目标，例如 `feishu-test`
- **AND** 页面 SHALL 说明 Application 组织仍是应用归属/默认组织，不等同于每个 Provider 的登录查找组织

#### Scenario: 未配置目标组织
- **WHEN** Provider binding 没有设置目标组织
- **THEN** 页面 SHALL 展示“使用应用默认组织”或等价说明
- **AND** 保存后 SHALL 保持空值，不强行写入当前默认组织

### Requirement: 应用接入中心必须消费服务凭据治理状态

应用接入中心 SHALL consume the Admin-owned service credential governance status contract when available and show a compact read-only service credential summary within the existing `/applications` context.

#### Scenario: 管理员查看服务凭据治理摘要

- **WHEN** an administrator opens `/applications`
- **THEN** the Application Access area SHALL request `GET /api/application-access/service-credential-governance-status`
- **AND** it SHALL display group labels, sanitized statuses and remediation routes for provider trust, usage identity resolver, Gateway organization projection and keep-in-env groups
- **AND** it SHALL remain in the existing Application Access context without creating a new top-level center or changing Application table operations

#### Scenario: 摘要覆盖加载、错误和空状态

- **WHEN** the governance status request is loading, fails, is forbidden or returns no groups
- **THEN** the UI SHALL show a compact loading, error or unavailable state
- **AND** Application list, add, edit, copy, delete, Provider, API mapping and audit links SHALL remain available
- **AND** the UI SHALL NOT trigger credential writes, credential verification, login, OIDC callback, WeCom sync or Gateway projection publish

#### Scenario: UI 不展示凭据值

- **WHEN** service credential governance status is rendered in Application Access
- **THEN** the UI SHALL render only sanitized group status, key names, caller policy, bounded runtime policy and remediation labels
- **AND** it MUST NOT display token values, Authorization headers, Cookies, DSNs, client secrets, private keys, complete private URLs, raw provider responses, raw downstream responses, raw ids, real accounts or complete organization trees

### Requirement: 应用接入中心必须提供服务凭据治理配置入口

应用接入中心 SHALL provide a compact service credential governance configuration entry within the existing `/applications` context so global administrators can review and save sanitized Admin-owned credential reference and owner classification metadata without leaving Application Access.

#### Scenario: 管理员查看配置入口

- **WHEN** a global administrator opens `/applications`
- **THEN** the Application Access area SHALL request `GET /api/application-access/service-credential-governance-config`
- **AND** it SHALL show provider trust, usage identity resolver, Gateway organization projection and keep-in-env groups with enabled state, owner hint, reference status, caller policy, source class and next action
- **AND** it SHALL remain in the existing Application Access context without creating a new top-level center or changing Application table operations

#### Scenario: 管理员保存 copy-safe 配置并回读

- **WHEN** a global administrator edits service credential governance metadata and clicks save
- **THEN** the UI SHALL submit only copy-safe fields to `POST /api/application-access/service-credential-governance-config`
- **AND** it SHALL show submitting, success and error states
- **AND** after success it SHALL render the sanitized response returned by the server instead of echoing unsaved form values

#### Scenario: 配置入口覆盖不可写和外部化状态

- **WHEN** a group is `keep_in_env`, `external_secret_system`, disabled or reference-only
- **THEN** the UI SHALL show that the credential value remains in env/config or external secret owner context
- **AND** it SHALL not provide a raw secret textbox, token reveal action, private URL reveal action or credential test action
- **AND** it SHALL keep the Application list, add, edit, copy, delete, Provider, API mapping and audit links available

#### Scenario: UI 不展示敏感值

- **WHEN** service credential governance config is rendered, saved or fails validation
- **THEN** the UI SHALL render only sanitized group labels, status, key names, reference keys, owner hints, caller policy, bounded runtime policy and remediation labels
- **AND** it MUST NOT display token values, Authorization headers, Cookies, DSNs, client secrets, private keys, complete private URLs, raw provider responses, raw downstream responses, raw ids, real accounts or complete organization trees

#### Scenario: 配置入口覆盖加载、错误和空状态

- **WHEN** the config request is loading, fails, is forbidden or returns no groups
- **THEN** the UI SHALL show a compact loading, unavailable or empty state
- **AND** Application Access primary actions SHALL remain available
- **AND** the UI SHALL NOT trigger credential writes, credential verification, login, OIDC callback, WeCom sync or Gateway projection publish while rendering these states

### Requirement: 应用接入中心必须展示服务凭据治理 overlay 状态

应用接入中心 SHALL continue to consume the service credential governance status contract and show the saved-config overlay result within the existing `/applications` context.

#### Scenario: 管理员查看已保存配置 overlay 后的状态

- **WHEN** a global administrator opens `/applications`
- **AND** Admin has saved service credential governance configuration for `usage_identity_resolver` or `gateway_organization_projection`
- **THEN** the Application Access service credential summary SHALL display the status, reference status, caller policy and remediation route returned by `GET /api/application-access/service-credential-governance-status`
- **AND** the UI SHALL NOT locally recompute legacy env/config readiness or override a server-side fail-closed disabled status

#### Scenario: UI 不展示 overlay 敏感值

- **WHEN** the Application Access service credential summary renders overlay status
- **THEN** it SHALL render only sanitized group labels, statuses, key names, reference aliases, caller policy names, bounded runtime policy and remediation labels
- **AND** it MUST NOT display token values, Authorization headers, Cookies, DSNs, client secrets, private keys, complete private URLs, raw provider responses, raw downstream responses, raw ids, real accounts or complete organization trees
- **AND** it SHALL NOT trigger credential writes, credential verification, login, OIDC callback, WeCom sync, Gateway projection publish or Gateway projection refresh while rendering status
