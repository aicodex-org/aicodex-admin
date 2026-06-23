## Context

上一轮 Shell polish 已完成侧栏宽度、workspace tabs 横向滚动、总览普通标签 fallback 等基础行为，但用户验收截图暴露了控件归属和视觉噪声问题。此任务是小范围 follow-up，不改变业务流程。

## Goals / Non-Goals

Goals:

- 让侧栏切换按钮在视觉和 DOM 上归属于侧边栏，而不是全局 header。
- 让标签关闭能力从“每个标签常驻强入口”调整为“全局关闭菜单 + 单标签上下文关闭”。
- 让侧栏父级归属提示低于当前子项选中态，减少重复紫色强调。
- 保持桌面/移动降级、collapsed 子菜单、workspace tab fallback 和键盘可达性。

Non-Goals:

- 不新增或重排业务导航。
- 不修改路由、API、权限、认证、后端接口或数据模型。
- 不替换 icon 系统，不做视觉大重构。
- 不 archive 当前 change，不执行分支合入或 `test` 推送。

## Decisions

### 侧栏切换按钮归属

桌面端在 `Sider` 内部追加一个底部 action row，按钮仍使用现有 `MenuFoldOutlined` / `MenuUnfoldOutlined` 和原有 i18n 文案。`Sider` children 改为纵向 flex：菜单区域占满剩余高度并独立滚动，底部 action row 固定在侧栏内。移动端仍使用 header 里的 Drawer 菜单按钮，不套用桌面 collapsed 状态。

验收反馈后，登录后 Admin Shell 根容器进一步限定为视口高度，`Sider` 和右侧内容区都按 header 下方剩余高度布局。右侧内容页变长时只滚动内容区，不再把左侧 `Sider` 拉成和内容页一样高；当左侧菜单项超过可视高度时，菜单区域使用自己的垂直滚动条，底部收起/展开按钮继续贴在侧栏底部。

### 标签关闭降噪

桌面 workspace tabs 在右侧固定展示一个标签栏级关闭菜单按钮。菜单提供关闭当前、关闭其他、关闭所有，复用已有状态层 close helpers。单标签关闭按钮仍在 DOM 中保留 aria-label 和 focus-visible 样式；当前标签默认显示，非活动标签默认透明并在 hover/focus-within 时显示，避免每个标签都常驻醒目图标。

验收反馈后，全局关闭菜单入口进一步收敛为 icon-only 按钮，只保留可访问名称和 `title`，不再展示 `关闭` 文案。左右滚动从大比例视口宽度改为较小段距，避免常见桌面宽度下一次点击就跳到最左或最右。

再次验收反馈后，workspace tabs 与内容区域之间不再使用额外高度的蓝灰色分隔带，仅保留一条细分隔线，避免 header、tabs、分隔带、内容卡片形成过多横向颜色层。

对最新截图复查后，保留标签栏级关闭菜单入口的 `X` 图标。它和单标签关闭 affordance 有一定重复，但可理解性更强；入口继续保持 icon-only，不展示 `关闭` 文案，具体动作通过下拉菜单项、`aria-label` 和 `title` 表达。

最终标签栏视觉继续向“工作台 tabs”收敛：非 active 标签降低边框、字体和 dot 权重，active 标签保留白底与蓝色顶边作为焦点；左右滚动箭头和全局关闭 `X` 常态降权，hover/focus 时再显性反馈。这样保留可理解的关闭语义，同时减少一排标签像按钮组的压迫感。

侧栏展开/收起反馈指出切换时存在闪烁。浏览器采样显示根因是 AntD Sider/Menu 的 width、padding 和 title-content opacity transition 与 Shell 的 collapsed 状态更新不同步。当前处理为禁用侧栏收起/展开相关 layout transition，让 Sider 宽度、内容区左边界和 Menu collapsed 类在同一帧完成；菜单 hover 仍保留颜色反馈。

最新截图显示旧版 `content-warp-card` 页面和新版身份控制台页面在 tabs 下方的起始边界不一致。当前处理限定在 `.admin-shell-content > .content-warp-card`，统一 legacy Card 的顶部留白、左右内缩、边框和轻阴影；新版 `enterprise-identity-console` 页面继续自管内部布局，旧版页面的表格、查询、分页、排序和操作列不在本 change 中调整。

再次验收反馈指出 active 标签仍偏重。当前进一步降低 active 标签的选中态：保留白底、较高文字权重和浅蓝顶边，但取消内嵌强蓝顶条阴影，整圈边框改为灰蓝，active 标签内关闭按钮常态透明，避免选中态和关闭 affordance 叠加成 primary button 观感。

针对标签栏高度反馈，desktop workspace tabs 进一步压缩为更接近后台工具台的密度：标签高度从 `34px` 降到 `30px`，标签栏行高从 `42px` 降到 `36px`，单标签关闭按钮从 `23px` 降到 `20px`。移动端 tabs 保持原降级形态，不套用桌面紧凑尺寸。

标签栏压缩后，内容区起始留白也同步收紧：新版身份页容器从 `16px 18px 22px` 调整为 `12px 16px 20px`，legacy `content-warp-card` 外边距从 `16px 18px 0` 调整为 `12px 16px 0`。这样 tabs、侧栏分隔线和内容首块之间的节奏一致，同时移动端仍保持 `8px` 降级间距。

### 侧栏选中态降权

保留子菜单叶子项的主要选中底色和左侧强调条。父级 submenu selected 只使用更浅背景和文字色，不再使用同等级 inset 左条，表达归属但不抢占当前页面焦点。

### 登录后 footer footprint

登录后的 Admin Shell 不再渲染可见 `Powered by` footer footprint，减少主内容底部噪声。`renderFooter` 仍保留给登录、回调和入口页；登录后 Shell 只保留隐藏账号桥接字段，避免破坏既有 DOM 兼容点。

## Validation Strategy

- Focused Jest 覆盖侧栏按钮位置、collapsed 行为、workspace tabs 全局关闭菜单、active/deferred 单标签关闭状态、移动端降级。
- 运行增量 TS gate、`yarn typecheck`、`yarn build`、`git diff --check`。
- OpenSpec 对当前 change、changes 和 specs 执行 strict validate。
- 启动本地预览并用浏览器检查 desktop expanded、desktop collapsed、多标签关闭菜单和 mobile 390x844，无新增 console page error、无页面级横向溢出。

## Rollout

该改动仅影响 Admin 前端 shell 样式和交互。作为 release candidate 保留在工作分支和 active OpenSpec change 中，等待用户看效果后决定是否继续修改或进入 closeout。
