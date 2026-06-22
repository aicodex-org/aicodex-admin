## Context

`OrganizationListPage.tsx` 已经通过 `fetch({searchedColumn, searchText, passwordType, pagination})` 调用 `OrganizationBackend.getOrganizations`，后端契约仍是单字段 `field + value` 查询。当前页面的旧列头搜索来自 legacy `BaseListPage.js#getColumnSearchProps`，而群组页已经在 `158bb073` 基线中新增并接入 `web-admin/src/common/EnterpriseListQueryToolbar.tsx`。

组织页外层还包含 `OrganizationIdentityCenter` 工作台和多个行级入口。本 change 不改这些结构，只把表格 `title` 从旧标题/按钮替换为共享查询工具栏，让高频搜索入口出现在表格上方。

## Goals

- 组织页主查询入口与群组页保持一致，管理员可在表格上方选择字段、输入关键词并查询。
- 查询动作复用现有单字段后端参数，不暗示多字段组合搜索或新增状态筛选。
- `添加` 保留为主操作，但从旧表头旁移到工具栏动作区，并继续遵守管理员权限。
- 工具栏保持紧凑，不引入说明卡、状态带或大字号布局，桌面首屏仍能看到组织表格顶部。

## Non-Goals

- 不修改 `OrganizationBackend.getOrganizations`、后端接口、数据库或查询语义。
- 不改变组织工作台、目录健康卡、表格列、排序、分页、编辑、删除、群组、用户、密码类型筛选等既有行为。
- 不修改 `GroupListPage.tsx` 或回滚群组页工具栏成果。
- 不新增组织状态、类型或组合筛选；如果后端字段不足以表达筛选，不在前端伪造。
- 不改组织树、组织同步、目录质量、邀请、用户、群组详情、认证或授权链路。

## Decisions

- 复用 `EnterpriseListQueryToolbar` 的字段选择、关键词输入、查询/重置/更多筛选和动作槽，不新增第二套查询栏。
- 组织页默认查询字段为 `name`，可切换到 `displayName`、`websiteUrl` 和 `passwordSalt`；这些字段均能用现有 `field + value` 查询参数表达。
- 点击查询时把分页重置到第一页，并调用 `fetch({searchedColumn: queryField, searchText: trimmedKeyword})`；空关键词仍按所选字段传空值，避免隐藏旧单字段查询行为。
- 点击重置时清空工具栏状态和 legacy search state，并以第一页重新加载。
- 更多筛选默认折叠，仅展示后续可扩展容器；本 change 不接入状态或类型类筛选。

## Risks

- 组织页仍保留密码类型的表格列筛选，因为它是既有列级筛选能力；本次不把它改造成工具栏状态筛选，避免改变后端参数优先级。
- 共享工具栏更多筛选按钮目前用于承载扩展槽，组织页没有新增高级条件；验证记录需要说明未新增伪组合筛选。
