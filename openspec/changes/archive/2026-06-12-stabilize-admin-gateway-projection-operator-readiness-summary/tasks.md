## 1. OpenSpec 与实施前门禁

- [x] 1.1 完成本 change OpenSpec artifacts 并运行 `openspec validate stabilize-admin-gateway-projection-operator-readiness-summary --strict`
- [x] 1.2 完成实施前 review，确认范围只覆盖 Admin 只读 summary、Bruno/runbook、测试和主规格同步

## 2. TDD 与 Readiness Summary 实现

- [x] 2.1 先补 Node 聚焦失败用例，覆盖旧部署 shape 汇总为 `environment_deploy_stale`
- [x] 2.2 补充 mapping_missing、source freshness gap、subject fixture 不足、mapping 未检查和敏感字段泄漏的 summary 用例
- [x] 2.3 实现可复用的 gateway projection readiness summary 脚本，输出 `status`、alias、reason、counts、owner handoff 和最小解除条件
- [x] 2.4 新增 Bruno 只读 summary 入口，复用脚本且不触发 publish/refresh/fixture 写入

## 3. Runbook、主规格与验证

- [x] 3.1 更新 Bruno README，说明 summary 入口、稳定 alias、owner handoff、不能外推的边界和 dry-run 方法
- [x] 3.2 同步 `openspec/specs/admin-gateway-organization-projection-publisher/spec.md`
- [x] 3.3 运行聚焦 Node summary/preflight 测试、语法检查和覆盖率检查
- [x] 3.4 运行 `openspec validate <change> --strict`、archive 后 `openspec validate --specs --strict`、`openspec validate --changes --strict` 和 `git diff --check`
- [x] 3.5 更新 `verification.md`，记录命令、覆盖率、剩余风险和脱敏验证摘要
