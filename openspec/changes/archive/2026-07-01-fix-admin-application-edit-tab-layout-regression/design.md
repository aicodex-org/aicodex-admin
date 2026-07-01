# Design: 修复应用编辑页 tab 布局回归

## Context

`stabilize-admin-large-edit-form-layout` 为大编辑页增加了统一 `admin-large-edit-card` 和应用页主表单行布局规则。应用编辑页与其它编辑页不同：页面内部包含 `Layout`、`Content`、Tabs，以及 Provider 绑定列表、界面定制等嵌套内容。若 CSS 选择器按 `.application-edit-form-content > .ant-row` 这类结构粗略识别主字段行，tab 内第一层或嵌套 Row 可能被误判成 label/content 行，导致第一个 `Col` 固定 label 宽、第二个 `Col` 才 flex，full-width 组件被压缩。

本 change 必须先通过代码与浏览器证据确认根因；若实际白屏来自组件异常，也要以错误栈为准修复，不用 CSS 猜测替代。

## Goals

- Provider tab 内容在桌面端占用 tab pane 可用宽度，不被压成约 180px 的 label 列。
- UI Customization tab 可切换、可渲染，页面不白屏且无 webpack overlay。
- 保留大编辑页主表单 label/content 的稳定布局，以及 `.content-warp-card` 不回归。
- 用测试锁定应用编辑页 tabs 的布局边界，避免后续 scoped CSS 再次误伤。

## Non-Goals

- 不修改应用保存、删除、上传、Provider 绑定、界面定制或认证配置 payload。
- 不重写应用编辑页整体结构为 AntD `Form` 或新页面壳。
- 不修改组织、用户、Provider、Syncer、Gateway 或其它 UX worker 范围文件。
- 不新增主导航、菜单或后端接口。

## Decisions

### 显式区分主字段行与 tab 内容

优先在 `ApplicationEditPage` 里给真正的主字段 Row 增加明确 class hook，例如 `application-edit-field-row`，并将 CSS 从结构选择器收窄到该 class。这样 tab pane、Provider 列表、界面定制等嵌套内容不会因为位于 `.application-edit-form-content` 下方而继承 label/content 布局。

如果代码确认已有等价 hook，则复用现有 hook；不新增全局 AntD 覆盖，也不通过大范围 `!important` 抹平症状。

### 测试覆盖用户可观察行为

聚焦测试应验证应用编辑页拥有明确主字段 row hook，同时 Provider tab 和 UI Customization tab 的内容容器不携带 field-row class。对于白屏回归，测试要覆盖 tab 切换后目标内容能渲染，避免只断言 mock 调用。

### 浏览器 smoke 作为 CSS 回归证据

本地浏览器 smoke 使用脱敏 fixture/mock 或本地 dev 数据打开应用编辑页，切换 `提供商` 与 `界面定制`。记录 DOM 宽度、页面级 overflow、webpack overlay 状态和截图路径到 ignored `output/playwright`，不提交截图或敏感数据。

## Risks and Mitigations

- 风险：白屏根因不是 CSS，而是 tab 切换触发的数据或组件异常。缓解：先捕获控制台错误/错误栈，再实施对应最小修复。
- 风险：收窄选择器后主字段行布局回退。缓解：保留或补充主字段 row class 测试，并在浏览器 smoke 检查主要编辑壳无横向溢出。
- 风险：浏览器环境缺少可登录数据。缓解：优先使用项目现有 mock/fixture；若环境不可用，在 `verification.md` 记录阻塞和可复现的低层证据。
