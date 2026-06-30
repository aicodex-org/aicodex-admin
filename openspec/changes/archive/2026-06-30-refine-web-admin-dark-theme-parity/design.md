## Context

当前 `web-admin` 已经在壳层根节点显式区分 `admin-shell-theme-light` 与 `admin-shell-theme-dark`，并通过 `App.less` 中的共享 CSS custom properties 驱动大部分 shell、列表页和工作区标签样式。最近几轮列表页统一、身份资产关系、接入预检、用量接入和审计详情等页面改造，已经接入了同一套页壳和交互节奏，但它们内部仍残留多处固定浅色 `background`、`border`、`box-shadow` 或文字色。

问题不在主题切换机制本身，而在这些页面局部 surface 没有继续沿用共享 token。结果是亮色模式看起来正常，暗黑模式一切换就出现白色 panel、亮边框、细节抽屉对比不稳，或像系统信息页、MCP Store 一样保留旧的大外框、窄列或纯黑卡片布局。用户已经明确要求不要轻易改动已经调好的公共列表壳布局和节奏，所以本次设计必须聚焦“页面局部 surface token 化”和“route/page 外层壳间距统一”，而不是重新翻新公共样式系统。

## Goals / Non-Goals

**Goals:**
- 让近期接入共享 shell / list page 的关键页面在明亮与暗黑模式下保持一致层级，不再出现显著白底孤岛或失衡分隔线。
- 让 cardless route、普通 Card route、PageScrollShell 消费者和系统工具类页面复用同一套外层 spacing / surface 语义，避免不同页面重复叠加 margin、padding 或旧外框。
- 继续复用现有 `--admin-shell-*`、`--list-page-*` 等共享 token，避免为单个页面发散出新的暗黑模式样式分支。
- 用聚焦测试和浏览器巡检兜住组织、用户、身份资产关系、接入向导、审计记录详情和用量接入这些高频页面的暗黑模式回归。

**Non-Goals:**
- 不新增一套独立主题系统，不重写 Ant Design 的全局主题实现。
- 不修改后台 API、路由、权限、查询、分页、详情抽屉或复制逻辑的业务语义。
- 不在本次 change 中一次性清扫所有 legacy 页面，只收敛已迁入共享页壳且已暴露问题的关键页面。

## Decisions

### 1. 继续以共享 theme class + CSS token 作为唯一主题边界
近期页面的暗黑模式问题说明，真正稳定的边界应该仍然是壳层 class 和共享 token，而不是页面私有的 `.dark` 覆盖块。本次修正将继续依赖现有 `admin-shell-theme-light` / `admin-shell-theme-dark` class，要求页面局部 surface、divider、secondary text 和状态色全部从共享 token 派生。

备选方案是给每个问题页面补一层 page-local dark override。这个做法改动快，但会迅速制造风格漂移和维护成本，后续再统一其它列表页时也很难复用，因此不采用。

### 2. 只收敛页面局部 surface 和 route/page 外层边界，不扰动已经调稳的公共列表壳节奏
用户已经明确要求不要轻易修改公共列表壳已经调好的样式配置，因此本次只处理近期页面中仍然残留的局部 selector，例如外层紧凑 panel、结果数分隔、目录健康辅助上下文、关系 selector、向导步骤卡、审计详情摘要、服务凭据治理块和系统信息页局部面板。

也就是说，本次不会重新改 `ListPageTable` 的间距体系、标题节奏、固定滚动边界或分页布局，只让这些局部自定义块重新回到共享 token 语义上；同时把普通 Card route、cardless route 和 PageScrollShell 消费者的外层 spacing 收敛到同一套变量，避免页面各自叠加第二套边距。这样能最大限度降低对已经稳定页面的回归风险。

### 3. 系统信息页按诊断面板处理，不再沿用旧窄列 Card route
系统信息页不是标准分页列表，但它在管理工具菜单下承担运行态诊断用途。旧实现使用居中窄列和长表直接拖长页面，在暗黑模式下会形成“大画布 + 小黑卡”的割裂感。本次将 `/sysinfo` 纳入 cardless route，指标卡使用共享 surface token 和响应式网格：CPU 全宽降低高度，内存/磁盘/网络等分，API 延迟/吞吐以数据卡呈现且长表在卡内滚动，About 信息降为低优先级区块。

### 4. MCP Store 按卡片目录页处理，不强行套分页列表壳
MCP Store 是目录卡片页，不是标准分页表格页。它应复用 cardless route 和 PageScrollShell 的固定页头/正文内部滚动语义，但不应强行套 `ListPageTable`。本次将筛选工具栏、目录卡片、Tag、链接和添加按钮接入共享 shell token，并移除页面自身对 route spacing 的第二套 padding。长标题通过卡片 head 截断，避免标题挤压“添加”按钮。

### 5. 暗黑模式回归使用“源码断言 + 浏览器巡检”双层验证
这类问题仅靠单元测试不够，因为很多错误是视觉层级和对比问题，不是逻辑分支错误。本次保留两层验证：

- 源码级回归测试：断言关键 selector 使用共享 token，而不是继续写死浅色背景。
- 浏览器巡检：使用前端本地 dev 连接受控测试后台，在暗黑模式下检查关键页面的 outer panel、卡片、详情抽屉和证据区，不允许留下明显白底块或不可读状态。

备选方案是只做人工截图 review，问题是后续同类回归很容易再次出现，而且无法快速定位是公共壳回归还是页面局部 selector 回归，因此不采用。

### 6. 规格按能力域分别补 delta，不把页面局部视觉问题笼统塞进一个大壳层 requirement
这次修到的页面跨了组织身份、身份资产关系、接入向导、审计运维和用量接入几个能力域。如果全部只写进 `admin-enterprise-identity-console-shell`，后续很难判断具体哪个业务页的暗黑模式行为是 contract、哪个只是实现细节。

因此本次设计保留一个 shell 级 requirement 约束共享主题边界，再分别给组织身份、关系页、向导、审计和用量接入补充各自的暗黑模式一致性 requirement。这样以后继续收口暗黑模式时，能按 capability 精确跟踪。

## Risks / Trade-offs

- [Risk] `App.less` 是全局样式文件，局部 token 化可能误伤其它页面。 → 通过只改页面局部 selector、补充聚焦 Jest 断言和浏览器巡检来降低风险。
- [Risk] 仍可能有少量 legacy 页面保留 AntD 默认浅色 surface。 → 本次 change 只覆盖已迁入共享页壳且已发现问题的关键页面，剩余页面继续按巡检结果单独收口。
- [Risk] 某些状态块在暗黑模式下如果只替换背景，不同步文本和边框 token，仍会出现对比不足。 → 每个目标区域统一检查 `background`、`border`、`color` 和 hover/copied/failed 反馈状态，不只改单一属性。

## Migration Plan

1. 盘点近期共享页壳消费者中残留的浅色 selector，限定本次改动范围。
2. 将这些 selector 改为复用现有 `--admin-shell-*`、`--list-page-*` 和相关语义 token。
3. 补充针对关键 selector 的前端回归测试。
4. 运行聚焦测试、`yarn typecheck` 和浏览器暗黑模式巡检。
5. 若发现局部回归，优先回滚对应 selector 的 token 映射，不动公共列表壳的布局节奏。

本次变更仅涉及前端样式和测试，不涉及数据迁移。回滚成本主要是撤回对应 selector 的 token 化改动。

## Open Questions

当前没有阻塞实施的开放问题。本次 change 完成后，若继续发现尚未迁入共享页壳的 legacy 页面存在暗黑模式问题，应另起后续 change 逐步收口，而不是继续扩大本 change 的范围。
