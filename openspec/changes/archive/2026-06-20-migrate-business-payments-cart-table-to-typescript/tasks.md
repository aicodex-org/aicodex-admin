## 1. OpenSpec

- [x] 1.1 创建 `migrate-business-payments-cart-table-to-typescript` 的 proposal、design、tasks 和 spec delta。
- [x] 1.2 完成实施前 review，并修复 proposal/design/tasks/spec 中清晰可修的问题。

## 2. 测试先行

- [x] 2.1 新增或扩展 `.test.tsx`，断言 `CartTable` 使用 TSX 文件且同名 JS 文件已移除。
- [x] 2.2 新增或扩展 `.test.tsx`，覆盖购物车表格名称、图片、价格、数量、详情和 row key 展示。
- [x] 2.3 新增或扩展 `.test.tsx`，覆盖缺失图片和空购物车分支。

## 3. 组件迁移

- [x] 3.1 将 `web-admin/src/table/CartTable.js` 迁移为 `CartTable.tsx`。
- [x] 3.2 扩展 `web-admin/src/types/businessPayment.ts`，补充购物车表格实际读取的局部类型。
- [x] 3.3 确认 `UserEditPage.tsx` 的 extensionless import 不变，不迁移用户编辑页或 backend client。

## 4. 验证

- [x] 4.1 运行 `openspec validate migrate-business-payments-cart-table-to-typescript --strict`、`openspec validate --changes --strict`、`openspec validate --specs --strict`。
- [x] 4.2 运行 `git diff --check`。
- [x] 4.3 在 `web-admin` 运行增量 TypeScript gate、`yarn typecheck`、focused Jest coverage 和 `yarn build`。
- [x] 4.4 在 `verification.md` 记录命令、覆盖率对象、结果、既有 warning 和剩余风险，验证记录保持脱敏。

## 5. 收口

- [x] 5.1 完成归档前 review，确认文档语言、注释、覆盖率、主规格同步和交付单元边界。
- [x] 5.2 archive change 后收敛为单 change commit，push 工作分支，验证通过后 ff-only 合入 `hfl-test-base` 并删除工作分支。
