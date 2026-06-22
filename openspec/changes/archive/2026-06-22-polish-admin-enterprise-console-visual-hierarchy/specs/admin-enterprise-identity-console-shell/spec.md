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
- **AND** 顶部 header SHALL 提供侧边栏收起/展开控制，但该控制只影响左侧导航区域
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

#### Scenario: 移动端不套用桌面收起状态
- **WHEN** 管理员在移动端或窄屏打开 Admin 壳层
- **THEN** Shell SHALL 继续使用现有移动 Drawer 导航行为
- **AND** 桌面 collapsed 持久化状态 SHALL NOT 强制改变移动 Drawer 的宽度、文案或可点击区域

#### Scenario: 收起侧边栏二级入口可达
- **WHEN** 管理员在桌面端收起左侧侧边栏
- **THEN** 含有子菜单的父级 icon SHALL 仍可通过 click 或 hover 打开二级菜单弹层或等效入口
- **AND** 二级入口 SHALL 继续使用既有路由、权限过滤和 AntD Menu 语义
- **AND** Shell SHALL NOT 因收起侧边栏而完全失去子菜单导航能力

#### Scenario: 侧边栏切换不制造页面级横向溢出
- **WHEN** 管理员在桌面端展开或收起侧边栏
- **THEN** 主内容区、workspace tabs、表格和页面工具栏 SHALL 随侧边栏宽度变化保持对齐
- **AND** Shell 根文档 SHALL NOT 因侧边栏宽度切换产生页面级横向溢出
- **AND** 需要横向滚动的表格或标签区 SHALL 在自身容器内滚动

## ADDED Requirements

### Requirement: 工作区标签关闭入口直接可见
Admin 身份控制台 workspace tabs SHALL 在桌面端为每个可关闭标签提供直接可见的关闭 affordance，并继续保证移动端和键盘用户不依赖右键菜单完成关闭。

#### Scenario: 桌面标签关闭按钮可见
- **WHEN** 管理员在桌面端查看可关闭 workspace tab
- **THEN** 每个可关闭标签 SHALL 直接显示关闭按钮
- **AND** 关闭按钮 SHALL 在非 hover 状态下仍具有可辨识的图标、边界或背景
- **AND** 关闭按钮 SHALL 具备可访问名称并保留 hover 与 focus-visible 状态

#### Scenario: 总览普通标签关闭后 fallback
- **WHEN** 管理员关闭 `身份总览` 或执行 `关闭所有` 后没有其它标签可用
- **THEN** Shell SHALL 自动导航到 `/`
- **AND** Shell SHALL 重新打开一个普通 `身份总览` fallback 标签
- **AND** 该 fallback 标签 SHALL 继续位于横向滚动轨道内而不是固定区域

### Requirement: 企业控制台视觉层级 polish
Admin 身份控制台 SHALL 使用浅冷灰页面画布、清晰 shell 分层、白底卡片、克制状态色和更强 summary band，使总览和通用壳层更像成熟企业控制台，同时保持工作型后台信息密度。

#### Scenario: 桌面总览视觉层级
- **WHEN** 管理员在 `1440x900` 桌面视口打开 `/`
- **THEN** 页面底色、顶部栏、侧边栏、workspace tabs 和内容区 SHALL 形成可辨识层级，而不是大面积纯白线框后台
- **AND** summary band SHALL 让指标数字、状态和主要操作更容易扫描
- **AND** 卡片 SHALL 保持白底，并通过边框、轻阴影、状态色左条或角标表达层级

#### Scenario: 状态色克制且不更换 icon
- **WHEN** 页面展示审计、风险、健康或指标状态
- **THEN** UI SHALL 使用正常、待关注、高影响等克制功能色辅助扫描
- **AND** 紫色 SHALL 只作为主品牌色之一，并配合蓝、青、橙等功能色避免整页单色调
- **AND** 现有 icon SHALL 保持，不得替换为另一套 icon 风格

#### Scenario: 移动端视觉 polish 不破坏降级栏
- **WHEN** 管理员在 `390x844` 移动视口打开身份控制台
- **THEN** 移动 Drawer、workspace tabs 降级栏和主要内容 SHALL 不出现文本重叠
- **AND** Shell 根文档 SHALL NOT 产生页面级横向溢出
