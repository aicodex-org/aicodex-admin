# Tasks

## 1. OpenSpec

- [x] 1.1 创建 proposal、design、tasks、spec delta、verification。
- [x] 1.2 完成实施前 review，确认 scope 只包含 Admin owner cleanup dry-run/guardrails。

## 2. Backend

- [x] 2.1 新增 cleanup dry-run query/plan/guardrail DTO 和 service 方法。
- [x] 2.2 支持 organization/status/failureCategory/olderThan/limit 安全过滤，organization 缺失 fail closed。
- [x] 2.3 计算 candidate/blocked counts、reason aliases、oldest/newest、diagnostic completeness、receipt hint coverage 和样例。
- [x] 2.4 新增只读 dry-run controller/router/authz：`GET /api/gateway-projection/publish-attempt-retention-cleanup-dry-run`。
- [x] 2.5 如新增 execute/cleanup endpoint，必须始终 fail closed / dryRunOnly，不执行 DB delete/update。
- [x] 2.6 补 Go 聚焦测试和 changed-function coverage。

## 3. Frontend

- [x] 3.1 增加 cleanup dry-run backend API 封装。
- [x] 3.2 在 `PlatformApiMappingPage` 展示 cleanup dry-run 面板、过滤条件、candidate/blocked、reason aliases 和 safety checklist。
- [x] 3.3 展示 execute guardrail disabled 状态，不提供真实删除动作。
- [x] 3.4 覆盖 loading、空态、blocked、长文本、脱敏字段和调用参数测试。

## 4. Verification

- [x] 4.1 运行 `openspec validate implement-admin-gateway-projection-retention-cleanup-dry-run-guardrails --strict`。
- [x] 4.2 运行 `openspec validate --changes --strict` 和 `openspec validate --specs --strict`。
- [x] 4.3 运行后端聚焦测试和覆盖率检查。
- [x] 4.4 运行前端相关测试和 build。
- [x] 4.5 运行 `git diff --check`。
- [x] 4.6 更新 `verification.md`，记录命令、结果、覆盖率和剩余风险。

## 5. Archive / Delivery

- [x] 5.1 完成 `openspec-pre-archive-review`，修复 Blocking/Fixable。
- [x] 5.2 archive change 并同步主规格。
- [ ] 5.3 整理为单个本 change commit，显式 push 工作分支。
- [ ] 5.4 基于最新 `origin/hfl-test-base` 复验后 ff-only 合入并显式 push `hfl-test-base`，不触碰 `test`。
- [ ] 5.5 删除工作分支并写入最终交接报告。
