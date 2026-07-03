## 1. OpenSpec

- [x] 1.1 编写 proposal/design/tasks 和 `admin-enterprise-identity-usage-access-entry` delta spec，明确本轮仅做默认告警去重与诊断密度优化。
- [x] 1.2 运行 `openspec validate simplify-admin-handoff-alerts-and-diagnostics-density --strict`。

## 2. 实现与测试

- [x] 2.1 按 TDD 更新 `ApplicationUsageAccessPage.test.tsx`，覆盖 partial 默认态不出现第二个黄色 copy-safe 告警、不突出紫色 P0 边界提示、诊断紧凑结构和敏感字段不可见。
- [x] 2.2 调整 `ApplicationAccessServiceCredentialGovernancePanel.tsx` 默认提示、copy-safe 操作区和诊断详情布局。
- [x] 2.3 同步 zh/en locale 文案，避免中英文模式语义分叉。

## 3. 验证与收口

- [x] 3.1 跑相关 Jest、覆盖率、incremental TypeScript gate、`yarn typecheck`、`yarn build`、`git diff --check`。
- [x] 3.2 做本地 mock-auth browser smoke：1440 与 390px 默认/展开，确认 console error=0、页面级 overflow=0。
- [x] 3.3 更新 `verification.md`，完成 pre-archive review，archive change，跑 archive 后 final gate。
- [x] 3.4 收敛为单逻辑 commit，普通非强制 push `HEAD:hfl-test-base`，删除本地/远端工作分支，并短回主控。
