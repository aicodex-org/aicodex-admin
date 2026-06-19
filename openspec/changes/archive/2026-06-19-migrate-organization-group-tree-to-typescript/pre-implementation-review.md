# 实施前 Review

## 结论

`migrate-organization-group-tree-to-typescript` 可以进入实施。

## 检查结果

- OpenSpec artifacts 闭环：`proposal.md`、`design.md`、`tasks.md` 和 `specs/web-admin-incremental-typescript/spec.md` 均存在，且指向同一目标：仅迁移 `GroupTreePage` 到 TSX。
- 范围清晰：本 change 不迁移 `GroupBackend.js`、`GroupListPage.js`、`GroupEditPage.js`、`UserListPage.js` 或其它组织账号页面。
- 设计贴合代码库：保留现有 class component、无后缀导入、`/trees` 路由和 legacy JS 依赖边界，只增加局部类型与聚焦测试。
- Spec 可验收：delta 使用独立 `ADDED Requirement`，覆盖路由导入、树数据读取、群组选中、内嵌用户列表、群组操作和验证门禁。
- 文档语言：已将 spec 新增自然语言正文调整为中文，保留 OpenSpec 结构关键字、SHALL/WHEN/THEN 和代码标识。
- 安全边界：不触碰认证/OIDC、Provider、组织同步、Gateway/Insight、真实密钥或真实环境。
- 交付单元：可按一个 OpenSpec change 收敛为单个 commit，并以 release-candidate-only 方式只 push 工作分支。

## 验证

- `openspec validate migrate-organization-group-tree-to-typescript --strict`：通过。
- `git diff --check`：通过。

## 非阻塞注意事项

- `GroupTreePage` 仍保留 `UNSAFE_componentWillMount`；本 change 只做类型迁移，不改变加载时机。
- `GroupBackend.js` 和 `UserListPage.js` 在当前 base 仍是 JS，TSX 页面需要使用窄范围局部类型或类型断言跨过 legacy JS 模块边界。
