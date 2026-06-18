## ADDED Requirements

### Requirement: WeCom 正式同步记录使用紧凑序号列
Web Admin 企业微信正式同步记录表 SHALL 默认使用分页连续序号作为首列，同时保留完整运行 ID 的排障入口。

#### Scenario: 展示企业微信同步记录序号并保留运行 ID
- **WHEN** 企业微信组织同步页面渲染正式同步记录
- **THEN** 表格首列 SHALL 展示 `序号`
- **AND** 序号 SHALL 按当前分页和 pageSize 计算连续位置
- **AND** 完整运行 ID SHALL 继续作为稳定 row key 使用
- **AND** 管理员 SHALL 能通过序号单元格查看或复制完整运行 ID

### Requirement: WeCom 正式同步记录保持紧凑扫读
Web Admin 企业微信正式同步记录表 SHALL 避免长执行人和数字统计破坏行高与扫读节奏。

#### Scenario: 企业微信同步记录长文本和数字稳定展示
- **WHEN** 企业微信组织同步页面渲染正式同步记录
- **THEN** 执行人列 SHALL 默认省略长文本并允许查看完整值
- **AND** 部门和用户统计单元格 SHALL 使用稳定数字宽度样式
