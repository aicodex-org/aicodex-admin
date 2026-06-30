## ADDED Requirements

### Requirement: 组织账号共享列表壳暗黑主题一致性
Admin 组织账号域下使用共享列表壳的标准分页列表页 SHALL 在明亮与暗黑模式下使用同一套主题 token 呈现标题、结果数、查询工具栏、表格外层 panel、辅助上下文和分页区，避免列表壳在暗黑模式下出现亮色漂移。

#### Scenario: 暗黑模式下组织账号列表壳保持统一层级
- **WHEN** 管理员在暗黑模式下访问 `/organizations`、`/groups`、`/users`、`/invitations` 或其它复用共享列表壳的组织账号分页列表
- **THEN** 列表标题区、结果数分隔、查询工具栏、表格外层 panel 和分页区 SHALL 使用共享暗黑主题 surface、border 和 text token
- **AND** 页面 SHALL NOT 在暗黑背景中留下白底 outer panel、亮色结果数分隔线或失真的分页背景

#### Scenario: 目录健康与辅助上下文不再使用固定浅色样式
- **WHEN** 组织列表在标题或查询工具栏附近展示目录健康、同步来源、边界信息或等价辅助上下文
- **THEN** 这些辅助上下文 SHALL 使用共享 secondary text、warning 和 divider token 表达层级
- **AND** 辅助上下文 SHALL NOT 因固定浅灰背景、浅灰边框或错误文字色而在暗黑模式下形成突兀亮块

#### Scenario: 组织诊断与质量页面局部 Card 使用共享主题
- **WHEN** 管理员在暗黑模式下访问 `/organization-tree-operations` 或 `/organization-directory-quality`
- **THEN** 诊断摘要、修复计划、查询控件、默认按钮、表格、Segmented、Tree 和空态 SHALL 使用共享 shell surface、border 和 text token
- **AND** 页面 SHALL NOT 残留固定浅色边框、Ant Design 默认黑色 surface 或与组织/群组列表不一致的默认 Tag 层级

#### Scenario: 组织账号列表不叠加第二套页面外边距
- **WHEN** 组织、群组、用户、邀请码或组织内用户等标准分页列表复用共享列表壳
- **THEN** 页面外层 SHALL 消费统一 route/page shell spacing，列表壳内部仅保留自身 panel padding、查询工具栏节奏和分页布局
- **AND** 页面 SHALL NOT 因消费者级 padding、margin 或额外外框造成与群组列表边界不一致
