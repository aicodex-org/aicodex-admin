## 1. 测试先行

- [x] 1.1 补充用户列表测试，先覆盖主识别单元复用共享 `enterprise-list-*` 语义和弱复制入口。
- [x] 1.2 补充用户列表测试，先覆盖行操作复用共享轻量行操作容器且保留既有业务动作。

## 2. 实现

- [x] 2.1 将用户识别列替换为 `ListPageIdentityCell`，保留现有显示名、用户名、头像和复制行为。
- [x] 2.2 将用户行操作替换为 `ListPageRowActions`，保留编辑、删除、移出群组和模拟登录既有条件与回调。

## 3. 验证

- [x] 3.1 运行用户列表聚焦测试并确认通过。
- [x] 3.2 运行 `yarn typecheck`、必要构建、`openspec validate align-user-list-common-components --strict` 和 `git diff --check`。
