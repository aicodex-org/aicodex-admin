## Context

身份控制台 Shell 当前对大多数旧路由默认套一层 `.content-warp-card`，列表页依赖这层卡片提供统一边界。组织、用户、应用、Provider、Syncer 这类长编辑页自身已经使用 Ant Design `Card type="inner"` 承载标题和保存动作，因此在 Shell 内会出现外层内容卡与内层编辑卡叠加。

截图中的主要问题来自这两层壳同时存在：外层卡片提供白底、边框、阴影和 padding，内层编辑 Card 又重复提供同类视觉层级，导致长表单左侧 label 区像独立竖栏。

## Goals / Non-Goals

**Goals:**

- 大编辑页在桌面 Shell 中只保留一个主要页面壳。
- 保留内部编辑 Card 的标题、按钮、Tabs、表单和局部业务组件。
- 复用现有 `admin-shell-route-scroll-without-card` 滚动与 spacing 规则。
- 覆盖组织、用户、应用、Provider、Syncer 这些已确认的大编辑页入口。

**Non-Goals:**

- 不重构旧表单的 AntD `Row/Col` 布局。
- 不全局移除 AntD Card 边框或阴影。
- 不改变后端 API、保存 payload、权限、上传、MFA、LDAP、同步器或 Provider 业务逻辑。
- 不扩大到所有小编辑页或弹窗表单。

## Decisions

1. 大编辑页路由走 Shell without-card 模式。
   - 原因：根因在 route shell 与编辑页内部 Card 叠加；切换 route wrapper 可以保留编辑页内部工具栏，且避免全局 Card 样式误伤局部卡片。
   - 替代方案：直接去掉每个编辑页内部 Card。该方案会破坏标题、保存按钮和页面已有布局，改动面更大。

2. 使用路径模式集中识别大编辑页。
   - 原因：当前 `isWithoutCard()` 已按路径管理 cardless 页面，新增大编辑页 pattern 与既有实现一致，测试也可直接覆盖。
   - 替代方案：为每个页面增加 route metadata。当前 Shell 尚未采用 route 配置表，临时引入新抽象会扩大范围。

3. 只在必要页面补稳定 class/test，不引入视觉重做。
   - 原因：这次修复目标是消除双壳和横向溢出风险，不是重排旧编辑表单。

## Risks / Trade-offs

- [Risk] 个别旧编辑页内部 Card 高度依赖外层 Card body 尺寸。→ 通过聚焦测试、构建和浏览器 smoke 检查组织/用户页面；应用、Provider、Syncer 以 route shell 测试覆盖。
- [Risk] without-card 路由的左右 padding 与旧 Card body padding 不完全一致。→ 复用现有 route spacing token，避免新增第二套外边距。
- [Risk] 旧表单仍有局部长字段或表格需要横向滚动。→ 本次只要求不制造页面级横向 overflow，局部表格滚动保持页面业务组件自处理。
