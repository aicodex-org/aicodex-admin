## ADDED Requirements

### Requirement: 接入向导块级 surface 暗黑主题一致性
接入向导页面 SHALL 在明亮与暗黑模式下使用共享主题 token 呈现 domain card、步骤面板、检查项、结果摘要、证据块和治理任务块，使暗黑模式下的步骤结构、状态层级和结果区域保持清晰可读。

#### Scenario: 暗黑模式下向导卡片和步骤面板保持可读
- **WHEN** 管理员在暗黑模式下访问 `/access-wizard`
- **THEN** domain card、active card、step panel、check item、result object 和 evidence block SHALL 使用暗黑主题 surface、border 和 text token
- **AND** 页面 SHALL NOT 在暗黑背景上留下白底 domain card、亮色步骤面板或失真的结果块

#### Scenario: 选择态与状态态不依赖固定浅色背景
- **WHEN** 向导展示选中对象、阻塞项、已检查项或状态徽记
- **THEN** active、hover 和状态强调 SHALL 在双主题下保持清晰区分
- **AND** 实现 SHALL NOT 依赖固定浅色背景来表达可选中、已选中或已检查状态
