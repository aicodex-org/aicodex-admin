## ADDED Requirements

### Requirement: 控制台页面页头固定与正文内部滚动
Admin 身份控制台桌面壳层 SHALL 让工作区标签、页面页头和正文滚动边界清晰分离；长内容页面必须在正文容器内滚动，而不是把整个文档页面一起向下推走。

#### Scenario: 桌面端长页面保持标签和页头可见
- **WHEN** 管理员在桌面端打开 `/`、`/organizations`、`/server-store` 或等价的长内容身份控制台页面
- **THEN** workspace tabs 和页面页头 SHALL 保持在正文滚动容器上方可见
- **AND** 纵向滚动 SHALL 发生在当前页面正文容器内
- **AND** 根文档 SHALL NOT 因页面正文变长而承担主要纵向滚动

#### Scenario: 共享页壳提供统一滚动边界
- **WHEN** 页面采用身份控制台共享页面壳
- **THEN** 页面 SHALL 拆分为非滚动的 header 区和可滚动的 body 区
- **AND** body 区 SHALL 负责正文纵向滚动和 overscroll containment
- **AND** 页头区域 SHALL NOT 因正文变长而一起离开当前内容视口

#### Scenario: 旧 Card 页面接入后保持统一起始节奏
- **WHEN** 旧版 Card 承载页在身份控制台桌面壳层内渲染
- **THEN** 页面顶部、左右内边距和卡片外边距 SHALL 与新版无外层 Card 页面保持同一套起始节奏
- **AND** 工作区标签下方 SHALL NOT 因额外包裹层出现明显空带或分隔噪声

#### Scenario: 窄屏下保持单一可用滚动路径
- **WHEN** 管理员在窄屏或移动端打开采用共享页壳的页面
- **THEN** 页面 SHALL 保持单一可用的纵向滚动路径
- **AND** 共享页壳 SHALL NOT 额外制造难以触达的双重纵向滚动区域

### Requirement: 总览与工具页共享紧凑页头密度
Admin 身份控制台总览页和接入共享页面壳的工具页 SHALL 使用一致的页头留白、标题层级和工具栏起始节奏，并对总览右侧状态区进行降噪。

#### Scenario: 总览页头紧凑化
- **WHEN** 管理员访问 `/`
- **THEN** 页面主标题、描述、操作按钮和正文起始留白 SHALL 使用紧凑页头密度
- **AND** 页面 SHALL NOT 再额外展示与主标题重复的 eyebrow breadcrumb
- **AND** 总览右侧状态区 SHALL 使用更紧凑的列表节奏，而不是连续重卡片观感

#### Scenario: 工具页沿用同一页壳节奏
- **WHEN** 管理员访问 `/server-store` 或其他接入共享页面壳的工具页
- **THEN** 页面标题区、筛选工具栏与正文之间 SHALL 使用与身份控制台页面一致的基础间距和滚动边界
- **AND** 页面 SHALL NOT 因单独实现而出现与总览明显不同的顶部留白或滚动行为
