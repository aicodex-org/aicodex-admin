## 1. OpenSpec

- [x] 1.1 创建 `migrate-business-payments-typescript-closeout` 的 proposal、design、tasks 和 spec delta。
- [x] 1.2 完成实施前 review，并修复 proposal/design/tasks/spec 中清晰可修的问题。

## 2. 扫描和验证

- [x] 2.1 扫描商业付款页面、共享表格和页面级测试，确认没有剩余商业付款 legacy `.js/.jsx` 页面或共享组件。
- [x] 2.2 记录保留的全局路由壳、导航壳、backend clients、`BaseListPage`、`Setting` 和 legacy 类型边界原因。
- [x] 2.3 运行商业付款 focused `.test.tsx` 测试、增量 TS gate、typecheck、build 和 OpenSpec 校验。

## 3. 收口

- [x] 3.1 在 `verification.md` 记录扫描命令、验证命令、结果、既有 warning 和剩余风险，保持脱敏。
- [x] 3.2 完成归档前 review，确认文档语言、验证口径、主规格同步和交付单元边界。
- [x] 3.3 archive change 后收敛为单 change commit，push 工作分支，验证通过后 ff-only 合入 `hfl-test-base` 并删除工作分支。
