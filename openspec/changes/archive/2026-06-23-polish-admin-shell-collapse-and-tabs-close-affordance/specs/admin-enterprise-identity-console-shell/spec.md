## MODIFIED Requirements

### Requirement: Shell 边界与安全降级
身份控制台 Shell SHALL 只做只读总览、导航重组和既有入口聚合，不得触发认证、同步、Gateway projection publish、重试或真实环境探测等写入/执行行为。

#### Scenario: 总览展示同步与投影状态
- **WHEN** 总览展示企业微信、飞书、OIDC、API 映射或 Gateway 投影相关状态
- **THEN** 页面仅展示只读状态、巡检提示或跳转入口
- **AND** 不调用会改变认证链路、组织同步或 projection publish 状态的接口

#### Scenario: 无权限或无数据
- **WHEN** 当前账号无权访问某些身份控制台入口或相关数据为空
- **THEN** 页面展示无权限/无数据状态
- **AND** 不暴露隐藏入口、真实组织树、真实用户明细或敏感环境信息

#### Scenario: 桌面侧边栏宽度和收起能力
- **WHEN** 管理员在桌面端打开 Admin 壳层
- **THEN** 左侧侧边栏展开态 SHALL 使用约 `220px` 到 `224px` 的管理台宽度
- **AND** 左侧侧边栏内部 SHALL 提供收起/展开控制，且该控制只影响左侧导航区域
- **AND** 顶部 header SHALL NOT 承载桌面侧边栏收起/展开控制
- **AND** 收起态侧边栏 SHALL 使用约 `64px` 到 `72px` 的 icon-only 宽度
- **AND** 收起态菜单 SHALL 隐藏文字但保留图标识别和 hover tooltip 或 title 文本

#### Scenario: 顶部品牌区紧凑单行且不被侧边栏收起
- **WHEN** 管理员在桌面端打开 Admin 壳层
- **THEN** 顶部品牌区 SHALL 显示 logo、`AICodex Admin` 主品牌文本和较弱的 `认证中心` 模块名
- **AND** 主品牌与模块名 SHALL 使用中点或轻分隔形成一行紧凑品牌块
- **AND** 顶部品牌区 SHALL NOT 使用旧的紫色胶囊样式承载模块名
- **WHEN** 管理员将桌面侧边栏收起
- **THEN** 顶部品牌、全局操作、右上工具区和租户下拉 SHALL 保持完整横向 header 呈现
- **AND** 收起/展开 SHALL NOT 把全局 header 压缩成仅 logo 或仅图标状态

#### Scenario: 桌面收起状态持久化
- **WHEN** 管理员在桌面端切换侧边栏收起状态后刷新页面
- **THEN** Shell SHALL 从本地浏览器存储恢复最近一次桌面收起状态
- **AND** 如果存储内容不可读取或不是有效布尔值，Shell SHALL 安全回到展开态

#### Scenario: 桌面侧边栏切换不闪烁
- **WHEN** 管理员在桌面端点击侧边栏收起或展开按钮
- **THEN** Sider 宽度、主内容左边界和 Menu collapsed 状态 SHALL 同步完成
- **AND** Shell SHALL NOT 展示菜单文字、图标或侧栏宽度分阶段切换造成的闪烁
- **AND** 侧栏 hover 背景与文字颜色反馈 SHALL 保持可用

#### Scenario: 移动端不套用桌面收起状态
- **WHEN** 管理员在移动端或窄屏打开 Admin 壳层
- **THEN** Shell SHALL 继续使用现有移动 Drawer 导航行为
- **AND** 桌面 collapsed 持久化状态 SHALL NOT 强制改变移动 Drawer 的宽度、文案或可点击区域

#### Scenario: 收起侧边栏二级入口可达
- **WHEN** 管理员在桌面端收起左侧侧边栏
- **THEN** 含有子菜单的父级 icon SHALL 仍可通过 click 或 hover 打开二级菜单弹层或等效入口
- **AND** 二级入口 SHALL 继续使用既有路由、权限过滤和 AntD Menu 语义
- **AND** Shell SHALL NOT 因收起侧边栏而完全失去子菜单导航能力

#### Scenario: 桌面侧边栏高度独立于内容页
- **WHEN** 管理员在桌面端打开内容高度超过视口的 Admin 页面
- **THEN** 左侧侧边栏 SHALL 按顶部 header 下方的可视高度布局
- **AND** 左侧侧边栏 SHALL NOT 被右侧内容页高度拉伸
- **AND** 左侧菜单项超过侧边栏可视高度时 SHALL 在菜单区域内出现独立垂直滚动
- **AND** 侧边栏收起/展开按钮 SHALL 保持在侧边栏底部，展开态靠右、收起态居中
- **AND** 右侧内容需要纵向滚动时 SHALL 在右侧内容区域内滚动

#### Scenario: 侧边栏切换不制造页面级横向溢出
- **WHEN** 管理员在桌面端展开或收起侧边栏
- **THEN** 主内容区、workspace tabs、表格和页面工具栏 SHALL 随侧边栏宽度变化保持对齐
- **AND** Shell 根文档 SHALL NOT 因侧边栏宽度切换产生页面级横向溢出
- **AND** 需要横向滚动的表格或标签区 SHALL 在自身容器内滚动

