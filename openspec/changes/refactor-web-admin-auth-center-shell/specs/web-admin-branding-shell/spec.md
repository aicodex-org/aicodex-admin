## ADDED Requirements

### Requirement: Admin shell SHALL use AICodeX branding
`web-admin/` 管理后台在管理员可见的主壳层中 SHALL 展示 AICodeX 品牌，而不是 Casdoor 品牌。

#### Scenario: Brand surfaces render with AICodeX identity
- **WHEN** 管理员打开 `web-admin/` 中任意后台页面
- **THEN** 页面标题、主 Logo、页脚品牌文案和默认品牌描述必须使用 AICodeX 命名

#### Scenario: Theme-aware logo remains supported
- **WHEN** 管理后台切换浅色或深色主题
- **THEN** 主壳层必须继续支持对应主题下的品牌 Logo 呈现

### Requirement: Desktop admin shell SHALL use a left-side authentication navigation
桌面端管理后台 SHALL 使用左侧导航栏承载认证中心导航，而不是使用当前的顶部横向业务菜单。

#### Scenario: Header keeps only the auth center entry
- **WHEN** 管理员在桌面端打开后台页面
- **THEN** 原顶部菜单区域只保留单一入口“认证中心”
- **THEN** 原本顶部红框区域中的业务菜单项不得继续以横向一级菜单形式展示

#### Scenario: Left navigation contains all existing admin sections
- **WHEN** 管理员展开左侧“认证中心”导航
- **THEN** 原有首页、用户管理、身份认证、Casbin 权限管理、LLM AI、日志与审计、商业与付款、管理工具等菜单项必须全部在左侧导航中可访问
- **THEN** 每个菜单项必须继续跳转到原有对应路由

#### Scenario: Active route stays highlighted in the left navigation
- **WHEN** 管理员通过深链接或页面内跳转进入任意后台路由
- **THEN** 左侧导航必须正确展开对应分组并高亮当前菜单项

### Requirement: Navigation permissions SHALL be preserved after the shell refactor
导航壳层重构后，现有基于账号角色、组织配置和 `navItems` 的菜单过滤行为 SHALL 保持一致。

#### Scenario: Organization nav filtering still applies
- **WHEN** 某个组织通过 `navItems` 或 `userNavItems` 仅开放部分菜单
- **THEN** 左侧导航只能展示当前账号被允许访问的菜单项
- **THEN** 没有任何可见子菜单的分组不得显示

#### Scenario: Admin-only sections remain restricted
- **WHEN** 非管理员账号进入后台
- **THEN** 仅管理员可见的系统管理能力不得出现在左侧导航中

### Requirement: Responsive navigation SHALL remain usable on small screens
导航重构 SHALL 不破坏小屏设备的可用性。

#### Scenario: Mobile users can still open the auth center menu
- **WHEN** 管理员在移动端或窄屏下打开后台
- **THEN** 系统必须仍然提供从左侧打开的认证中心导航入口
- **THEN** 其中展示的菜单项集合必须与桌面端的左侧导航保持一致
