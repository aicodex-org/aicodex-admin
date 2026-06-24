## Why

组织、群组列表已经把主识别单元和行操作沉淀为公共组件，但用户列表仍在页面内手写主对象 JSX 和行操作 `Space`。这会让后续统一调整文本层级、弱复制入口和行操作密度时仍需要逐页修改，也容易再次出现“视觉对齐但组件复用不一致”的问题。

## What Changes

- 将用户列表主识别单元复用 `ListPageIdentityCell`，保留用户名/显示名、技术 ID、头像和复制语义。
- 将用户列表行操作复用 `ListPageRowActions`，保留编辑、删除、移出群组和模拟登录既有行为。
- 保持用户列表现有列结构、查询字段、更多筛选、分页、上传/下载模板、后端 API 和权限语义不变。
- 补充用户列表测试，断言用户页与组织/群组页使用同一套公共列表组件边界。

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `admin-enterprise-organization-identity-center`: 用户列表共享列表组件复用要求从样式语义对齐补强为主识别单元和行操作组件边界对齐。

## Impact

- Affected code: `web-admin/src/UserListPage.tsx`, `web-admin/src/UserListPage.test.tsx`
- Likely shared code: `web-admin/src/common/ListPageIdentityCell.tsx`, `web-admin/src/common/ListPageRowActions.tsx`
- Affected UI: 用户列表
- No backend API, database, dependency, authentication, authorization, provider, sync, Gateway projection, or external-system execution changes.
