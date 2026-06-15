## 1. Proposal and Review

- [x] 1.1 创建 proposal、design、tasks 和 `wecom-organization-sync` spec delta。
- [x] 1.2 运行实施前 OpenSpec 校验，确认范围、写集和不可外推边界清楚。

## 2. Implementation

- [x] 2.1 先新增失败的 Node 测试，覆盖 ready、每个 blocking alias、脱敏失败、未检查状态和下游成功外推防护。
- [x] 2.2 新增 `wecomSourceReleaseDecision.js` 纯函数，输出稳定 decision、reasonAlias、owner handoff、最小解除条件、安全下一步和禁止继续原因。
- [x] 2.3 新增 Bruno `Source Release Decision` 只读入口，并确保它排在 `手动触发同步.yml` 之前。
- [x] 2.4 更新 Bruno README/operator 指引。

## 3. Spec and Verification

- [x] 3.1 更新 `wecom-organization-sync` 主规格。
- [x] 3.2 运行 focused Node tests、OpenSpec strict validate、主规格 strict validate 和 `git diff --check`。
- [x] 3.3 补充 `verification.md`，记录命令、结果、覆盖率适用性和剩余风险。

## 4. Archive and Delivery

- [x] 4.1 完成 pre-archive review 并修复阻塞问题。
- [x] 4.2 Archive change，确认 active change 目录不存在或已进入 archive。
- [x] 4.3 整理为单个 change commit，基于最新 `origin/hfl-test-base` ff-only 合入并显式推送 `origin HEAD:hfl-test-base`。
