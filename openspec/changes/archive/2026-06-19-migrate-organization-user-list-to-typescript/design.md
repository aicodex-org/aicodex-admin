## Context

`UserListPage.js` 继承 `BaseListPage.js`，同时服务三个入口：

- `/users`：管理员按当前组织选择查看全局或组织内用户。
- `/organizations/:organizationName/users`：查看指定组织用户。
- `GroupTreePage` 内嵌：查看某个群组下的用户，并支持移出群组。

页面还负责默认用户模板、新建、删除、冒充、导入模板、上传预览、上传提交、组织详情读取和 `OrganizationIdentityCenter` 包裹展示。`UserBackend.js` 的复用面很广，除列表页外还服务登录、验证码、MFA、用户编辑、购物车、购买流程和多个选择器；一次性迁移整个 backend client 会扩大风险。

## Goals / Non-Goals

**Goals:**

- 保守迁移 `UserListPage` 到 TSX，保持运行时行为兼容。
- 类型化用户记录、组织记录、列表 state、默认用户模板、fetch 参数、上传预览、表格列和关键操作回调。
- 让 `FormEditPage.js`、`ManagementPage.js`、`GroupTreePage.js` 等 JS 调用方继续能从无后缀路径导入 `UserListPage`。
- 通过聚焦测试覆盖用户列表关键行为、错误路径和 JS/TS 共存边界。

**Non-Goals:**

- 不迁移 `UserBackend.js`。它的登录、验证码、MFA、密码、用户编辑和业务购买调用面过宽，应后续单独评估。
- 不迁移 `UserEditPage.js`、`GroupTreePage.js`、`OrganizationEditPage.js` 或其它组织账号页面。
- 不改变用户 API 参数编码、HTTP 方法、响应处理、上传接口、冒充行为、组织选择策略、用户编辑或身份权限策略。
- 不重做用户列表视觉设计、表格列、上传交互、组织身份中心摘要组件或权限策略。

## Decisions

### 1. 本 change 只迁移用户列表页

用户列表页已经足够复杂，但仍可以按页面边界完成 TSX 迁移。用户编辑页、MFA、验证码和密码链路涉及更敏感的认证/账号安全行为，本 change 不触碰。

### 2. 保留 JS backend，页面内做局部兼容类型

`UserBackend.js` 被大量非列表链路复用，整体迁移会带来参数默认值、`FormData`、验证码和登录链路的类型/行为风险。本 change 在 `UserListPage.tsx` 中声明本页实际使用的 backend 函数 shape，既让页面迁移具备类型约束，也不影响其它 JS 调用方。

### 3. 保留 JS 基类兼容层

`BaseListPage.js` 暂不迁移。`UserListPage.tsx` 使用局部兼容类型声明当前页面依赖的 `getColumnSearchProps`、`getTablePaginationProps`、`handleTableChange` 和继承 state，避免扩大写集。

### 4. 默认用户模板只做类型收口

`newUser()` 的默认字段、组织默认头像、国家码、默认应用、初始积分、注册来源和群组预填逻辑保持不变。测试覆盖关键默认字段和新增后跳转，不在本 change 中重构模板生成。

## Risks / Trade-offs

- **`UserBackend.js` 暂不迁移导致类型边界较局部**：用页面内兼容类型约束本页调用，后续若单独迁移 `UserBackend`，再把类型提升到 backend client。
- **`UserListPage` 同时服务多个入口**：测试覆盖 `/users`、组织用户入口和群组树内嵌入口，防止 fetch 参数或操作按钮回归。
- **上传预览依赖 `FileReader` 和 `xlsx`**：沿用前序列表页测试模式，用 mock FileReader 和 `xlsx` 验证预览/上传合同。
- **前序 RC 尚未合入**：本 change 从最新 `origin/hfl-test-base` 独立开始；后续多个 RC 合入同一个主规格时，需要保留各自新增的 TypeScript migration 场景。

## Validation

- `openspec validate migrate-organization-user-list-to-typescript --strict`
- `openspec validate --changes --strict`
- `openspec validate --specs --strict`
- `git diff --check`
- `cd web-admin; node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`
- `cd web-admin; yarn typecheck`
- 聚焦 Jest + coverage 覆盖 `UserListPage.tsx`
- `cd web-admin; yarn build`
