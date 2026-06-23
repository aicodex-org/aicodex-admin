## 1. OpenSpec

- [x] 1.1 创建 `reuse-list-page-table-for-organizations` change。
- [x] 1.2 补充 proposal、design 和组织身份中心 spec delta。
- [x] 1.3 运行 `openspec validate reuse-list-page-table-for-organizations --strict` 并修正问题。

## 2. 组织列表实现

- [x] 2.1 将组织列表表格切换为共享 `ListPageTable`，复用列表页表格密度、边框、排序提示和固定布局默认值。
- [x] 2.2 从组织列表默认列移除 `passwordSalt`、`defaultAvatar`、`orgBalance`、`userBalance`、`balanceCredit` 和 `balanceCurrency`。
- [x] 2.3 将组织添加动作移入 `EnterpriseListQueryToolbar.actions`，并保留管理员权限控制。
- [x] 2.4 保留组织页高级筛选字段、目录健康上下文、群组/用户跳转、编辑、删除和既有后端查询契约。
- [x] 2.5 桌面端组织表格使用内部纵向滚动，移动端保留横向滚动兜底。

## 3. 测试与验证

- [x] 3.1 更新组织列表测试，覆盖默认列收敛、共享表格壳、工具栏添加动作和滚动策略。
- [x] 3.2 运行组织列表与群组列表单测，确认组织页复用不破坏群组页。
- [x] 3.3 运行增量 TypeScript gate、typecheck、build 和 diff 检查。
- [x] 3.4 本轮未重新启动本地前端；用户已确认相似列表视觉方向，代码通过自动化验证。
