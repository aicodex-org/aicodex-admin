## Why

群组编辑页当前仍是旧式 Card 标题按钮 + 表单行 + 底部重复按钮的结构，保存入口会随内容滚动且缺少统一取消/返回语义。组织编辑页已经形成固定编辑壳样板，群组页适合做轻量单页编辑壳迁移，但不适合强行拆成 Tabs。

本次改造聚焦群组元信息编辑体验，不把组织列表中的“群组成员管理/用户列表”能力混入群组编辑页。

## What Changes

- 将群组编辑页迁移为单页编辑壳：顶部返回路径、对象标题、未保存状态、正文基础信息区块和底部固定操作栏。
- 移除旧 Card title 内的保存按钮和底部重复按钮，统一按钮顺序为 `取消`、`保存`、`保存并返回`。
- 群组 `名称`、`显示名称` 显示红色必填标识，并在保存前前端校验；校验失败时阻止调用保存 API。
- 群组字段保持单页布局，不新增 Tabs；`用户` 字段只作为只读成员摘要展示，本地群组可跳转到既有群组树/用户列表上下文维护成员。
- 目录同步群组将 `名称` 表达为 `同步标识`，并将同步标识、组织、类型、上级组和成员关系明确为来源系统托管字段。
- 非目录同步群组将 `名称` 表达为 `群组标识`，减少与 `显示名称` 的语义混淆。
- 工作区顶部标签在群组详情页使用群组标识兜底，并在群组数据加载后更新为显示名称。
- 当前成员较多时摘要折叠展示，避免成员标签撑开页面。
- 保留目录同步群组的成员只读提示、父级群组选项、保存 payload、`isTopGroup` 计算、新增取消删除临时群组和 group tree 返回语义。
- 不新增后端 API，不新增成员管理页，不改变群组成员增删、用户列表移出群组、组织同步、认证或授权链路。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `admin-enterprise-organization-identity-center`: 增加群组编辑页单页编辑壳、必填校验、成员只读摘要和业务语义保持要求。
- `admin-enterprise-identity-console-shell`: 明确身份对象编辑页可以采用固定底部操作栏的单页编辑壳，并保持单壳和无横向溢出规则。

## Impact

- Affected code: `web-admin/src/GroupEditPage.tsx`, `web-admin/src/GroupEditPage.test.tsx`, `web-admin/src/App.less`, `web-admin/src/locales/en/data.json`, `web-admin/src/locales/zh/data.json`.
- Affected docs/specs: this OpenSpec change and related main specs after archive.
- Affected validation: OpenSpec strict validate, incremental TypeScript gate, `yarn typecheck`, focused group edit tests, and local browser smoke when preview is available.
