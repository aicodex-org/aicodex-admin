## ADDED Requirements

### Requirement: Feishu 正式同步记录使用紧凑序号列
Web Admin 飞书/Lark 正式同步记录表 SHALL 默认使用分页连续序号作为首列，同时保留完整运行 ID 的排障入口。

#### Scenario: 展示飞书同步记录序号并保留运行 ID
- **WHEN** 飞书/Lark 组织同步页面渲染正式同步记录
- **THEN** 表格首列 SHALL 展示 `序号`
- **AND** 序号 SHALL 按当前分页和 pageSize 计算连续位置
- **AND** 完整运行 ID SHALL 继续作为稳定 row key 使用
- **AND** 管理员 SHALL 能通过序号单元格查看或复制完整运行 ID

### Requirement: Feishu 正式同步记录和定时同步保持紧凑一致
Web Admin 飞书/Lark 组织同步页面 SHALL 保持正式同步记录和定时同步配置与企业微信基础同步页的展示节奏一致。

#### Scenario: 飞书同步记录长文本和数字稳定展示
- **WHEN** 飞书/Lark 组织同步页面渲染正式同步记录
- **THEN** 执行人列 SHALL 默认省略长文本并允许查看完整值
- **AND** 部门、用户和关系统计单元格 SHALL 使用稳定数字宽度样式
- **AND** `错误摘要` 表头 SHALL 保持单行展示

#### Scenario: 飞书定时同步输入展示字段标签
- **WHEN** 飞书/Lark 组织同步页面渲染定时同步配置
- **THEN** Cron 输入 SHALL 展示 `Cron 表达式` 标签
- **AND** 时区输入 SHALL 展示 `时区` 标签
