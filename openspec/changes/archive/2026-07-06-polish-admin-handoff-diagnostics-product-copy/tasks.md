## 1. OpenSpec

- [x] 1.1 编写 proposal/design/tasks 和 `admin-enterprise-identity-usage-access-entry` delta spec。
- [x] 1.2 完成实施前 review，运行 `openspec validate polish-admin-handoff-diagnostics-product-copy --strict` 和 `git diff --check`。

## 2. 实现与测试

- [x] 2.1 先更新 `ApplicationUsageAccessPage.test.tsx`，覆盖默认层不出现 `Admin secure handoff 不在 P0`，展开诊断不出现环境维护项和底层 secret 落点动作。
- [x] 2.2 调整 `ApplicationAccessServiceCredentialGovernancePanel.tsx` 默认边界文案和诊断 owner evidence 渲染条件。
- [x] 2.3 同步 zh/en locale，保持中英文默认层语义一致。

## 3. 验证与收口

- [x] 3.1 跑相关 Jest、聚焦 coverage、incremental TypeScript gate、`yarn typecheck`、`yarn build`、`git diff --check`。
- [x] 3.2 评估 browser smoke；本 change 只改默认/诊断文案和渲染条件，不改布局、样式、路由或交互结构，未执行 browser smoke。
- [x] 3.3 更新 `verification.md`，完成 pre-archive review。
- [x] 3.4 完成归档前 self-closeout 清单确认；archive 后 final gate、推送 `hfl-test-base` 和工作分支清理由 closeout 流程记录。
