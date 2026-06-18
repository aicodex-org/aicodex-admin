## ADDED Requirements

### Requirement: Feishu 正式同步记录统计表头保持单行
Web Admin 飞书/Lark 正式同步记录表 SHALL 使用紧凑统计列表头，让主要运行记录保持紧凑且易扫读。

#### Scenario: 展示紧凑的飞书运行统计表头
- **WHEN** 飞书/Lark 组织同步页面渲染正式同步记录
- **THEN** 部门统计列表头 SHALL 为 `部门`
- **AND** 用户统计列表头 SHALL 为 `用户`
- **AND** 关系统计列表头 SHALL 为 `关系`
- **AND** 每个统计单元格 SHALL 继续使用既有 `新 / 更 / 禁` 格式展示新增、更新和禁用数量
- **AND** 统计表头 SHALL NOT 因内嵌说明文字而换行
