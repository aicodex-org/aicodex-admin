## Context

本 change 基于上一轮 shell/sidebar/tabs 已合入的成果继续收口：桌面侧栏已有 224px 展开、72px 收起、本地持久化、总览普通标签、滚动标签条和桌面右键关闭菜单。用户基于截图指出三项回归：标签关闭按钮虽然存在但视觉不够直接，sidebar collapsed 不应压缩全局 header，collapsed 后父级菜单仍应能打开二级入口。同时当前总览和通用壳层视觉仍偏纯白，需要按 V2 mock 做克制的企业控制台层级 polish。

## Goals / Non-Goals

**Goals:**

- 让 workspace tabs 桌面端关闭按钮在非 hover 状态下也清晰可见，并保持移动端可关闭入口。
- 让 sidebar collapse 只影响左侧导航，不影响顶部品牌、全局操作、右上工具区或租户下拉。
- 复用 AntD `Menu` collapsed submenu popup 语义，恢复 icon-only 侧栏下的二级菜单可达性。
- 通过浅冷灰画布、清晰 header/tabs/content 分层、summary band、卡片边界和状态色，让总览更接近 V2 企业控制台方向。

**Non-Goals:**

- 不替换 icon set，不新增设计系统，不重做 workspace tabs/side bar 交互模型。
- 不改业务接口、权限、路由、后端、Gateway、Insight 或 `test` 分支。
- 不引入拖拽排序、keep-alive、移动端重做或大面积页面重构。

## Decisions

- **Header 与 sidebar 解耦。** 顶部品牌文本不再依赖 `sidebarCollapsed`，collapse 控制按钮仍放在 header 左侧但语义上只控制左侧导航；移动端继续使用 Drawer 入口。替代方案是在 collapsed 时隐藏 header 品牌以节省空间，但用户已明确全局 header 应保持完整，故不采用。
- **Collapsed submenu 复用 AntD Menu。** 桌面侧栏仍使用 `mode="inline"` + `inlineCollapsed`，collapsed 时不传受控 `openKeys=[]`，让 AntD 自己处理 popup/submenu 入口。替代方案是自建浮层菜单，但会扩大交互写集并增加移动/键盘风险。
- **关闭按钮以样式增强而非逻辑重写。** `WorkspaceTabs.tsx` 已渲染按钮并具备 aria label；本轮通过尺寸、背景、边框、颜色和 focus/hover 状态增强“直接可见”的 affordance，保留现有右键菜单和关闭 fallback 逻辑。
- **视觉层级集中在现有 CSS token 和类名。** 优先调整 `App.less` 中 shell、workspace tabs、`enterprise-identity-console`、summary/status/card/health/audit 样式，不改数据结构或组件拆分，降低回归面。

## Risks / Trade-offs

- [AntD collapsed popup 受测试环境限制难完全在 Jest 中验证] → 使用源码级测试锁住 collapsed 不再受控 `openKeys=[]`，并用浏览器 smoke 验证 hover/click 后二级入口可见。
- [增强关闭按钮可能压缩长标签标题] → 保持标签固定宽度和文本省略，按钮占用稳定宽度，避免页面级横向溢出。
- [视觉 polish 过度会偏营销化或单色调] → 只使用浅灰/蓝/青/橙等克制功能色和白底卡片，不增加大 hero、装饰光效或新 icon。
