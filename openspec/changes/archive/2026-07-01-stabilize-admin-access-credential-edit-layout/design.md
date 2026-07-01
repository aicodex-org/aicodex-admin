## Goals / Non-Goals

### Goals

- 让应用接入、凭据和集成配置编辑页的主编辑 Card 暴露统一 scoped class，便于布局、测试和后续 smoke 定位。
- 让页面内部直接表单行在桌面端使用稳定 label 宽度与可伸缩内容列，在窄屏端换为单列流式布局。
- 保持样式选择器只命中本 change 新增 class，不影响 `admin-large-edit-*`、`admin-gateway-edit-*` 或其它页面。

### Non-Goals

- 不重构页面数据加载、保存、校验、路由跳转、权限判断、LDAP 同步、Token、凭据或 Webhook 业务逻辑。
- 不调整应用、Provider、Syncer、组织、用户、Gateway Agent/Entry/Server/Site/Rule 等已完成布局页面。
- 不调整 `LdapSyncPage`，该页是 LDAP 同步表格工作流，不是内部 label/content 编辑表单。
- 不新增全局表单组件或迁移所有旧编辑页。

## Decisions

- 使用本 change 独立 class 命名：`admin-access-edit-page`、`admin-access-edit-card`、`admin-access-edit-field-row`。页面可同时保留页面专属 class 便于测试和后续局部修复。
- 只给主编辑 Card 内部需要稳定 label/content 的 Row 增加字段行 class。复杂内嵌表格、Tabs 或非两列结构不强行改写。
- CSS 写在 `App.less`，但选择器必须以 `.admin-access-edit-card` 或 `.admin-access-edit-page` 为边界，不复用 large/gateway 的选择器。
- 测试以源码/样式契约为主：确认候选页面暴露 class hook、关键字段行使用 row class、CSS 包含桌面稳定宽度与窄屏换行规则。

## Layout Contract

- 桌面端：字段行使用 flex 布局；第一列 label 使用固定基础宽度，内容列使用剩余空间并允许输入框、选择器、表格或文本域在自身容器内处理 overflow。
- 窄屏端：字段行 label 与内容列均变为 `100%` 宽度，避免页面级横向滚动。
- 原有 inline `style={{marginTop: ...}}` 可以保留，只负责行间距，不再承担列宽稳定性。

## Verification Strategy

- OpenSpec：运行单 change、全部 active changes、全部 specs 的 strict validate。
- 前端源码：运行 incremental TypeScript gate、`yarn typecheck`、聚焦 Jest 和 `yarn build`。
- 布局契约：用本地静态 DOM 或本地 dev build/dev server 做浏览器 smoke，至少覆盖 1280px 桌面，验证 `admin-access-edit-card` 字段行 label/content 宽度和无页面级横向 overflow。浏览器 smoke 只证明前端布局，不声明真实后端保存链路。
