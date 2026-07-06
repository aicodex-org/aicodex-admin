## 1. OpenSpec

- [x] 1.1 编写 proposal/design/tasks 和 `admin-enterprise-identity-usage-access-entry` delta spec。
- [x] 1.2 完成实施前 review，运行 `openspec validate clarify-admin-metadata-handoff-primary-decision --strict` 和 `git diff --check`。

## 2. 实现与测试

- [x] 2.1 先更新 `ApplicationUsageAccessPage.test.tsx`，覆盖 partial 默认层主决策、按钮文案和默认可见首个阻断摘要。
- [x] 2.2 调整 `ApplicationAccessServiceCredentialGovernancePanel.tsx` 主提示、下一步、按钮标签、默认阻断摘要和诊断按钮 aria。
- [x] 2.3 同步 zh/en locale，保持中英文语义一致。

## 3. 验证与收口

- [x] 3.1 跑相关 Jest、聚焦 coverage、incremental TypeScript gate、`yarn typecheck`、`yarn build`、`git diff --check`。
- [x] 3.2 评估 browser smoke；本 change 只改文案、按钮标签、默认阻断摘要和 aria，不改 CSS、路由、API 或布局结构，未执行 browser smoke。
- [x] 3.3 更新 `verification.md`，完成 pre-archive review。
- [x] 3.4 Archive change，跑 archive 后 final gate，并按 self-closeout 推送 `hfl-test-base`。
