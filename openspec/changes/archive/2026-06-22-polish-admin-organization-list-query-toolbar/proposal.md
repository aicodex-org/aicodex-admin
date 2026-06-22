## Why

组织页仍把搜索入口分散在表格列头，并把 `添加` 按钮放在旧表头标题旁。群组页已经合入共享查询工具栏后，组织账号域出现了同一控制台下查询入口不一致的问题：管理员访问 `/organizations` 时仍需要在列头小图标中寻找组织名称、显示名称、主页地址等查询字段，主操作和查询动作也没有形成清晰分组。

本 change 只修正组织页，把组织列表的高频搜索和新增动作收敛到已合入的共享 `EnterpriseListQueryToolbar`，保持现有组织工作台、表格、分页、排序、编辑、删除、群组和用户入口不变。

## What Changes

- 在 `OrganizationListPage.tsx` 接入共享查询工具栏，展示字段选择、关键词输入、查询、重置和更多筛选入口。
- 查询字段仅覆盖当前 `OrganizationBackend.getOrganizations` 已能表达的单字段查询：组织名称、显示名称、主页地址和密码盐等现有列字段。
- 将 `添加` 主操作放入工具栏动作区，并继续受管理员权限控制。
- 移除组织页文本列的列头搜索图标作为主搜索入口；列头继续保留排序能力，密码类型仍使用现有表格筛选语义。
- 补充组织页聚焦测试、共享组件回归和验证记录。

## Impact

- 主要前端文件：`web-admin/src/OrganizationListPage.tsx` 与聚焦测试。
- OpenSpec：补充 `admin-enterprise-organization-identity-center` 中组织列表查询工具栏场景。
- Locale：优先复用既有 `general`/`organization` 文案；如新增可见文案，同步 zh/en。
- 不新增 API，不修改后端，不触碰组织同步、真实认证、OAuth/OIDC、Gateway、DB、群组页成果或 `test` 分支。
