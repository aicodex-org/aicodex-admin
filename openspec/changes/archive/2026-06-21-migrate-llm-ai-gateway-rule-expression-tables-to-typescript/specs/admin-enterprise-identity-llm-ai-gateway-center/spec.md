## ADDED Requirements

### Requirement: 治理规则表达式表格 TSX 迁移保持行为兼容
Admin 企业认证中心 SHALL 支持将 LLM AI/Gateway 治理规则编辑链路中的 WAF、IP、User-Agent 和 IP Rate Limiting 表达式表格迁移为 TSX，并保持现有规则行 shape、默认规则、表格操作、字段回写和调用方兼容。

#### Scenario: 表达式表格迁移不改变调用边界
- **WHEN** `WafRuleTable`、`IpRuleTable`、`UaRuleTable` 和 `IpRateRuleTable` 被迁移为 `.tsx`
- **THEN** 每个组件 SHALL 继续默认导出同名 React 组件
- **AND** `RuleEditPage` 的无后缀 import SHALL 继续解析到相同组件能力
- **AND** 每个组件 SHALL 继续接收 `table`、`title` 和 `onUpdateTable(table)` 调用边界
- **AND** 迁移 SHALL NOT 修改 `RuleEditPage`、`CompoundRule`、`RuleBackend.js`、后端 Rule API、权限或 Gateway projection publish 行为

#### Scenario: WAF 表格保留默认规则和行操作
- **WHEN** WAF 表格以空 `table` 渲染或点击 restore
- **THEN** 组件 SHALL 通过 `onUpdateTable` 回写三条既有 WAF/ModSecurity 默认规则
- **AND** 添加、删除、上移、下移、name 编辑和 expression 编辑 SHALL 保持既有 table 行 shape 与顺序语义

#### Scenario: IP 表格保留 tags 拼接和行操作
- **WHEN** IP 表格更新 IP List tags
- **THEN** 组件 SHALL 继续 trim 每个 tag 并以英文逗号拼接后写入当前行 `value`
- **AND** 操作符 SHALL 保持 `is in` 与 `is not in` 两个既有选项
- **AND** 默认规则、添加、删除、上移、下移和 restore SHALL 保持既有行为

#### Scenario: User-Agent 表格保留空白归一化
- **WHEN** User-Agent 表格的 value 输入框 blur
- **THEN** 组件 SHALL 继续将连续空白压缩为一个空格并 trim 后写入当前行 `value`
- **AND** 默认规则 SHALL 继续使用当前 `window.navigator.userAgent`
- **AND** 添加、删除、上移、下移、restore 和五类操作符 SHALL 保持既有行为

#### Scenario: IP Rate 表格保留数值字符串回写
- **WHEN** IP Rate Limiting 表格编辑 name、rate 或 block duration
- **THEN** 组件 SHALL 继续把字段值通过 `String(value)` 写回当前行
- **AND** restore SHALL 继续回写 `Default IP Rate`、`100` 和 `6000`
- **AND** 本表格 SHALL NOT 新增添加、删除、上移或下移操作
