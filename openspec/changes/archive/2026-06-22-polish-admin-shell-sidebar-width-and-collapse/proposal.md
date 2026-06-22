## Why

当前 Admin 壳层左侧侧边栏展开宽度偏大，占用了身份控制台工作区的横向空间，并且桌面端缺少可收起能力。该问题会降低列表、工具栏和 workspace tabs 的信息密度，因此需要在不改变业务导航和移动端抽屉行为的前提下收窄并支持桌面收起。

## What Changes

- 将桌面展开态侧边栏宽度收敛到约 `224px`，保持菜单文案可读。
- 增加桌面端侧边栏收起/展开控制，收起态约 `72px`，保留 icon-only 导航和 tooltip/title 识别。
- 使用本地浏览器存储持久化桌面 collapsed 状态，刷新后恢复；移动端/窄屏继续使用现有 Drawer 响应式行为，不强制套用桌面 collapsed 状态。
- 让主内容区、workspace tabs、表格和工具栏随侧边栏宽度变化保持对齐，避免页面级横向溢出。
- 将左上品牌区改为紧凑单行 `[logo] AICodex Admin · 认证中心`，取消当前 `logo + 紫色胶囊` 风格；侧边栏收起态仅保留 logo。
- 按用户补充决策调整桌面 workspace tabs：取消固定 `身份总览` 标签，将所有标签放入同一横向滚动轨道，滚动按钮放在轨道两侧，并增加桌面右键关闭菜单。
- `关闭所有` 后自动回到 `/` 并重新打开普通 `身份总览` fallback 标签，避免空工作区。
- 非目标：不新增导航入口，不引入拖拽排序、keep-alive、移动端重做，不改业务页面、后端、API/Gateway/Insight 或 `test`。

## Capabilities

### New Capabilities

### Modified Capabilities
- `admin-enterprise-identity-console-shell`: 增加桌面侧边栏宽度、收起/展开、持久化、品牌区、移动端降级、workspace tabs 新模型和 overflow 验收要求。

## Impact

- 影响 `web-admin/src/ManagementPage.js` 的 Admin shell sidebar 状态与 AntD `Sider/Menu` 参数。
- 影响 `web-admin/src/App.less` 的 shell/sidebar/content/workspace tabs 响应式样式。
- 影响 `web-admin/src/common/WorkspaceTabs.tsx` 和 `web-admin/src/common/workspaceTabState.ts` 的标签固定、关闭批量动作与桌面右键菜单行为。
- 影响必要的 `zh` / `en` locale 文案与聚焦 Jest 测试。
- 不涉及后端接口、数据库、真实认证链路、Gateway、Insight、生产/类生产配置或 `test` 分支。
