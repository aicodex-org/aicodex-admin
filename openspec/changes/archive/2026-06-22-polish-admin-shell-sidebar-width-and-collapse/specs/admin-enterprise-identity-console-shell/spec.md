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
- **AND** header 品牌/标题区域 SHALL 提供侧边栏收起/展开控制
- **AND** 收起态侧边栏 SHALL 使用约 `64px` 到 `72px` 的 icon-only 宽度
- **AND** 收起态菜单 SHALL 隐藏文字但保留图标识别和 hover tooltip 或 title 文本

#### Scenario: 左上品牌区紧凑单行
- **WHEN** 管理员在桌面展开态打开 Admin 壳层
- **THEN** 左上品牌区 SHALL 显示 logo、`AICodex Admin` 主品牌文本和较弱的 `认证中心` 模块名
- **AND** 主品牌与模块名 SHALL 使用中点或轻分隔形成一行紧凑品牌块
- **AND** 左上品牌区 SHALL NOT 使用旧的紫色胶囊样式承载模块名
- **WHEN** 管理员将桌面侧边栏收起
- **THEN** 左上品牌区 SHALL 只保留 logo
- **AND** `AICodex Admin` 和 `认证中心` 文本 SHALL 不占用可见宽度

#### Scenario: 桌面收起状态持久化
- **WHEN** 管理员在桌面端切换侧边栏收起状态后刷新页面
- **THEN** Shell SHALL 从本地浏览器存储恢复最近一次桌面收起状态
- **AND** 如果存储内容不可读取或不是有效布尔值，Shell SHALL 安全回到展开态

#### Scenario: 移动端不套用桌面收起状态
- **WHEN** 管理员在移动端或窄屏打开 Admin 壳层
- **THEN** Shell SHALL 继续使用现有移动 Drawer 导航行为
- **AND** 桌面 collapsed 持久化状态 SHALL NOT 强制改变移动 Drawer 的宽度、文案或可点击区域

#### Scenario: 侧边栏切换不制造页面级横向溢出
- **WHEN** 管理员在桌面端展开或收起侧边栏
- **THEN** 主内容区、workspace tabs、表格和页面工具栏 SHALL 随侧边栏宽度变化保持对齐
- **AND** Shell 根文档 SHALL NOT 因侧边栏宽度切换产生页面级横向溢出
- **AND** 需要横向滚动的表格或标签区 SHALL 在自身容器内滚动

### Requirement: 桌面工作区多标签
Admin 身份控制台 Shell SHALL 在桌面端 header 下方、主内容区上方展示 route-driven workspace tabs，用于表示当前工作会话中已打开的页面；左侧菜单仍负责主导航，标签栏不得替代或扩张一级菜单体系。

#### Scenario: 总览标签作为普通标签进入滚动轨道
- **WHEN** workspace tabs 渲染打开页面
- **THEN** `/` 总览类标签 SHALL 作为普通工作标签进入同一个横向滚动轨道
- **AND** 总览标签 SHALL NOT 固定在独立左侧区域
- **AND** 总览标签 SHALL 使用与其它标签一致的 active、hover、focus、右键菜单和关闭能力规则
- **AND** 如果关闭动作导致没有任何标签可用，Shell SHALL 自动回到 `/` 并重新打开普通总览 fallback 标签

#### Scenario: 桌面端标签区横向滚动
- **WHEN** 打开的标签数量超过桌面端标签可视宽度
- **THEN** Shell SHALL 使用单行横向滚动标签区展示已打开页面
- **AND** 标签顺序 SHALL 保持当前打开顺序稳定
- **AND** 激活已打开标签 SHALL NOT 重排标签顺序
- **AND** 当前激活标签切换时 SHALL 自动滚动到可视区

#### Scenario: 滚动箭头位于标签轨道两侧
- **WHEN** 滚动标签区左侧存在不可见标签
- **THEN** 左滚动箭头 SHALL 显示在标签轨道左侧
- **AND** 如果已滚到最左侧，左滚动箭头 SHALL 不显示或不占用可交互焦点
- **WHEN** 滚动标签区右侧存在不可见标签
- **THEN** 右滚动箭头 SHALL 显示在标签轨道右侧
- **AND** 如果已滚到最右侧，右滚动箭头 SHALL 不显示或不占用可交互焦点

