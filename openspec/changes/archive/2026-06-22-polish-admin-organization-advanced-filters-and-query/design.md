## Context

`OrganizationListPage.tsx` 已经接入共享 `EnterpriseListQueryToolbar`，并通过 `fetch({searchedColumn, searchText, pagination})` 调用 `OrganizationBackend.getOrganizations`。该后端契约仍是单字段 `field + value` 查询，本任务不扩大到后端 API 重构。

当前问题集中在前端高级筛选入口：组织页传入的 `advancedFilters` 只是文本占位，既没有字段输入，也没有查询行为。共享 toolbar 也会在没有真实 `advancedFilters` 时渲染“更多筛选”按钮，导致空面板风险。

## Goals

- 基础查询保持现有“字段下拉 + 单关键词”的主路径，不改变后端参数、排序和分页入口。
- 高级筛选列出组织页当前可查询属性，并允许多个字段同时填写。
- 高级筛选查询按所有非空条件 AND 过滤；空条件忽略。
- 重置动作一次性清空基础查询和高级筛选条件。
- 共享 toolbar 在没有真实高级筛选内容时不显示展开/收起按钮。
- 桌面与窄屏保持管理后台密度，高级筛选工具栏不新增页面级横向溢出；组织宽表可继续使用内部横向滚动。

## Non-Goals

- 不新增或修改 `OrganizationBackend.getOrganizations`、后端查询接口、数据库索引或跨页搜索契约。
- 不把组织页高级筛选推广到群组、用户、邀请或其它列表页。
- 不修改组织工作台、表格列、排序、行操作、密码类型列筛选、组织同步、认证、授权、Gateway projection 或 Insight 行为。
- 不把前端过滤结果描述为后端全量多字段查询事实。

## Decisions

- 字段源复用 `getOrganizationQueryFields()`。基础查询和高级筛选使用同一组字段：`name`、`displayName`、`websiteUrl`、`passwordSalt`。
- 高级筛选存在非空条件时，候选集请求复用现有 `get-organizations` 未分页路径：`p` 和 `pageSize` 传空值，仍带上当前组织 scope，不新增后端 API 或组合查询参数。
- 候选集返回后，在组织页前端对基础查询非空条件和所有高级非空条件执行大小写不敏感的包含匹配。过滤后数据按当前页码和 pageSize 切片展示，`pagination.total` 使用过滤后数量，避免沿用后端单字段 total 误导用户。
- 高级筛选条件全为空时，查询保持原基础单字段路径。
- 共享 toolbar 使用 `hasRenderableNode(advancedFilters)` 判断是否存在真实高级筛选内容，避免空插槽、空字符串或空 Fragment 渲染按钮。

## Risks

- 未分页候选集适合当前 Admin 组织列表规模和本 UI 修正；对于超大组织集合，后端 owner 后续可以扩展多字段查询以降低前端过滤成本。
- 高级筛选 total 使用过滤后候选集数量；浏览器和报告中需明确本 change 未新增后端多字段查询 API。
