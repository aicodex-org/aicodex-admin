## 1. OpenSpec 与 Review

- [x] 1.1 创建 controlled smoke preflight handoff 的 proposal、design、delta spec 和实施任务。
- [x] 1.2 完成实施前 review，并对本 change 运行 strict OpenSpec validation。

## 2. TDD 实施

- [x] 2.1 先补聚焦 Node 测试，覆盖 controlled smoke preflight 的脱敏 fail-closed、not-checked、Admin release、source freshness、mapping readiness 和 API diagnostics blocker。
- [x] 2.2 实现只读 controlled smoke preflight handoff helper 和 Bruno 入口。
- [x] 2.3 更新 Bruno README/operator 指引，说明 controlled smoke preflight 用法和不能外推边界。

## 3. 验证与归档

- [x] 3.1 运行聚焦 Node 测试、node 语法检查、受影响文件 coverage、OpenSpec validation 和 git whitespace 检查。
- [x] 3.2 在 `verification.md` 记录验证证据和剩余风险。
- [x] 3.3 完成归档前 review、archive、specs/changes 验证、用显式 refspec squash/merge 到 `hfl-test-base`，回收工作分支并写最终协调报告。
