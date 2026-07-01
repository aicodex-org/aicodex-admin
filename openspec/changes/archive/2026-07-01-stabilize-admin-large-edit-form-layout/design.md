# Design: 稳定大编辑页内部表单布局

## Context

上一轮 `fix-admin-large-edit-page-double-card-shell` 已解决 Shell 外层 `.content-warp-card` 与页面内部编辑 Card 叠加的问题。本轮剩余问题在页面内部：多个长编辑页继续使用旧式 `Row` / `Col span`，桌面 label 列依赖 2/24 或 3/24 百分比宽度，中文长 label 在 1280px 左右容易被压缩。

## Decisions

### 统一主编辑 Card 边界

新增共享 class `admin-large-edit-card`，只挂在大编辑页内部的主编辑 Card 上。保留已有页面专属 class，例如 `organization-edit-card`、`user-edit-card`，并补齐应用、Provider、Syncer 的页面/卡片 hook，便于后续测试和浏览器定位。

### Scoped row layout

对 `admin-large-edit-card` 内的主表单行使用固定 label 列与弹性内容列：

- 桌面 label 列固定为 184px。
- 内容列 `flex: 1`，`min-width: 0`，避免输入框、选择器或局部表格撑破页面。
- 移动端恢复 100% 换行。

应用编辑页包含 `Layout` / `Content` / Tabs 以及嵌套 Row，因此 CSS 不使用全局 `.admin-large-edit-card .ant-row` 粗选择器，而是只针对主编辑 Card body 直接行、以及应用页 Content 第一层表单行。

用户编辑页的主字段行由 AntD `Form.Item` 包裹，实际 Row 位于 `.ant-form-item-control-input-content` 内；本轮将该层级作为用户页专属 scoped selector 纳入同一 184px label/content 布局，避免回退到 `ant-col-2` 的窄 label。

## Risks and Mitigations

- 风险：应用页内嵌 Row 被误判为主 label 行。缓解：应用页使用 `application-edit-form-content > .ant-row` 限定第一层表单行。
- 风险：少数 Row 不是 label/content 结构。缓解：只影响首两个 `Col`，且移动端兜底换行；聚焦测试覆盖 class hook，浏览器 smoke 检查页面级 overflow。
- 风险：Provider/Syncer 底部按钮仍有旧 inline margin。缓解：本次不改变动作区语义，仅稳定主表单布局，按钮区后续可独立巡检。
