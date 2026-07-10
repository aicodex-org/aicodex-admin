## Context

Provider 编辑页已经迁移为 TSX，但主体仍是旧 Card title 操作区、页面底部重复按钮和散落的 `Row/Col` 字段行。近期组织、用户、群组、角色、权限和应用编辑页已经沉淀出 `LargeEditShell`、`LargeEditSection`、`LargeEditFieldRow` 以及公共 large edit 样式模块。

Provider 页面和应用页不同，它不是多 tab 配置页；它更接近“单页配置型编辑页”，但仍应该复用同一套页面头部、滚动正文和底部动作栏。

## Goals / Non-Goals

**Goals:**

- Provider 编辑页使用共享大型编辑页壳呈现头部、面包屑、标题、滚动正文和底部动作栏。
- Provider 基础信息使用共享区块和字段行，和已改造编辑页保持标签、控件宽度、密度和响应式一致。
- 动态 Provider 专属字段继续走既有 helper，避免在本次改造中重写 OAuth、SAML、Email、SMS 等配置语义。
- 增加聚焦测试，防止回归到旧 Card title 按钮或重复底部按钮。

**Non-Goals:**

- 不改 Provider 保存 payload、删除 payload、后端 API、权限、认证回调、OAuth/OIDC/SAML 运行态行为。
- 不新增真实 provider 探测、授权刷新、组织同步或配置向导能力。
- 不在本次引入 Provider dirty 状态、离开确认或字段必填体系；旧页面没有该行为，后续可单独统一。
- 不重写 `web-admin/src/provider/*` 中各 Provider 类型的专属字段渲染。

## Decisions

1. **Provider 使用单 tab / 无 tabs 的 `LargeEditShell`。**
   Provider 编辑页本身是一个配置表单，类型切换后动态字段变化；强行拆 tabs 会改变用户扫描路径，也会影响现有 helper 输出顺序。本次只统一壳和正文密度。

2. **基础信息改为共享 `LargeEditSection` + `LargeEditFieldRow`。**
   基础字段包括名称、显示名称、组织、类别、类型、子类型、方法、Scope、Provider URL 等稳定字段。这样能消除页面私有 `Row/Col` 视觉漂移，并为后续配置型编辑页提供模板。

3. **动态专属字段先包在 `admin-large-edit-form-content` 中。**
   OAuth、Email、SMS、SAML 等 helper 当前返回旧式 `Row/Col`。公共样式已经覆盖 `admin-large-edit-form-content` 下的 legacy 行，能在不重写 helper 的情况下获得统一密度。后续若某类 Provider 字段需要更细 polish，再按类型局部迁移。

4. **底部动作由 shared shell 唯一承载。**
   移除 Card title 和页面外层重复保存按钮。底部动作收敛为取消、保存、保存并返回：编辑态取消返回 Provider 列表，添加态取消删除列表页预创建的临时 Provider，保存动作仍调用既有方法，不改变 API 行为。

## Risks / Trade-offs

- [Risk] 动态 Provider helper 仍输出旧式 `Row/Col`，与完全迁移到 `LargeEditFieldRow` 的页面存在内部 DOM 差异。→ 通过 `admin-large-edit-form-content` 公共 legacy row 样式收敛视觉，避免在一个 change 中重写所有 provider 类型字段。
- [Risk] Provider 类型多，单一 fixture 无法覆盖所有动态字段组合。→ 自动化测试覆盖共享壳和代表性字段，浏览器预览至少验证默认/当前可访问 Provider 编辑页；剩余类型差异记录为后续 UI polish 风险。
- [Risk] 新增返回/取消入口是旧编辑态没有的入口。→ 编辑态只导航到 Provider 列表；添加态取消仍保留删除语义，不触碰保存 payload 或后端 contract。

## Migration Plan

1. 起草并验证 OpenSpec change。
2. 修改 Provider 编辑页接入共享壳、区块和字段行。
3. 新增最小 Provider 编辑页样式模块并接入 large edit 样式入口。
4. 补充前端测试、运行类型检查和构建。
5. 启动本地前端代理 60 后台，使用浏览器截图/DOM 检查 Provider 编辑页关键布局。
