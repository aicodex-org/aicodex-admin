## 1. Proposal and Review

- [x] 1.1 创建 proposal、design、tasks 和 `admin-gateway-organization-projection-publisher` spec delta。
- [x] 1.2 完成 OpenSpec pre-implementation review，运行 strict validate 和 `git diff --check`。

## 2. Implementation

- [x] 2.1 先新增失败的 Node 测试，覆盖 bounded ready、缺失前置摘要、硬红线、敏感值不回显、跨 owner overclaim 和稳定 alias。
- [x] 2.2 新增 `gatewayProjectionControlledSmokeExecutionHandoff.js` 纯函数，输出稳定交接字段和不能外推边界。
- [x] 2.3 新增 Bruno `Controlled Smoke Execution Handoff.yml` local-only 入口，只消费私有脱敏变量并主动中止网络请求。
- [x] 2.4 更新 Bruno README/operator 指引。

## 3. Spec and Verification

- [x] 3.1 通过 archive 或主规格同步更新 `admin-gateway-organization-projection-publisher`。
- [x] 3.2 运行 focused Node tests、相关 handoff/helper subset、helper 覆盖率、OpenSpec strict validate、主规格 strict validate、changes strict validate 和 `git diff --check`。
- [x] 3.3 补充 `verification.md`，记录命令、结果、覆盖率、pre-archive review、archive 和剩余风险。

## 4. Archive and Delivery

- [x] 4.1 完成 pre-archive review 并修复阻断问题。
- [x] 4.2 Archive change，确认 active change 目录进入 `archive/2026-06-13-stabilize-admin-gateway-projection-controlled-smoke-execution-handoff/`。
- [x] 4.3 整理为单个 change commit；按门禁可 fast-forward 合入并显式推送 `origin HEAD:hfl-test-base`，禁止 push `test`。
