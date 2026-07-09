## Context

`ApplicationEditPage.tsx` 已是 TSX legacy class component，当前页面根节点已有 `admin-large-edit-page application-edit-page`，内部主 Card 也已有 `admin-large-edit-card application-edit-card`。这说明页面已经具备大编辑页基础样式边界，但实际结构仍是旧模式：`Card title` 承载保存按钮，Card body 内再嵌 `Layout`、sticky `Header`、card 类型 Tabs 和滚动 `Content`。

应用页和组织、用户一样属于多 tab 大编辑页，而不是群组、角色这类单页正文。它包含应用基础信息、登录/注册、OIDC/OAuth、SAML、Provider 绑定、界面定制、安全设置和 Reverse Proxy。近期已经修复过 Provider tab 被主表单 Row 规则压窄、界面定制 tab 白屏等问题，本次迁移必须保留这些防回归边界，不把 UI polish 扩大成认证配置语义重构。

## Goals / Non-Goals

**Goals:**

- 让应用编辑页和组织、用户编辑页使用同一套 `LargeEditShell` 头部、tabs 插槽、滚动正文和底部固定操作栏。
- 保留应用页多 tab 信息架构，并让 hash 刷新后恢复当前 tab。
- 将旧 `Card title` 保存按钮迁移到底部固定操作栏，移除重复保存入口。
- 让 tab 正文达到大型编辑页迁移指南标准：区块标题、表单网格、全宽表格模块、右上操作、空态、Tooltip、`aria-label` 和局部 overflow 控制。
- 为 `名称`、`显示名称` 和已有自定义 scope 校验提供清晰错误定位；错误所在 tab 应自动激活。
- 使用浏览器滚动截图或 DOM 指标逐个检查所有 tab，避免只看基础 tab 就交付。
- 保持现有 API payload、保存/删除/上传/预览、SAML metadata、Provider 绑定和路由行为不变。

**Non-Goals:**

- 不新增后端 API、数据库字段、权限规则或认证/授权运行时能力。
- 不重构 Application 业务模型、Provider 绑定数据结构、OIDC/OAuth/SAML 配置语义或 Reverse Proxy 运行机制。
- 不把应用编辑页拆成新的多页面流程或接入向导。
- 不在本 change 中改造 Provider、Syncer 或应用接入中心列表页。
- 不提交浏览器截图、临时 Playwright 输出、dev server 日志或本地测试数据。

## Decisions

### 复用 LargeEditShell

应用编辑页应直接复用 `LargeEditShell`，`classPrefix` 使用 `application-edit`，页面根 class 保留 `admin-large-edit-page application-edit-page`。`LargeEditShell` 负责公共壳：返回、路径、标题、未保存状态、tabs、滚动正文和底部动作栏。这样应用页和组织、用户的头部/底部一致，后续 Provider、Syncer 迁移也有相同参照。

旧 `Card title` 内的保存按钮移除，底部操作栏统一为 `取消`、`保存`、`保存并返回`。新增模式取消仍调用既有删除临时应用逻辑；编辑模式取消和返回需要 dirty 确认。

### 保持多 tab 边界

应用页保留现有 tab key 和路由 hash：

- `basic`: 基础。
- `authentication`: 身份验证。
- `oidc-oauth`: OIDC/OAuth。
- `saml`: SAML。
- `providers`: 提供商。
- `ui-customization`: 界面定制。
- `security`: 安全设置。
- `reverse-proxy`: Reverse Proxy。

无效 hash 或当前数据不支持的 tab 回退到 `basic`。tab label 使用现有 i18n key；`OIDC/OAuth`、`SAML`、`Reverse Proxy` 这类专有名词可保留英文。

### 正文迁移顺序

实现先迁壳，再迁正文。第一步只把现有 `renderApplicationForm()` 输出挂入 `LargeEditShell`，保持字段和 handler 不变。第二步再按 tab 抽小 helper 或局部组件，补区块标题、表单网格和表格模块样式。这样可以在每一步用测试确认没有改坏保存 payload 或 tab 渲染。

基础 tab 的 Logo、组织图标等资产字段应参考组织页资产行样式，避免截图里旧式嵌套 Row 造成 label 和输入框边界不一致。Provider、OIDC/OAuth、SAML、Reverse Proxy 内的表格或 URL 列表应是全宽模块，不继承主字段 label/content Row 布局。

### 校验与错误定位

新增保存前校验 `application.name` 和 `application.displayName` 的 trim 后值。缺失时展示字段错误、激活 `basic` tab，并阻止调用 `ApplicationBackend.updateApplication`。

已有 custom scopes 校验继续保留；当 scope 名为空时激活 `oidc-oauth` tab，并保持现有错误提示语义。应用名非法字符校验仍在输入阶段拦截，不改变当前字符集规则。

### Dirty 与 submitting

任意字段变更、表格更新、上传成功写回、主题设置更新或 Provider 绑定更新都标记 dirty。保存开始后进入 submitting 状态，禁用重复提交；保存成功后清除 dirty 并按原语义停留或返回 `/applications`。保存失败时保留当前错误回滚逻辑。

### 样式边界

样式继续放在 `web-admin/src/styles/large-edit-pages.less` 的 `.application-edit-page` 作用域内。不要裸写 `.ant-row`、`.ant-table` 或 `.ant-btn`。应用页特例使用 `application-edit-*` section/item class 表达，只有多个编辑页重复后再抽公共 mixin 或组件。

### 浏览器评估

实施中需要用本地 dev 前端代理 60 后台或脱敏 preview/mock 逐个 tab 做视觉检查。检查项至少包括：

- 桌面首屏、滚动中段、滚动尾部。
- 浅色和暗色主题。
- tab 切换、hash 恢复、无 webpack overlay、无 page error。
- `documentElement.scrollWidth <= clientWidth + 1`。
- Provider、OIDC/OAuth、SAML、Reverse Proxy 表格或 URL 列表不出现不必要的页面级横向滚动。
- 界面定制预览不白屏，预览内容不挤压编辑表单。

## Risks / Trade-offs

- [Risk] `ApplicationEditPage.tsx` 仍是大型 legacy class component，直接一次性重排全部 JSX 容易漏 handler。
  - Mitigation: 先迁壳，再按 tab 小步抽 helper；每步运行聚焦测试。
- [Risk] 应用页内部有多个嵌套表格和预览组件，公共表单网格可能再次误伤 full-width 内容。
  - Mitigation: 主字段行使用明确 `application-edit-field-row` class；全宽内容使用 `application-edit-full-width-section` 或等价 class。
- [Risk] 界面定制 tab 预览较重，浏览器 smoke 可能受登录态或后端数据影响。
  - Mitigation: 优先使用 60 后台真实数据；如果受登录阻断，使用脱敏 mock route 覆盖 DOM/截图指标，并记录运行态复测路径。
- [Risk] 引入 dirty 确认会改变用户离开页面的交互节奏。
  - Mitigation: 仅在用户实际修改字段后触发；新增取消仍保留删除临时应用语义。
