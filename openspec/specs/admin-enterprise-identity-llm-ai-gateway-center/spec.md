# admin-enterprise-identity-llm-ai-gateway-center Specification

## Purpose
TBD - created by archiving change improve-admin-enterprise-llm-ai-gateway-center. Update Purpose after archive.
## Requirements
### Requirement: LLM AI 网关中心工作台
Admin 企业认证中心 SHALL 在原 `/agents` 路由提供紧凑的 LLM AI 网关中心工作台，使管理员能够从 LLM AI 区域首屏理解 AI Agent、MCP Server、MCP Store、Entry、Site、Rule、API 网关身份映射和审计记录之间的治理关系，并快速进入 Agent 列表操作。

#### Scenario: 管理员打开 LLM AI 区域
- **WHEN** 已登录管理员访问 `/agents`
- **THEN** 页面展示 LLM AI 网关中心标题、当前 Agent 列表摘要、AI/Gateway 关系核对和配置入口
- **AND** 页面仍展示既有 Agent 表格、新增、编辑、删除、分页、搜索和排序行为
- **AND** Agent 列表或列表操作入口在 1440x900 桌面首屏内可感知

#### Scenario: 保持既有路由和权限 key
- **WHEN** 管理员使用侧边栏、组织 navItems 配置树或直接 URL 访问 LLM AI 相关页面
- **THEN** `/agents`、`/servers`、`/server-store`、`/entries`、`/sites`、`/rules` 和 `/platform-api-mappings` SHALL 保持原路由和权限 key 可用
- **AND** 工作台 SHALL 只改变页面语义和入口组织，不改变后端接口契约

### Requirement: 只读摘要与敏感信息边界
LLM AI 网关中心 SHALL 只基于当前列表视图和既有路由展示可扫描摘要，不得把 token、Cookie、client secret、私有 URL、完整认证头或原始 Gateway 响应写入工作台摘要、测试快照、locale 或报告。

#### Scenario: Agent 行包含敏感字段
- **WHEN** 当前 Agent 列表行包含 `token`、私有 `url` 或其它凭据字段
- **THEN** 工作台摘要 SHALL 只展示数量、状态、缺口类别和跳转入口
- **AND** 工作台摘要和风险列表 SHALL NOT 包含敏感字段原值

#### Scenario: 当前列表为空或加载中
- **WHEN** Agent 列表正在加载或返回空数组
- **THEN** 工作台 SHALL 展示加载或待接入提示
- **AND** 页面仍提供新增 Agent、MCP Server、MCP Store、API 网关身份映射和审计记录入口

### Requirement: 管理员可理解的 Gateway 命名
Admin 企业认证中心 SHALL 避免把 `Gateway 投影` / `Gateway Projection` 作为面向管理员的主导航、总览卡片或区域标题；如需保留 projection 术语，SHALL 限定在低层诊断、实现边界或后端 contract 说明中。

#### Scenario: 侧边栏和组织 navItems 配置树
- **WHEN** 管理员查看侧边栏或组织 navItems 配置树
- **THEN** LLM AI/Gateway 分组 SHALL 使用管理员可理解的 `LLM AI 网关` 或等价英文标签
- **AND** 不得展示 `Gateway 投影` 或 `Gateway Projection` 作为分组标题

#### Scenario: 身份治理总览
- **WHEN** 管理员打开企业认证中心总览
- **THEN** LLM AI/Gateway 相关卡片 SHALL 使用 `LLM AI 网关中心` 或等价标题
- **AND** 卡片描述 SHALL 强调 AI 入口、MCP 资源、网关身份映射和只读巡检，不把 projection publish 表述为主要操作

#### Scenario: 网关身份映射诊断区
- **WHEN** 管理员打开 `/platform-api-mappings`
- **THEN** Gateway 相关主要区域标题 SHALL 使用网关身份同步、网关接入回执、网关身份发布记录或等价管理员语义
- **AND** 低层说明 MAY 保留 projection、producer diagnostics、authorization facts 等术语以描述安全边界

### Requirement: 企业管理台视觉与响应式
LLM AI 网关中心 SHALL 复用企业认证中心视觉语言，使用安静、信息密度合理的管理台布局，避免营销式 hero、装饰背景和卡片套卡片，并在桌面和窄屏上保持可读可操作。

#### Scenario: 桌面和窄屏访问
- **WHEN** 管理员在桌面端或窄屏访问 `/agents`
- **THEN** 文本、状态标签、按钮、入口卡和 Agent 表格区域不发生重叠或不可读溢出
- **AND** 关键入口仍可触达
- **AND** 页头、AI/Gateway 摘要和入口区域 SHALL 使用紧凑间距，避免移动端几千像素后才出现 Agent 列表

#### Scenario: LLM AI 语义不被卡片堆叠稀释
- **WHEN** 管理员查看 `/agents` 首屏
- **THEN** 页面 SHALL 同时保留 Agent、MCP、Gateway identity mapping 和审计证据语义
- **AND** 页面 SHALL NOT 在 Agent 列表前堆叠多层说明卡、入口卡和风险卡
- **AND** 浏览器验证 SHALL 记录 Agent 列表或列表入口的 y 坐标
