## ADDED Requirements

### Requirement: 桌面工作区多标签
Admin 企业认证中心 Shell SHALL 在桌面端 header 下方、主内容区上方展示 route-driven workspace tabs，用于表示当前工作会话中已打开的页面；左侧菜单仍负责主导航，标签栏不得替代或扩张一级菜单体系。

#### Scenario: 桌面端打开页面生成标签
- **WHEN** 管理员在桌面端通过左侧菜单或 deep link 访问 `/applications`、`/providers`、`/records`、`/organizations`、`/users`、`/agents` 或其它可见企业认证中心路由
- **THEN** Shell SHALL 在 header 下方展示对应工作页面标签
- **AND** 当前 route 的标签 SHALL 以克制蓝色文字、蓝点或上边线/边框表达激活态
- **AND** 非激活标签 SHALL 使用低对比灰底灰字
- **AND** 左侧菜单选中态和原有 route 渲染 SHALL 保持不变

#### Scenario: 总览标签固定不可关闭
- **WHEN** workspace tabs 渲染打开页面
- **THEN** `/` 总览类标签 SHALL 始终存在
- **AND** 总览标签 SHALL 不展示关闭按钮
- **AND** 关闭其它标签 SHALL NOT 移除总览标签

#### Scenario: 关闭标签时导航到可用页面
- **WHEN** 管理员关闭一个非当前标签
- **THEN** 当前页面 SHALL 保持不变
- **WHEN** 管理员关闭当前激活标签
- **THEN** Shell SHALL 导航到最近仍打开的标签
- **AND** 如果没有其它非固定标签可用，Shell SHALL 导航到 `/`

#### Scenario: 标签数量受控
- **WHEN** 打开的工作页面超过 8 个
- **THEN** Shell SHALL 只在标签栏直接展示约 8 个标签
- **AND** 其它标签 SHALL 通过“更多”菜单或等价降级入口可达
- **AND** 标签栏 SHALL NOT 让页面出现无限横向撑开或页面级横向溢出

#### Scenario: 标签栏与内容区分隔清晰
- **WHEN** 管理员打开任一桌面企业认证中心页面
- **THEN** 标签栏与主页面内容之间 SHALL 使用 `1px` 分隔线和 `6-8px` 浅灰 gutter/divider
- **AND** 标签栏 SHALL NOT 贴住页面标题、筛选区或主表格工具栏

### Requirement: 移动端工作区标签降级
Admin 企业认证中心 Shell SHALL 在移动端避免渲染完整多标签栏，改为展示当前页面标题或路径以及一个“更多”入口，以保护首屏空间和可读性。

#### Scenario: 移动端不展示完整 tabs
- **WHEN** 管理员在 `390x844` 或等价移动视口打开企业认证中心页面
- **THEN** Shell SHALL NOT 渲染完整桌面多标签列表
- **AND** Shell SHALL 展示当前页面标题或 route 路径
- **AND** Shell SHALL 提供“更多”入口访问已打开工作页面

#### Scenario: 移动端无页面级横向溢出
- **WHEN** 管理员在移动端打开 `/`、`/applications`、`/providers`、`/records`、`/organizations`、`/users` 或 `/agents`
- **THEN** workspace tabs 降级栏 SHALL NOT 导致 `document.documentElement.scrollWidth` 大于 `document.documentElement.clientWidth + 1`
- **AND** 主内容首屏 SHALL NOT 因标签栏明显下沉

### Requirement: 工作区标签状态轻量持久化
Admin 企业认证中心 Shell SHALL 通过 route-driven state 和浏览器会话级存储轻量保存已打开标签，不得依赖 iframe、复杂 keep-alive 或跨页面业务状态缓存。

#### Scenario: 会话内恢复打开标签
- **WHEN** 管理员在同一浏览器会话中刷新 Admin 页面
- **THEN** Shell MAY 从 sessionStorage 恢复已打开标签顺序
- **AND** 如果存储内容不可解析、版本不匹配或包含无效路径，Shell SHALL 安全降级为只包含总览和当前页面

#### Scenario: 不缓存业务页面状态
- **WHEN** 管理员在标签间切换
- **THEN** Shell SHALL 使用现有 React route 渲染对应页面
- **AND** Shell SHALL NOT 使用 iframe、隐藏页面 keep-alive 或本地伪造页面状态替代真实 route 行为
