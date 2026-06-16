## 1. Proposal and Review

- [x] 1.1 创建 proposal、design、tasks 和 `admin-gateway-organization-projection-publisher` spec delta。
- [x] 1.2 完成实施前 review，运行 OpenSpec strict validate 和 `git diff --check`。

## 2. Implementation

- [x] 2.1 先新增失败的 Node 测试，覆盖 mapping/source/deploy/contract/fixture/controlled smoke blocker、脱敏失败、full-success 外推和 fallback owner 指引。
- [x] 2.2 新增 `gatewayProjectionOperatorRemediationHandoff.js` 纯函数，输出稳定 remediation、owner handoff、最小解除条件、动作清单和不能外推边界。
- [x] 2.3 新增 Bruno `Operator Remediation Handoff.yml` local-only 入口，只消费本地脱敏变量。
- [x] 2.4 更新 Bruno README/operator 指引。

## 3. Spec and Verification

- [x] 3.1 通过 archive 或主规格同步更新 `admin-gateway-organization-projection-publisher`。
- [x] 3.2 运行 focused Node tests、helper 覆盖率、OpenSpec strict validate、主规格 strict validate、changes strict validate、`git diff --check` 和 `git diff --cached --check`。
- [x] 3.3 补充 `verification.md`，记录命令、结果、覆盖率、pre-archive review、archive 和剩余风险。

## 4. Archive and Delivery

- [x] 4.1 完成 pre-archive review 并修复阻断问题。
- [x] 4.2 Archive change，确认 active change 目录进入 `archive/2026-06-13-stabilize-admin-gateway-projection-operator-remediation-handoff/`。
- [x] 4.3 整理为单个 change commit，基于最新 `origin/hfl-test-base` 合入并显式推送 `origin HEAD:hfl-test-base`。
