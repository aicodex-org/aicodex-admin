## 1. 实施前 Review

- [x] 1.1 审查 proposal、design、tasks、delta spec、既有 release decision wrapper、readiness summary 和 Bruno 入口是否存在阻断级缺口。
- [x] 1.2 实施前运行 `openspec validate stabilize-admin-gateway-projection-release-decision-operator-handoff --strict` 和 `git diff --check`。

## 2. 实施

- [x] 2.1 先新增会失败的 Node 测试，覆盖 decision 到 handoff 的映射：受控 smoke ready、source freshness、mapping readiness、contract/config、not checked、敏感输入、未知状态和不能外推边界。
- [x] 2.2 扩展 `gatewayProjectionReleaseDecision.js`，生成脱敏 operator handoff summary，包含 `release`、`localBlockerCategory`、owner handoffs、最小解除条件和 `doNotDispatchUntil`。
- [x] 2.3 更新 Bruno `Release Decision` after-response 脚本，输出 handoff summary，并保留既有 ready gate 行为。
- [x] 2.4 更新 Bruno README，补充本地 dry-run、decision owner/action guidance、最小解除条件和禁止外推边界。

## 3. 规格

- [x] 3.1 更新主规格 `admin-gateway-organization-projection-publisher`，补充 operator handoff summary 要求。
- [x] 3.2 更新 OpenSpec verification，记录命令、结果、覆盖率和剩余风险。

## 4. 验证和归档

- [x] 4.1 运行受影响脚本的聚焦 Node 测试、语法检查和覆盖率检查。
- [x] 4.2 运行 `openspec validate stabilize-admin-gateway-projection-release-decision-operator-handoff --strict` 和 `git diff --check`。
- [x] 4.3 归档 change，然后运行 `openspec validate --specs --strict` 和 `openspec validate --changes --strict`。
- [x] 4.4 在 `hfl-test/stabilize-admin-gateway-projection-release-decision-operator-handoff` 上整理单个 change commit；只有路线规则确认 merge-ready 时才推送到 `hfl-test-base`，禁止推送 `test`。
