## 1. OpenSpec 与 Review

- [x] 1.1 创建 controlled-smoke release runbook 的 proposal、design、delta spec 和实施任务。
- [x] 1.2 完成实施前 review，并对本 change 运行 strict OpenSpec validation。

## 2. TDD 实施

- [x] 2.1 先补聚焦 Node 测试，覆盖 ready、missing prerequisite、red-line signal 和 full-success overclaim。
- [x] 2.2 实现只读 controlled-smoke release runbook helper。
- [x] 2.3 增加 Bruno 只读入口和 README/operator 指引，明确 runbook/guardrail 不执行真实 controlled smoke。
- [x] 2.4 同步 `admin-gateway-organization-projection-publisher` 主规格。

## 3. 验证、归档和回传

- [x] 3.1 运行 focused Node tests、受影响脚本 coverage、OpenSpec strict validation 和 `git diff --check`。
- [x] 3.2 在 `verification.md` 记录验证证据、覆盖率、N/A/风险和禁止外推边界。
- [x] 3.3 完成归档前 review 和 archive。

> 外层 worker 流程还会在 OpenSpec archive 后执行单 change commit、显式 refspec 推送 `HEAD:hfl-test-base`、写入 agent report 并释放 lease；这些不属于 archived OpenSpec change 的未完成实现任务。
