## 1. OpenSpec

- [x] 1.1 编写 proposal/design/tasks 和 delta spec，明确 Admin owner 边界、triage 状态、fail-closed 条件和不能外推边界。
- [x] 1.2 完成实施前 review，并运行 `openspec validate "stabilize-admin-gateway-projection-controlled-smoke-operator-triage-handoff" --strict` 与 `git diff --check`。

## 2. TDD 与实现

- [x] 2.1 先写 focused Node tests 覆盖 ready、blocked、needs-user-action、hard-red-line、敏感字段、真实执行信号、跨 owner overclaim 和 unknown alias。
- [x] 2.2 实现 `gatewayProjectionControlledSmokeOperatorTriageHandoff.js`，保持本地 dry-run、脱敏输出和 fail-closed 行为。
- [x] 2.3 新增 Bruno 本地入口，运行前完成本地 triage package 生成并在网络请求前中止。

## 3. 文档与规格

- [x] 3.1 更新 Admin gateway projection operator README，说明输入/输出、失败修复路径和不能外推边界。
- [x] 3.2 同步 delta spec，归档时更新 `admin-gateway-organization-projection-publisher` 主规格。
- [x] 3.3 更新 `verification.md`，记录命令、覆盖率对象、结果、剩余风险和脱敏边界。

## 4. 验证与收尾

- [x] 4.1 运行 focused Node tests、相关 Admin controlled-smoke handoff subset test、覆盖率检查、OpenSpec strict validate 和 `git diff --check`。
- [x] 4.2 完成 pre-archive review，修复阻断问题。
- [x] 4.3 archive change，整理为单个本 change commit，并按 prompt 合入 `origin/hfl-test-base`。
