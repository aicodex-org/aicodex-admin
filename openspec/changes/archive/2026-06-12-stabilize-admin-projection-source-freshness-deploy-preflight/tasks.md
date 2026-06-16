## 1. OpenSpec 与实施前门禁

- [x] 1.1 运行并修复 `openspec validate stabilize-admin-projection-source-freshness-deploy-preflight --strict`
- [x] 1.2 完成实施前 review，确认范围只覆盖 Admin 只读 preflight、Bruno/runbook 和测试

## 2. TDD 与 Preflight 实现

- [x] 2.1 先补 Node 聚焦失败用例，覆盖旧 shape 缺 `sourceConnectionSummary` 时返回 `environment_deploy_stale`
- [x] 2.2 补充缺 latest audit、完整 source freshness shape、subject fixture 不足和敏感字段泄漏的 preflight 用例
- [x] 2.3 实现可复用的 gateway projection observability preflight 脚本，输出 `status`、`alias`、`reason` 和脱敏 summary
- [x] 2.4 更新 Bruno 运行态观测 smoke 复用 preflight 规则，旧 shape 不得被解释为 full success

## 3. Runbook 与验证

- [x] 3.1 更新 Bruno README，说明 deploy preflight、`environment_deploy_stale` 最小解除条件和不能外推的边界
- [x] 3.2 运行聚焦 Node preflight 测试和不含私有凭据的 dry-run/static preflight
- [x] 3.3 运行 `openspec validate --changes --strict`、`openspec validate --specs --strict` 和 `git diff --check`
- [x] 3.4 更新 `verification.md`，记录命令、覆盖率/N/A 判定、剩余风险和脱敏验证摘要
