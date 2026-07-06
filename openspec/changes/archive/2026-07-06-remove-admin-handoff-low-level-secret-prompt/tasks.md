## 1. OpenSpec

- [x] 1.1 编写 proposal/design/tasks 和 `admin-enterprise-identity-usage-access-entry` delta spec，明确默认层不再展示底层 secret 落点主叙事。
- [x] 1.2 运行 `openspec validate remove-admin-handoff-low-level-secret-prompt --strict`。

## 2. 实现与测试

- [x] 2.1 先更新 `ApplicationUsageAccessPage.test.tsx`，覆盖默认层不出现 `部署 Secret`、`外部 secret system`、`.env`、`K8s Secret`、`Vault/KMS` 等低层提示。
- [x] 2.2 调整 `ApplicationAccessServiceCredentialGovernancePanel.tsx` 默认层 fallback 文案，使下一步指向 Insight manual/secretRef binding。
- [x] 2.3 同步 zh/en locale，保持中英文默认层语义一致。

## 3. 验证与收口

- [x] 3.1 跑相关 Jest、incremental TypeScript gate、`yarn typecheck`、`yarn build`、`git diff --check`。
- [x] 3.2 评估 browser smoke；本 change 未改布局/样式/交互结构，记录不执行原因和验证替代证据。
- [x] 3.3 更新 `verification.md`，完成 pre-archive review。
- [x] 3.4 Archive change，跑 archive 后 final gate，并按 self-closeout 推送 `hfl-test-base`。