#### Scenario: 登录后管理台不展示底部品牌 footprint
- **WHEN** 管理员登录后进入 Admin 身份控制台 Shell
- **THEN** Shell SHALL NOT 在主内容底部展示 `Powered by` 或等价品牌 footer footprint
- **AND** 入口页、登录页或组织自定义 footer SHALL NOT 因此被移除
- **AND** 既有隐藏账号桥接字段 SHALL 保持可用

### Requirement: 工作区标签关闭入口直接可见
Admin 身份控制台 workspace tabs SHALL 在桌面端提供一个直接可见的标签栏级关闭入口，并为单个可关闭标签提供 active、hover 或 focus 状态下的关闭 affordance；移动端和键盘用户不得依赖右键菜单完成关闭。

#### Scenario: 桌面标签关闭入口降噪
- **WHEN** 管理员在桌面端查看可关闭 workspace tabs
- **THEN** 标签栏 SHALL 提供直接可见的 icon-only 全局关闭菜单入口
- **AND** 全局关闭菜单 SHALL 提供 `关闭当前`、`关闭其他` 和 `关闭所有`
- **AND** 当前 active 标签的单标签关闭按钮 SHALL 默认可见
- **AND** 非活动标签的单标签关闭按钮 SHALL 仅在 hover、focus 或等效上下文状态下显示
- **AND** 单标签关闭按钮 SHALL 具备可访问名称并保留 hover 与 focus-visible 状态

#### Scenario: 桌面标签栏与内容区分隔克制
- **WHEN** 管理员在桌面端查看 workspace tabs 与页面内容之间的过渡区域
- **THEN** Shell SHALL 使用细分隔线表达标签栏边界
- **AND** Shell SHALL NOT 在标签栏下方额外展示明显高度的蓝灰色分隔带
- **AND** 标签栏、页面背景和内容卡片 SHALL NOT 形成过多横向颜色层
- **AND** 桌面标签栏 SHALL 使用紧凑高度，普通标签高度 SHOULD 接近 `30px`，整行高度 SHOULD 接近 `36px`
- **AND** 桌面内容区在标签栏下方 SHALL 使用紧凑但可读的起始留白，顶部 SHOULD 接近 `12px`，左右 SHOULD 接近 `16px`
- **AND** 移动端标签降级 SHALL NOT 因桌面紧凑高度而降低触控可达性

#### Scenario: 新旧内容页边界一致
- **WHEN** 管理员在 desktop Shell 中从 workspace tabs 切换到旧版 Card 承载页或新版无外层 Card 页面
- **THEN** 页面内容 SHALL 在标签栏下方使用一致的顶部留白、左右内缩和轻量卡片边界
- **AND** 旧版 Card 承载页 SHALL NOT 贴着标签栏或侧栏边界形成与新版身份页明显不同的分界
- **AND** 该一致性调整 SHALL NOT 改变业务页面表格、查询、排序、分页或操作语义

#### Scenario: 桌面非活动标签视觉降权
- **WHEN** 管理员在桌面端查看多个 workspace tabs
- **THEN** 当前 active 标签 SHALL 作为唯一主要焦点，保留白底、克制的蓝色顶边和较高文字权重
- **AND** 非 active 标签 SHALL 使用更轻的边框、文字权重和状态点
- **AND** 左右滚动按钮与标签栏级关闭入口 SHALL 在常态下低于 active 标签视觉权重
- **AND** 标签栏级关闭入口 SHALL 保留可识别的关闭图标和可访问名称
- **AND** active 标签的单标签关闭按钮 SHALL NOT 在常态下使用高权重蓝底或 primary button 观感

#### Scenario: 桌面标签横向滚动按段移动
- **WHEN** 管理员点击 workspace tabs 左右滚动按钮
- **THEN** 标签轨道 SHALL 按较小段距平滑滚动
- **AND** 单次点击 SHOULD NOT 在常见桌面宽度下一次性跳到最左或最右
- **AND** 左右滚动按钮 SHALL 继续只在对应方向存在隐藏标签时可用

#### Scenario: 总览普通标签关闭后 fallback
- **WHEN** 管理员关闭 `身份总览` 或执行 `关闭所有` 后没有其它标签可用
- **THEN** Shell SHALL 自动导航到 `/`
- **AND** Shell SHALL 重新打开一个普通 `身份总览` fallback 标签
- **AND** 该 fallback 标签 SHALL 继续位于横向滚动轨道内而不是固定区域

## ADDED Requirements

### Requirement: Shell 侧栏选中态层级
Admin 身份控制台桌面侧栏 SHALL 让当前叶子菜单项承担主要选中态，父级菜单只表达展开或归属关系，不得与当前子项同时使用同等级高权重强调。

#### Scenario: 当前子项为主要选中态
- **WHEN** 管理员打开某个二级导航页面
- **THEN** 当前子项 SHALL 使用主要选中底色、文字色或左侧强调条
- **AND** 对应父级 SHALL 使用更轻的背景或文字色提示归属
- **AND** 父级 SHALL NOT 与当前子项同时显示同等级粗紫色左条

#### Scenario: 收起态保持父级入口可达
- **WHEN** 管理员收起桌面侧栏
- **THEN** 父级 icon SHALL 继续作为二级入口的可达触发点
- **AND** 轻量父级归属样式 SHALL NOT 破坏 AntD collapsed submenu popup 行为
