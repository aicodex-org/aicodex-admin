## Context

目标页面是 LLM AI / Gateway 编辑链路的长表单，当前多处通过 `Row` 包 `Col span={2}` label 与 `Col span={22}` 内容列实现。这个模式在中文/英文长 label、工具提示和窄屏下容易产生 label 挤压、内容列宽度不稳定或页面级横向 overflow。

本任务与 Admin-0 的组织/用户/应用/Provider/Syncer 大编辑页布局修复并行，必须避免触碰那些页面和共享全局选择器。

## Goals / Non-Goals

**Goals:**
- 让 Agent、Entry、MCP Server、Site、Rule 编辑页拥有稳定 class hook，便于 CSS 和测试定位。
- 将这些页面内部的普通表单行收敛为 `label + control` 的稳定两列布局，窄屏自动换行。
- CSS 仅作用于本任务新增的 Gateway 编辑页 class，不影响嵌套表格、规则表达式编辑器、列表页或其它编辑页。
- 通过 Jest、typecheck、build 和浏览器 smoke 验证布局契约。

**Non-Goals:**
- 不改后端接口、保存/删除 payload、字段语义、路由、权限判断或 Gateway projection publish 行为。
- 不迁移文件类型、不重构旧生命周期方法、不重做按钮区或列表页视觉。
- 不触碰组织、用户、应用、Provider、Syncer 编辑页。

## Decisions

- 使用页面级 `admin-gateway-edit-page` 和卡片级 `admin-gateway-edit-card` 作为 scoped hook。这样 `App.less` 选择器可以限定在 LLM AI / Gateway 编辑卡片内，降低与 Admin-0 `App.less` 修改冲突后的误伤风险。
- 生产代码保留现有 AntD `Row` / `Col` 结构，只通过 class 和 CSS 覆盖旧 span 的视觉布局。这样修改面小，不改变字段组件、事件处理、保存路径或测试 fixture。
- CSS 优先选择 direct child 和局部 class，普通表单行采用 flex wrap；对卡片内部嵌套表格、规则表达式编辑器和 AntD 表格不做全局 grid/flex 改写。
- Jest 只断言 hook 与契约 class 存在，不断言像素值；像素和 overflow 通过浏览器 smoke 读取 DOM 尺寸验证。

## Risks / Trade-offs

- `App.less` 可能与 Admin-0 并行 change 产生文本冲突 -> closeout 前 fetch/rebase latest base，并将选择器保持在本任务新增 class 下。
- 仅 CSS 修复不能证明真实后端数据链路 -> 浏览器 smoke 明确标记为 fixture DOM/布局验证，不夸大为真实运行态链路通过。
- Rule 页面包含表达式子组件 -> 只给页面壳和主编辑卡片增加 class，CSS 避免选择 `.ant-table` 或表达式组件内部结构。
