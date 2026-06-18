## ADDED Requirements

### Requirement: Feishu 同步记录运行 ID 复制入口保持二级
Web Admin 飞书/Lark 正式同步记录表 SHALL 默认保持 `序号` 列简洁，同时保留完整运行 ID 的查看和复制能力。

#### Scenario: 序号列不常驻复制图标
- **WHEN** 飞书/Lark 组织同步页面渲染正式同步记录
- **THEN** `序号` 列 SHALL 默认只展示分页连续数字
- **AND** 表格 SHALL NOT 在每个序号旁常驻展示复制图标
- **AND** 管理员 SHALL 能通过 hover 序号查看完整运行 ID
- **AND** 管理员 SHALL 能通过点击序号复制完整运行 ID

### Requirement: Feishu 定时同步关闭时收起高级字段
Web Admin 飞书/Lark 组织同步页面 SHALL 在定时同步未启用时收起 Cron、时区和最近调度字段，以保持基础配置区紧凑。

#### Scenario: 定时同步未启用时显示紧凑状态
- **WHEN** 飞书/Lark 组织同步页面渲染且定时同步未启用
- **THEN** 页面 SHALL 展示启用定时同步开关
- **AND** 页面 SHALL 展示紧凑的未启用状态提示
- **AND** 页面 SHALL NOT 展示 Cron 表达式输入、时区输入或最近调度文本

#### Scenario: 定时同步启用后展开配置字段
- **WHEN** 管理员启用飞书/Lark 定时同步
- **THEN** 页面 SHALL 展示 `Cron 表达式` 输入
- **AND** 页面 SHALL 展示 `时区` 输入
- **AND** 页面 SHALL 展示最近调度信息
