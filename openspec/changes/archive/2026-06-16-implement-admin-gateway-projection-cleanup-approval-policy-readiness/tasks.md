# Tasks

## 1. OpenSpec

- [x] 1.1 创建 proposal、design、tasks、spec delta、verification。
- [x] 1.2 完成实施前 review，确认 scope 只包含 Admin owner cleanup approval policy/readiness。

## 2. Backend

- [x] 2.1 新增 cleanup approval policy readiness query/result/manualReview/cannotInfer/gate/export DTO。
- [x] 2.2 基于现有 cleanup execute readiness 和 approval audit trail 派生 policy status、safe next action、cannotInfer 和 audit summary。
- [x] 2.3 新增只读 API：`GET /api/gateway-projection/publish-attempt-retention-cleanup-approval-policy-readiness`。
- [x] 2.4 增加 authz/router/controller 接入，保持 Admin-only。
- [x] 2.5 覆盖 manual review ready/required、cannotInfer、rejected/blocked、redaction/storage scope、organization required 和 no mutation 测试。

## 3. Frontend

- [x] 3.1 增加 cleanup approval policy readiness backend API 封装。
- [x] 3.2 在 `PlatformApiMappingPage` cleanup readiness 区域新增 approval policy readiness 面板。
- [x] 3.3 支持刷新、复制/导出脱敏 policy JSON，不提供真实 cleanup/delete/update 动作。
- [x] 3.4 覆盖 loading、empty、error、disabled、长 reason alias、脱敏字段和调用参数测试。

## 4. Verification

- [x] 4.1 运行 `openspec validate implement-admin-gateway-projection-cleanup-approval-policy-readiness --strict`。
- [x] 4.2 运行 `openspec validate --changes --strict` 和 `openspec validate --specs --strict`。
- [x] 4.3 运行后端聚焦测试和 changed-function coverage，目标 >=85%。
- [x] 4.4 运行前端相关 Jest 和 build。
- [x] 4.5 运行 `git diff --check`。
- [x] 4.6 更新 `verification.md`，记录命令、结果、覆盖率和剩余风险。

## 5. Archive / Delivery

- [x] 5.1 完成 `openspec-pre-archive-review`，修复 Blocking/Fixable。
- [x] 5.2 archive change 并同步主规格。
- [ ] 5.3 整理为单个本 change commit，显式 push 工作分支。
- [ ] 5.4 基于最新 `origin/hfl-test-base` 复验后 ff-only 合入并显式 push `hfl-test-base`，不触碰 `test`。
- [ ] 5.5 删除工作分支并写入最终交接报告。
