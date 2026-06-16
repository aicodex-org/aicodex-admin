## 1. 提案和边界

- [x] 1.1 确认当前工作区在 `hfl-test/stabilize-admin-gateway-projection-observability`。
- [x] 1.2 阅读 projection publisher、refresh worker、组织主模型和组织树运营相关规格/实现。
- [x] 1.3 完成 proposal/design/spec/tasks review，确认不修改 API/Insight，不实现成员诊断。

## 2. Projection observability 实现

- [x] 2.1 补齐 publisher audit 摘要字段：batch、version、lineage、freshness、subject counts、skip summary、status/error category、duration、idempotency。
- [x] 2.2 补齐 refresh worker 最近运行状态：enabled/disabled、interval、TTL、lastRunAt、nextRunAt、lastSuccessAt、lastFailureAt、lastFailureCategory。
- [x] 2.3 增加 admin-only projection observability 只读接口或等价诊断输出，不暴露 token、endpoint、Cookie、私有 URL 或原始响应。
- [x] 2.4 增加稳定 failure category 映射。

## 3. Smoke 和验证资产

- [x] 3.1 新增或更新 Bruno smoke，覆盖 projection observability 只读诊断。
- [x] 3.2 更新 README/runbook，说明变量、脱敏要求和 60 smoke 口径。
- [x] 3.3 更新 `verification.md`，记录命令、结果、覆盖率或 N/A、剩余风险。

## 4. 测试和 OpenSpec 验证

- [x] 4.1 补 Go 测试覆盖 publisher audit、failure category、refresh worker 状态和诊断响应。
- [x] 4.2 运行 `openspec validate stabilize-admin-gateway-projection-observability --strict`。
- [x] 4.3 运行 `openspec validate --changes --strict`、`openspec validate --specs --strict`。
- [x] 4.4 运行受影响 Go 测试和覆盖率检查，目标 85%；达不到则记录原因和补救路径。
- [x] 4.5 运行 `git diff --check`。

## 5. 路线清单和归档

- [x] 5.1 同步组织边界路线清单中本 change 状态，文档仓库单独提交。
- [x] 5.2 完成归档前 review 并修复明确问题。
- [x] 5.3 archive change，验证主规格。
- [x] 5.4 squash/force-push 当前 work 分支，交付 merged-ready。
