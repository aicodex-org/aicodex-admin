## ADDED Requirements

### Requirement: 身份资产关系页自定义 surface 暗黑主题一致性
身份资产关系页与对象详情证据区 SHALL 在明亮与暗黑模式下复用共享主题 token 呈现关系 selector、摘要区、详情折叠区和复制反馈状态，不得残留固定浅色 surface 或对比失衡的证据块。

#### Scenario: 暗黑模式查看关系 selector 与摘要
- **WHEN** 管理员在暗黑模式下访问 `/identity-assets` 或打开关系/证据详情
- **THEN** 关系 selector、hover/active 状态、摘要区、meta 信息和折叠区 SHALL 使用暗黑主题 surface、border 和 text token
- **AND** 页面 SHALL NOT 在暗黑背景上留下白底 selector、白色摘要块或过亮边框

#### Scenario: 复制与脱敏证据状态在双主题下可辨
- **WHEN** 管理员在关系页或关联证据详情中执行复制、展开或查看脱敏证据
- **THEN** 默认、hover、复制成功和复制失败状态 SHALL 在明亮与暗黑模式下都保持可辨识
- **AND** 复制入口 SHALL 继续只复制脱敏后的展示内容
