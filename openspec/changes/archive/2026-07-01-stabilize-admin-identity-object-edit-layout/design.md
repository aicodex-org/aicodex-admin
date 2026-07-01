## Context

本任务目标是身份对象 / 权限对象编辑页内部布局一致性，候选页面与已完成的大编辑页、Gateway 编辑页、Admin-3 接入凭据写集不同。目标页面主要通过 AntD `Card` 包裹多行 `Row` / `Col` 表单字段，label 列依赖 `span` 百分比，导致不同页面 label/control 宽度和换行策略不统一。

## Goals / Non-Goals

**Goals:**

- 为 Group、Role、Permission、Invitation 编辑页增加统一 scoped hook，便于 CSS、测试和 browser smoke 定位。
- 将普通字段行收敛为稳定的 `label + control` 两列布局；桌面端 label 列固定宽度，内容列使用剩余空间。
- 窄屏下 label/control 切换为单列，避免页面级横向 overflow。
- CSS 仅作用于本任务新增 class，不影响 `admin-large-edit-*`、`admin-gateway-edit-*`、Admin-3 接入凭据页面或其它业务页面。

**Non-Goals:**

- 不修改 API、保存 payload、字段语义、路由、权限模型、对象关系、删除逻辑或后端接口。
- 不触碰组织、用户、应用、Provider、Syncer、Gateway、接入凭据、billing/product/order/payment/subscription/ticket 页面。
- 不做全局 AntD 表单重构，不迁移无关文件类型，不重做页面按钮区、权限树或列表页视觉。

## Decisions

- 使用 `admin-identity-object-edit-page`、`admin-identity-object-edit-card` 和 `admin-identity-object-edit-field-row` 作为统一 scoped hook。页面可同时保留或新增页面专属 class，便于聚焦测试和后续局部修复。
- 生产代码保留既有 AntD `Row` / `Col` 结构，只添加 class 和 CSS 覆盖视觉布局。这样修改面小，不改变表单组件、事件处理、保存路径或测试 fixture。
- CSS 使用 direct child 与行级 class 选择器，避免粗暴选择 `.ant-row` 或 `.ant-col` 影响嵌套树、表格、权限选择器或其它局部组件。
- Form / Model 相邻对象配置页只有在结构与身份对象编辑页一致、且不会扩大业务行为触达面时纳入；否则在验证记录中说明 deferred 原因。
- Jest 断言 hook 与 scoped CSS 契约，不断言像素；像素和 overflow 通过浏览器 smoke 读取 DOM 尺寸验证。

## Risks / Trade-offs

- `App.less` 与其它 UX worker 并行修改可能产生文本冲突 -> closeout 前基于最新 `origin/hfl-test-base` 检查并保持选择器完全 scoped。
- 静态 DOM/browser smoke 只能证明布局层级，不证明真实后端保存链路 -> 验证记录明确标注为布局 smoke。
- Role / Permission 可能没有既有测试 -> 使用源码/样式契约测试覆盖 hook，避免为了覆盖率添加低价值 mock 测试。
