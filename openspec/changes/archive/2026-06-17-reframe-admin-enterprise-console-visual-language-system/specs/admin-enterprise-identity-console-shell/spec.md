## MODIFIED Requirements

### Requirement: 企业 SaaS 管理台视觉
企业认证中心 Shell SHALL 使用安静、专业、信息密度合理且按业务域分化的管理台视觉，避免大 hero、装饰渐变、营销式介绍、卡片套卡片和所有列表页套同一工作台模板；总览、组织身份、认证源、应用接入、LLM AI/Gateway 和审计运维 SHALL 使用一致的控制台基础语言，但首屏结构、文案、指标和操作入口 SHALL 服务各自业务域。

#### Scenario: 桌面端首屏
- **WHEN** 管理员在桌面端打开总览或企业认证中心子页面
- **THEN** 首屏展示可扫描的状态区、风险区、入口区和对应页面的核心列表或核心操作
- **AND** 文案服务于操作决策

#### Scenario: 工作台视觉一致但不模板化
- **WHEN** 管理员在总览、组织身份、认证源中心、应用接入中心、LLM AI/Gateway 和审计运维页面之间切换
- **THEN** 页面画布、字体层级、状态标签和操作入口 SHALL 保持一致的企业控制台视觉语言
- **AND** 每个业务域 SHALL 呈现不同首屏结构和治理语义
- **AND** 页面 SHALL NOT 依赖装饰性背景、光球、bokeh 或大面积单一渐变来表达产品感
- **AND** 页面 SHALL NOT 把核心列表长期压到 1440x900 首屏以下，除非验证记录说明 legacy 表格或数据结构限制

#### Scenario: 窄屏展示
- **WHEN** 管理员在窄屏或移动端打开企业认证中心页面
- **THEN** 文本、按钮和状态卡片不发生重叠或不可读溢出
- **AND** 页头、摘要、入口和列表之间 SHALL 使用紧凑响应式间距
- **AND** 关键入口和核心列表仍可触达

## ADDED Requirements

### Requirement: 企业认证中心旧 Tour 降级
企业认证中心 Shell SHALL 避免在企业认证中心路由下自动弹出旧 Casdoor 英文 Tour 遮罩；如需要导引，导引文案和步骤 MUST 使用企业认证中心语义并走 `zh` / `en` locale。

#### Scenario: 首次访问企业认证中心列表页
- **WHEN** 管理员首次访问 `/organizations`、`/users`、`/roles`、`/permissions`、`/providers`、`/applications`、`/sessions`、`/records`、`/tokens`、`/verifications` 或 `/agents`
- **THEN** 页面 SHALL NOT 自动展示硬编码英文 `Organization List`、`User List`、`Application List` 或等价旧 Casdoor Tour 遮罩
- **AND** 核心列表、表格或主要操作区域不被 Tour 遮挡

#### Scenario: 后续重建企业认证中心导引
- **WHEN** 系统提供新的企业认证中心导引
- **THEN** 导引文案 SHALL 同步 `zh` / `en` locale
- **AND** 导引步骤 SHALL 使用企业身份治理、认证源、应用接入、审计运维、LLM AI/Gateway 等当前信息架构文案
- **AND** 导引 SHALL 支持用户关闭或跳过，不阻塞核心列表操作
