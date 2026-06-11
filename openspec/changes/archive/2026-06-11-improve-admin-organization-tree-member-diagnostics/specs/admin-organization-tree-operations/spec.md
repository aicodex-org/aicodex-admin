## ADDED Requirements

### Requirement: Member diagnostics view
系统 SHALL 在 admin 组织树运营能力中提供只读成员诊断视图，用于管理员排查部门成员归属、生命周期、mapping 状态和来源连接质量。

#### Scenario: Administrator views department member summary
- **WHEN** 管理员打开组织树运营页并查看部门节点
- **THEN** 系统 SHALL 显示该部门的成员摘要，例如成员总数、active 成员数、disabled 成员数、conflicted 成员数、mapping 异常数和 stale 成员数
- **AND** 系统 SHALL 使用平台部门 ID、稳定 subject ID、SourceConnection 和 lineage 作为诊断依据
- **AND** 系统 SHALL NOT 使用手机号、邮箱、昵称或 displayName 作为授权 join key

#### Scenario: Administrator opens member view
- **WHEN** 管理员切换到 `成员视图`、`含成员树` 或等价入口
- **THEN** 系统 SHALL 在部门上下文中展示轻量成员信息，包括脱敏 display metadata、稳定 subject 标识短显、`lifecycleStatus`、`mappingStatus`、`sourceType`、`sourceConnectionId`、`readModelSource` 和 freshness 摘要
- **AND** 系统 SHALL 默认保持部门树视图不被成员节点替代
- **AND** 系统 SHALL 对大组织采用分页、按部门懒加载或等价保护，避免默认全量展开所有成员

#### Scenario: Member diagnostics stay read-only and fail closed
- **WHEN** 成员、成员关系、ExternalIdentity、mapping、SourceConnection 或 lineage 处于 disabled、deleted、conflicted、stale 或不可判定状态
- **THEN** 系统 SHALL 将该成员展示为诊断项或异常成员
- **AND** 系统 SHALL NOT 使用该成员扩大组织树可见范围、报表 scope 或 gateway projection 输入
- **AND** 系统 SHALL NOT 提供成员源事实编辑、权限矩阵编辑或 gateway authorization facts 写入

#### Scenario: Member view is not a cross-service contract
- **WHEN** API/gateway 或 Insight 需要组织、scope、projection 或授权数据
- **THEN** API/gateway SHALL 继续消费 admin-to-gateway projection contract
- **AND** Insight SHALL 继续只读消费 admin provider
- **AND** 系统 SHALL NOT 要求这些下游直接消费 admin 管理页面成员树 JSON
