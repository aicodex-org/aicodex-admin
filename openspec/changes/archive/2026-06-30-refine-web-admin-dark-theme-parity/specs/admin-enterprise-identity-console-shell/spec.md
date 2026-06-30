## ADDED Requirements

### Requirement: 身份控制台共享页壳暗黑主题一致性
Admin 身份控制台共享 shell 与共享页壳 SHALL 通过统一主题 token 驱动外层画布、panel、toolbar 辅助区、分隔线和次级文本，在明亮与暗黑模式切换后保持一致层级，不得让近期接入共享页壳的页面残留固定浅色 surface。

#### Scenario: 暗黑模式下共享页壳不出现白色孤岛
- **WHEN** 管理员在桌面端切换到暗黑模式并访问采用共享 shell 或共享页壳的身份控制台页面
- **THEN** 页头下方的正文容器、outer panel、toolbar 辅助区和分页邻接区域 SHALL 使用暗黑主题 surface、border 和 text token
- **AND** 页面 SHALL NOT 留下显著白色外层 panel、白色分隔带或与壳层脱节的浅色信息块

#### Scenario: 页面局部自定义块复用共享主题边界
- **WHEN** 共享页壳消费者需要渲染页面局部自定义卡片、状态块、结果块、证据块或摘要条
- **THEN** 这些局部 surface SHALL 复用共享 `--admin-shell-*` 或 `--list-page-*` 主题 token
- **AND** 实现 SHALL NOT 改变既有页头固定、正文内部滚动和列表主任务优先的壳层语义

#### Scenario: 非列表型 AntD Card 页不落回默认黑色控件
- **WHEN** 管理员在暗黑模式下访问 API 网关映射或其它未改造成标准分页列表的配置/诊断型页面
- **THEN** 页面内 Card、Tabs、表单控件、默认按钮、表格、空态和默认 Tag SHALL 使用共享 shell surface、border 和 text token
- **AND** 页面 SHALL NOT 因 Ant Design 默认 `rgb(20,20,20)` surface 或纯黑控件造成与共享列表壳不一致的视觉断层

#### Scenario: Cardless 路由保持侧栏与正文间距层级
- **WHEN** 管理员在桌面端访问企业微信同步、飞书同步或其它 cardless 配置页
- **THEN** 正文滚动区 SHALL 在侧栏右侧保持与普通 Card/List 路由一致的内容间距和层级
- **AND** 该间距 SHALL NOT 改变 without-card 路由的内部滚动语义或普通 Card/List 路由的布局节奏

#### Scenario: 路由与页面壳共享同一套边界 spacing
- **WHEN** 管理员访问普通 Card route、cardless route 或使用 PageScrollShell 的管理页面
- **THEN** 页面外层横向间距、顶部间距和底部间距 SHALL 通过同一套 route/page shell spacing token 表达
- **AND** 页面消费者 SHALL NOT 再叠加第二套外层 margin/padding 造成组织、群组、用户、同步页或系统工具页边界不一致

#### Scenario: 系统信息页不使用旧大 Card route 和窄列布局
- **WHEN** 管理员在桌面端访问 `/sysinfo`
- **THEN** 系统信息页 SHALL 走 cardless route，工作页标签保持固定，正文内部滚动
- **AND** CPU、内存、磁盘、网络、API 延迟、API 吞吐量和 About 信息 SHALL 使用共享 shell surface、border 和 text token 呈现为诊断面板布局
- **AND** 页面 SHALL NOT 回退到旧的外层大 Card、居中窄列或由 API 长表直接拖长整个页面的布局

#### Scenario: MCP Store 卡片目录页使用共享 card catalog surface
- **WHEN** 管理员在桌面端访问 `/server-store`
- **THEN** MCP Store SHALL 走 cardless route，工作页标签保持固定，筛选工具栏和卡片目录在正文内部滚动
- **AND** 筛选输入、Tag 选择器、默认按钮、目录卡片、Tag、链接和添加按钮 SHALL 使用共享 shell surface、border、text 和 link token
- **AND** 页面 SHALL NOT 回退到旧的外层大 Card、纯黑卡片或标题挤压“添加”按钮的布局
