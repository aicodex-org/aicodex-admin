## MODIFIED Requirements

### Requirement: LLM AI 网关中心工作台
Admin 企业认证中心 SHALL 在原 `/agents` 路由提供紧凑的 LLM AI 网关中心工作台，使管理员能够从 LLM AI 区域首屏理解 AI Agent、MCP Server、MCP Store、Entry、Site、Rule、API 网关身份映射和审计记录之间的治理关系，并快速进入 Agent 列表操作。

#### Scenario: AI Agent 入口页迁移保持工作台和列表行为
- **WHEN** `AgentListPage` 和 `AgentEditPage` 迁移为 TSX
- **THEN** `/agents` 页面 SHALL 继续展示 `LlmAiGatewayCenter` 总览块、Agent 表格、新增、编辑、删除、分页、搜索和排序行为
- **AND** `/agents/:organizationName/:agentName` 页面 SHALL 继续保持 Agent 读取、组织/应用下拉、字段编辑、保存、保存并退出、取消新增、删除和 404 跳转行为
- **AND** 迁移 SHALL NOT 改变后端 Agent API 契约、Agent 保存/删除语义、Gateway projection publish 行为、MCP Server、MCP Store、入口配置、站点范围或治理规则页面