#### Scenario: 桌面右键关闭菜单
- **WHEN** 管理员在桌面端右键某个 workspace tab
- **THEN** Shell SHALL 打开该标签上下文关闭菜单
- **AND** 菜单 SHALL 提供 `关闭当前`、`关闭左侧`、`关闭右侧`、`关闭其他`、`关闭所有`
- **AND** `关闭左侧` 与 `关闭右侧` SHALL 按当前右键目标标签两侧的标签集合计算，不依赖当前激活页
- **AND** `关闭其他` SHALL 保留右键目标标签并关闭其它可关闭标签
- **AND** `关闭所有` SHALL 导航到 `/` 并重新打开普通 `身份总览` fallback 标签

#### Scenario: 右键菜单不是唯一关闭入口
- **WHEN** 桌面右键菜单可用
- **THEN** 每个可关闭标签仍 SHALL 提供可见关闭按钮或等效可访问关闭操作
- **AND** 键盘用户 SHALL 能通过现有可见关闭 affordance 完成单标签关闭
- **AND** 移动端 SHALL NOT 依赖右键菜单才能关闭或切换工作页面

#### Scenario: 桌面标签栏不制造页面级横向溢出
- **WHEN** 桌面端标签数量很多或侧边栏在展开/收起之间切换
- **THEN** 标签栏主要降级手段 SHALL 是自身横向滚动
- **AND** 标签栏 SHALL NOT 导致页面级横向溢出
- **AND** 右键菜单、单标签关闭按钮和滚动箭头 SHALL 保持稳定高度，不挤压主内容区

### Requirement: 移动端工作区标签降级
Admin 身份控制台 Shell SHALL 在移动端避免渲染完整多标签栏，改为展示当前页面标题或路径以及一个“更多”入口，以保护首屏空间和可读性。

#### Scenario: 移动端不展示完整 tabs
- **WHEN** 管理员在 `390x844` 或等价移动视口打开身份控制台页面
- **THEN** Shell SHALL NOT 渲染完整桌面多标签列表
- **AND** Shell SHALL 展示当前页面标题或 route 路径
- **AND** Shell SHALL 提供“更多”入口访问已打开工作页面

#### Scenario: 移动端无页面级横向溢出
- **WHEN** 管理员在移动端打开 `/`、`/applications`、`/providers`、`/records`、`/organizations`、`/users` 或 `/agents`
- **THEN** workspace tabs 降级栏 SHALL NOT 导致 `document.documentElement.scrollWidth` 大于 `document.documentElement.clientWidth + 1`
- **AND** 主内容首屏 SHALL NOT 因标签栏明显下沉

#### Scenario: 移动端关闭入口不依赖右键
- **WHEN** 管理员在移动端打开 workspace tabs 更多菜单
- **THEN** 菜单 SHALL 继续提供已打开工作页面的导航入口
- **AND** 可关闭标签 SHALL 保留移动端可触达的关闭按钮或等效操作
- **AND** 桌面右键关闭菜单 SHALL NOT 成为移动端完成关闭动作的唯一入口

### Requirement: 工作区标签状态轻量持久化
Admin 身份控制台 Shell SHALL 通过 route-driven state 和浏览器会话级存储轻量保存已打开标签，不得依赖 iframe、复杂 keep-alive 或跨页面业务状态缓存。

#### Scenario: 会话内恢复打开标签
- **WHEN** 管理员在同一浏览器会话中刷新 Admin 页面
- **THEN** Shell MAY 从 sessionStorage 恢复已打开标签顺序
- **AND** 如果存储内容不可解析、版本不匹配或包含无效路径，Shell SHALL 安全降级为当前有效 route 加普通总览 fallback 标签

#### Scenario: 不缓存业务页面状态
- **WHEN** 管理员在标签间切换
- **THEN** Shell SHALL 使用现有 React route 渲染对应页面
- **AND** Shell SHALL NOT 使用 iframe、隐藏页面 keep-alive 或本地伪造页面状态替代真实 route 行为

#### Scenario: 关闭全部后恢复总览 fallback
- **WHEN** 管理员通过桌面右键菜单或等效批量动作执行 `关闭所有`
- **THEN** Shell SHALL 清空当前可关闭标签集合
- **AND** Shell SHALL 导航到 `/`
- **AND** Shell SHALL 打开一个普通 `身份总览` fallback 标签并持久化该状态
