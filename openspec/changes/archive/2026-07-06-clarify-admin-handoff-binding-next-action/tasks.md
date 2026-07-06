## 1. OpenSpec

- [x] 1.1 编写 proposal/design/tasks 和 `admin-enterprise-identity-usage-access-entry` delta spec，明确本轮只调整默认 next action 和 copy-safe 生成提示。
- [x] 1.2 运行 `openspec validate clarify-admin-handoff-binding-next-action --strict`。

## 2. 实现与测试

- [x] 2.1 更新 `ApplicationUsageAccessPage.test.tsx`，覆盖 partial/missing 默认态不再出现 Admin 部署配置或外部 secret system 主提示。
- [x] 2.2 调整 `ApplicationAccessServiceCredentialGovernancePanel.tsx` 默认 next action、阻断建议和生成成功提示，使其指向 Insight manual/secretRef binding。
- [x] 2.3 同步 zh/en locale；必要时收敛默认 copy-safe nextAction 的 backend 文案，不改变 contract。

## 3. 验证与收口

- [x] 3.1 跑相关 Jest、覆盖率、incremental TypeScript gate、`yarn typecheck`、`yarn build`、`git diff --check`。
- [x] 3.2 做本地 mock-auth browser smoke：1440 与 390px 默认/展开，确认 console error=0、页面级 overflow=0。
- [x] 3.3 更新 `verification.md`，完成 pre-archive review。
- [x] 3.4 Archive change，并跑 archive 后 final gate。
