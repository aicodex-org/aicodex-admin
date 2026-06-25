## 1. OpenSpec

- [x] 1.1 校验 change artifacts，确认范围只包含 8 个标准分页列表并排除 `/identity-assets`。

## 2. 组织账号列表

- [x] 2.1 迁移 `/invitations` 到 `ListPageTable`、`EnterpriseListQueryToolbar` 和统一表格壳。
- [x] 2.2 调整邀请码列表测试，覆盖公共标题、动作区、表格壳和原有新增/删除/查询行为。

## 3. 身份源列表

- [x] 3.1 迁移 `/organization-sync-api-keys` 到统一列表壳。
- [x] 3.2 迁移 `/syncers` 到统一列表壳。
- [x] 3.3 调整身份源相关列表测试，覆盖公共标题、动作区、表格壳和原有行为。

## 4. 权限与 Casbin 列表

- [x] 4.1 迁移 `/roles` 到统一列表壳。
- [x] 4.2 迁移 `/permissions` 到统一列表壳。
- [x] 4.3 迁移 `/models` 到统一列表壳。
- [x] 4.4 迁移 `/adapters` 到统一列表壳。
- [x] 4.5 迁移 `/enforcers` 到统一列表壳。
- [x] 4.6 调整权限/Casbin 相关列表测试，覆盖公共标题、动作区、表格壳和原有行为。

## 5. 验证

- [x] 5.1 运行 `openspec validate "align-admin-governance-list-pages" --strict`。
- [x] 5.2 运行目标页面 focused Jest tests。
- [x] 5.3 运行 `yarn typecheck`。
- [x] 5.4 运行 `yarn build`。
- [x] 5.5 启动本地前端并连接 60 后台，只读预览 8 个目标入口。
