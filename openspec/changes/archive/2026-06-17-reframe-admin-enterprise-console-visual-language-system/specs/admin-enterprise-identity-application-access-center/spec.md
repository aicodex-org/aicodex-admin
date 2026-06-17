## MODIFIED Requirements

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
