## Context

Admin 身份控制台已通过 `ManagementPage.js` 渲染桌面 `Sider`、移动端 `Drawer`、顶部 header 和 route-driven workspace tabs。当前桌面 `Sider` 固定 `264px`，没有 collapsed state；移动端通过 `Setting.isMobile()` 进入抽屉菜单，不能被桌面持久化状态影响。当前 workspace tabs 仍把 `/` 总览作为固定标签放在独立区域，并把滚动按钮和关闭菜单放在右侧工具区；用户已确认改为普通标签轨道和桌面右键关闭增强。

## Goals / Non-Goals

Goals:
- 桌面展开态侧边栏收窄到 `224px` 左右，并保持一级/二级菜单可读。
- 桌面端支持 icon-only 收起态，宽度约 `72px`，通过菜单 title/tooltip 保留识别能力。
- collapsed 状态写入 localStorage，刷新后恢复；读取失败时安全回到展开态。
- 左上品牌区使用紧凑单行 `AICodex Admin · 认证中心`，不再使用紫色胶囊；桌面收起态隐藏品牌文字只留 logo。
- 主内容区和 workspace tabs 保持 `min-width: 0` 与自身滚动容器，避免页面级横向溢出。
- `身份总览` 不再固定，作为普通标签进入横向滚动轨道。
- 左右滚动按钮贴近标签轨道两侧，形成完整 scrollable tab strip。
- 桌面右键菜单提供 `关闭当前`、`关闭左侧`、`关闭右侧`、`关闭其他`、`关闭所有`，同时保留可见关闭按钮和移动端更多菜单。
- `关闭所有` 后回到 `/`，并重新打开普通 `身份总览` fallback 标签。

Non-Goals:
- 不改企业导航 IA、菜单分组、权限过滤或业务路由。
- 不引入拖拽排序、keep-alive、移动端重做、业务页重构、后端、API/Gateway/Insight、真实认证链路或 `test`。

## Decisions

1. 在 `ManagementPage.js` 中维护 `sidebarCollapsed` state，并通过 `localStorage` key `adminShellSidebarCollapsed` 读写桌面 collapsed 偏好。该状态只驱动桌面 `Sider`，移动端抽屉始终按现有逻辑渲染。
2. 使用 AntD `Sider` 的 `collapsed`、`collapsedWidth` 和 `trigger={null}`，避免默认底部 trigger 干扰现有 shell；在 header 左侧品牌区旁增加一个 text/icon button 作为明确控制。
3. 品牌区复用现有 logo 资产，新增本地化主品牌/模块文案，样式采用普通 inline text 和轻分隔，不使用胶囊、营销色块或大字号。
4. `Menu` items 保持复用现有 `Setting.getItem` 数据。AntD inline menu 在 collapsed 时会隐藏文字并以 item title 生成提示；实现需确保单叶子菜单和子菜单 label 仍提供可读文本。
5. `WorkspaceTabs` 取消 fixed/scroll split，统一渲染到一个 scroll strip；左右滚动按钮分别放在 strip 两侧，仍按真实滚动状态显隐。右侧关闭菜单降级为右键菜单，但每个可关闭标签继续保留关闭按钮，移动端继续保留 “更多” 菜单。
6. `workspaceTabState` 不再把 `/` 标记为 fixed/不可关闭。打开、恢复和关闭全部时仍保证至少有 `/` fallback 标签，避免空 tabs；关闭当前、左侧、右侧、其他和所有都只在已有 tabs 集合内计算下一跳。
7. CSS 约束 shell 容器、sidebar/content 和 workspace tabs 尺寸、过渡、overflow，保留 Admin-2 action-boundary 的清晰视觉边界，不新增 `More` overflow 层级或拖拽交互。

## Testing

- 先写聚焦 Jest 测试覆盖默认宽度、toggle 后 collapsed class/属性、localStorage 持久化、移动端不读取桌面 collapsed、content/tabs 无页面级 overflow 保护类。
- 先写品牌区测试覆盖展开态 `AICodex Admin · 认证中心`、无旧紫色胶囊、收起态只保留 logo。
- 先写 workspace tabs 测试覆盖普通 `身份总览` 标签、两侧滚动按钮、桌面右键关闭菜单、关闭左/右/其他/所有和 `关闭所有` fallback，以及移动端不依赖右键菜单。
- 运行 OpenSpec validate、`git diff --check`、TypeScript gate、`yarn typecheck`、聚焦 Jest/coverage、`yarn build`。
- 使用浏览器 mock smoke 验证桌面展开/收起、刷新持久化、移动视口、页面级 overflow、workspace tabs 对齐、普通总览标签、两侧滚动按钮、右键菜单和关闭全部 fallback。
