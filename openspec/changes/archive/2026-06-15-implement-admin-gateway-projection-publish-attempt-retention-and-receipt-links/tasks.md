# Tasks

## 1. OpenSpec

- [x] 1.1 创建 proposal、design、tasks、spec delta、verification。
- [x] 1.2 完成 `openspec-pre-implementation-review`，修复 Blocking/Fixable 后再实施。

## 2. Backend

- [x] 2.1 为 publish attempt list/detail 派生 retention metadata 和 receipt query hint。
- [x] 2.2 新增 retention readiness summary service，按 organization/source/status/time/limit 聚合 cleanupEligible、blocked 和 reason aliases。
- [x] 2.3 新增 admin-only controller/router/authz：`GET /api/gateway-projection/publish-attempt-retention-readiness`。
- [x] 2.4 保证 organization 必填、只读 fail closed、无 raw payload/token/private URL/subject 明细。
- [x] 2.5 补 Go 聚焦测试和 changed-function coverage。

## 3. Frontend

- [x] 3.1 增加 retention readiness backend API 封装。
- [x] 3.2 在 `PlatformApiMappingPage` 展示 retention readiness、attempt cleanup 状态和 expiresAt。
- [x] 3.3 在 attempt detail Drawer 展示 receipt query hint，并提供只读 Gateway receipt 查询入口。
- [x] 3.4 覆盖空态、blocked、长文本、脱敏字段和 receipt link 行为测试。

## 4. Verification

- [x] 4.1 运行 `openspec validate implement-admin-gateway-projection-publish-attempt-retention-and-receipt-links --strict`。
- [x] 4.2 运行 `openspec validate --changes --strict` 和 `openspec validate --specs --strict`。
- [x] 4.3 运行后端聚焦测试和覆盖率检查。
- [x] 4.4 运行前端相关测试和 build。
- [x] 4.5 运行 `git diff --check`。
- [x] 4.6 更新 `verification.md`，记录命令、结果、覆盖率和剩余风险。

## 5. Archive / Delivery

- [x] 5.1 完成 `openspec-pre-archive-review`，修复 Blocking/Fixable。
- [ ] 5.2 archive change 并同步主规格。
- [ ] 5.3 整理为单个本 change commit，显式 push 工作分支。
- [ ] 5.4 基于最新 `origin/hfl-test-base` 复验后 ff-only 合入并显式 push `hfl-test-base`，不触碰 `test`。
- [ ] 5.5 删除工作分支并写入最终交接报告。
