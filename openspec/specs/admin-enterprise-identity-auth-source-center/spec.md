# admin-enterprise-identity-auth-source-center Specification

## Purpose
TBD - created by archiving change implement-admin-enterprise-identity-auth-source-center. Update Purpose after archive.
## Requirements
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

### Requirement: 认证源状态与配置完整度
认证源中心 SHALL 基于现有只读 Provider 数据展示每类认证源的启用状态、配置完整度和下一步动作，不得展示 client secret、token 或其它敏感字段原值。

#### Scenario: 已配置认证源
- **WHEN** Provider 列表包含企业微信、飞书或 OIDC 相关 provider
- **THEN** 对应状态卡片展示已启用或待补全状态
- **AND** 配置完整度以字段数量或百分比呈现，不展示敏感配置内容

#### Scenario: 未配置认证源
- **WHEN** Provider 列表不包含某类认证源 provider
- **THEN** 对应状态卡片展示未启用或待配置状态
- **AND** 页面提供进入配置页面的入口

#### Scenario: Provider 数据加载中或为空
- **WHEN** Provider 列表正在加载或返回空数组
- **THEN** 认证源中心展示加载、待配置或空态提示
- **AND** 页面仍保留进入配置和诊断页面的入口

### Requirement: 同步授权诊断与失败摘要
认证源中心 SHALL 展示最近同步、授权状态和失败摘要的只读诊断入口；在缺少聚合接口时，页面 MUST 明确该状态需要进入同步页面或审计记录核对。

#### Scenario: 企业微信与飞书诊断入口
- **WHEN** 管理员查看企业微信或飞书状态卡片
- **THEN** 页面展示同步诊断入口
- **AND** 不触发组织同步、重试、授权刷新或其它写入操作

#### Scenario: OIDC 授权状态入口
- **WHEN** 管理员查看 OIDC 状态卡片
- **THEN** 页面展示进入配置或核对回调配置的入口
- **AND** 不触发 OAuth/OIDC 授权流程或真实探测

#### Scenario: 最近失败摘要不可用
- **WHEN** 前端没有真实失败摘要或聚合接口
- **THEN** 页面展示“以同步页面和审计记录为准”的只读提示
- **AND** 提供进入审计记录或同步诊断页面的入口

### Requirement: 企业管理台视觉与响应式
认证源中心 SHALL 使用安静、信息密度合理的企业管理台布局，避免营销式 hero、装饰背景和卡片套卡片，并在桌面和窄屏上保持可读可操作。

#### Scenario: 桌面端扫描认证源
- **WHEN** 管理员在桌面端访问认证源中心
- **THEN** 状态摘要、诊断队列和 Provider 列表布局清晰
- **AND** 文案服务于操作决策
- **AND** 浏览器验证 SHALL 记录 Provider 列表或列表入口的 y 坐标

#### Scenario: 认证源治理闭环
- **WHEN** 管理员查看认证源状态或失败摘要
- **THEN** 页面 SHALL 同时展示风险含义、只读依据和进入配置/同步诊断/审计记录的下一步入口
- **AND** 不仅展示孤立的状态标签或进度条

#### Scenario: 窄屏访问认证源中心
- **WHEN** 管理员在窄屏或移动端访问认证源中心
- **THEN** 文本、状态标签、按钮和表格区域不发生重叠或不可读溢出
- **AND** 页头、状态摘要和诊断入口 SHALL 使用紧凑间距，避免列表被大面积空白推到深滚动位置
- **AND** 配置和诊断入口仍可触达

