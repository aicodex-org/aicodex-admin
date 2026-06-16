## MODIFIED Requirements

### Requirement: 应用接入中心工作区
Admin 企业认证中心 SHALL 在应用接入分组下提供应用接入中心工作区，使管理员能够从 `/applications` 首屏扫描已接入应用、OAuth/OIDC client、API 映射、回调地址、授权范围、配置缺口和后续操作入口。

#### Scenario: 管理员打开应用接入中心
- **WHEN** 已登录管理员访问 `/applications`
- **THEN** 页面展示应用接入中心标题、接入完整度摘要、风险摘要和配置入口
- **AND** 页面仍展示既有 Application 列表和新增、复制、编辑、删除入口

#### Scenario: 应用接入中心展示控制台结构
- **WHEN** 管理员访问 `/applications`
- **THEN** 页面 SHALL 使用与企业认证中心总览一致的工作台结构展示当前列表视图摘要、应用接入卡、配置缺口、配置入口和既有列表承载区
- **AND** 页面 SHALL 明确当前摘要来自只读推导或当前列表视图

#### Scenario: 既有应用列表仍可操作
- **WHEN** 管理员在应用接入中心查看 Application 表格
- **THEN** 既有分页、筛选、排序、新增、复制、编辑和删除行为保持可用
- **AND** 应用接入中心不得改变 Application 表格的路由、权限 key 或数据写入行为

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
- **AND** 配置和诊断入口仍可触达
