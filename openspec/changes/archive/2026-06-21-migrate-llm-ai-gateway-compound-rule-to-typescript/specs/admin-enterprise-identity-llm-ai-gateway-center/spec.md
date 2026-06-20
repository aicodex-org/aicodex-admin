## ADDED Requirements

### Requirement: 组合规则编辑器 TSX 迁移保持行为兼容
Admin 企业认证中心 SHALL 支持将 LLM AI/Gateway 治理规则编辑链路中的 `CompoundRule` 组件迁移为 TSX，并保持组合规则候选加载、自引用过滤和表达式回写行为兼容。

#### Scenario: 组合规则候选加载与自过滤
- **WHEN** `CompoundRule` 被迁移为 `.tsx` 并以当前 `owner` 与 `ruleName` 加载候选规则
- **THEN** 组件 SHALL 继续通过现有 Rule API 边界读取当前 owner 下的规则
- **AND** 候选规则 SHALL 继续以 `owner/name` 形式展示
- **AND** 候选规则 SHALL 继续过滤当前正在编辑的 `owner/ruleName`，避免组合规则引用自身

#### Scenario: 组合规则表达式编辑保持兼容
- **WHEN** 管理员编辑组合规则表达式
- **THEN** 默认表达式、operator 选择、规则选择、添加、删除、上移、下移、restore 和 `onUpdateTable(table)` 回写 SHALL 保持现有行为
- **AND** 迁移 SHALL NOT 修改 `/rules/:organizationName/:ruleName` 路由、Rule API path、payload shape、规则保存/删除语义、权限或 Gateway projection publish 行为

#### Scenario: 规则编辑页调用边界保持兼容
- **WHEN** `RuleEditPage` 继续通过 `./common/CompoundRule` 无后缀路径引用组合规则组件
- **THEN** 构建和运行时模块解析 SHALL 继续找到同名 `.tsx` 组件
- **AND** 本迁移 SHALL NOT 要求同一 change 迁移 `RuleEditPage.js`、`RuleBackend.js` 或普通规则表达式表格组件
