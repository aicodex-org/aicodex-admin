## MODIFIED Requirements

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
