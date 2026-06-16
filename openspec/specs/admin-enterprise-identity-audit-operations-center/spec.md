# admin-enterprise-identity-audit-operations-center Specification

## Purpose
TBD - created by archiving change improve-admin-enterprise-audit-operations-center. Update Purpose after archive.
## Requirements
### Requirement: 审计运维中心工作台
Admin 企业认证中心 SHALL 在审计运维分组下将会话、审计记录、令牌和验证记录组织为统一运行态核对工作台，使管理员能够从任一审计运维页面理解当前核对域、主要风险和下一步入口。

#### Scenario: 管理员打开会话核对
- **WHEN** 已登录管理员访问 `/sessions`
- **THEN** 页面展示审计运维工作台壳层，并标记当前核对域为会话核对
- **AND** 页面仍展示既有 Session 表格、分页、搜索和删除行为

#### Scenario: 管理员打开审计记录
- **WHEN** 已登录管理员访问 `/records`
- **THEN** 页面展示审计运维工作台壳层，并标记当前核对域为审计记录
- **AND** 页面仍展示既有 Record 表格、分页、搜索和详情抽屉

#### Scenario: 管理员打开令牌核对
- **WHEN** 已登录管理员访问 `/tokens`
- **THEN** 页面展示审计运维工作台壳层，并标记当前核对域为令牌核对
- **AND** 页面仍展示既有 Token 表格、新增、编辑、删除、分页和搜索行为

#### Scenario: 管理员打开验证核对
- **WHEN** 已登录管理员访问 `/verifications`
- **THEN** 页面展示审计运维工作台壳层，并标记当前核对域为验证核对
- **AND** 页面仍展示既有 Verification 表格、分页和搜索行为

### Requirement: 运行态摘要与入口聚合
审计运维中心 SHALL 展示当前视图摘要、四类运行态入口和可处理风险入口；摘要 MUST 明确来自当前列表视图或分页总数，不得包装成真实全量治理事实。

#### Scenario: 当前视图有分页总数
- **WHEN** 当前列表页提供 `pagination.total`
- **THEN** 审计运维工作台展示该核对域的当前可见总数
- **AND** 页面说明该摘要来自当前筛选或分页视图

#### Scenario: 当前视图无分页总数
- **WHEN** 当前列表页没有可用分页总数
- **THEN** 审计运维工作台使用当前 data 数量展示可见记录数
- **AND** 不声明这是后端全量记录数

#### Scenario: 管理员查看运维入口
- **WHEN** 管理员查看任一审计运维页面
- **THEN** 页面展示会话核对、审计记录、令牌核对、验证核对四个入口
- **AND** 每个入口跳转到既有路由，不新增不兼容路由或权限 key

### Requirement: 风险核对与敏感信息边界
审计运维中心 SHALL 只展示可扫描的风险类别、状态标签和跳转入口，不得展示 token、验证码、Cookie、client secret 或其它可复用敏感凭据原值。

#### Scenario: 审计记录包含错误状态
- **WHEN** 当前 Record 列表包含 4xx 或 5xx 状态码
- **THEN** 审计运维工作台展示失败或风险核对提示
- **AND** 提供进入审计记录页面的入口

#### Scenario: 当前 Token 列表包含访问令牌
- **WHEN** 当前 Token 列表包含 `accessToken` 字段
- **THEN** 审计运维工作台只展示令牌数量、有效期核对或入口提示
- **AND** 不展示 `accessToken` 原值

#### Scenario: 当前 Verification 列表包含验证码
- **WHEN** 当前 Verification 列表包含 `code` 或 `receiver` 字段
- **THEN** 审计运维工作台只展示验证记录数量、未使用状态或入口提示
- **AND** 不展示验证码原值或接收者敏感明细

### Requirement: 企业管理台视觉与响应式
审计运维中心 SHALL 复用企业认证中心工作台视觉语言，使用安静、信息密度合理的管理台布局，避免营销式 hero、装饰背景、卡片套卡片，并在桌面和窄屏上保持可读可操作。

#### Scenario: 桌面端扫描审计运维
- **WHEN** 管理员在桌面端访问任一审计运维页面
- **THEN** 工作台展示页头、摘要条、入口卡、风险核对和表格承载区
- **AND** 文案服务于操作决策

#### Scenario: 窄屏访问审计运维
- **WHEN** 管理员在窄屏或移动端访问任一审计运维页面
- **THEN** 文本、按钮、入口卡、状态标签和表格区域不发生重叠或不可读溢出
- **AND** 四类核对入口仍可触达

#### Scenario: 只读工作台不触发执行
- **WHEN** 管理员点击工作台中的入口或查看风险摘要
- **THEN** 页面只跳转既有路由或展示只读说明
- **AND** 不触发认证、授权、会话清理、令牌签发、验证码重发、组织同步或 Gateway projection publish

