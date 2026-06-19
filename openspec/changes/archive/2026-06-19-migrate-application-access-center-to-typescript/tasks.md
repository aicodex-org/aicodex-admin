## 1. OpenSpec

- [x] 1.1 创建 `migrate-application-access-center-to-typescript` 的 proposal、design、tasks 和 spec delta。
- [x] 1.2 完成实施前 review，并修复 proposal/design/tasks/spec 中清晰可修的问题。

## 2. TypeScript 迁移

- [x] 2.1 将 `web-admin/src/ApplicationAccessCenter.js` 重命名为 `ApplicationAccessCenter.tsx`。
- [x] 2.2 为 props、应用记录、Provider 绑定、摘要指标、卡片、风险项和展示项补充局部 TypeScript 类型。
- [x] 2.3 保持 `buildApplicationAccessCenterSummary` 的导出、输入兼容、脱敏行为和可见页面输出不变。
- [x] 2.4 将 `ApplicationAccessCenter.test.js` 重命名为 `ApplicationAccessCenter.test.tsx`，只做 TypeScript 必要调整。

## 3. 验证

- [x] 3.1 运行 `openspec validate migrate-application-access-center-to-typescript --strict`、`openspec validate --changes --strict`、`openspec validate --specs --strict`。
- [x] 3.2 运行 `git diff --check`。
- [x] 3.3 在 `web-admin` 运行增量 TypeScript gate、`yarn typecheck`、聚焦 Jest coverage 和 `yarn build`。
- [x] 3.4 在 `verification.md` 记录命令、覆盖率对象、结果和剩余风险，验证记录保持脱敏。

## 4. 收口

- [x] 4.1 完成归档前 review，确认文档语言、注释、覆盖率、主规格同步和交付单元边界。

Archive、单 commit、push 工作分支和 ff-only 合入属于 OpenSpec 外层 closeout 流程，在归档后执行并通过最终 Git/验证报告确认。
