# Tasks

## 1. OpenSpec

- [x] 1.1 创建 proposal、design、tasks、spec delta、verification。
- [x] 1.2 完成实施前 review，确认 scope 只包含 Admin owner cleanup execute readiness。

## 2. Backend

- [x] 2.1 新增 cleanup execute readiness query/result/freshness/approval/export DTO。
- [x] 2.2 基于现有 cleanup dry-run 派生 readiness、safe next action、disabled reasons、dryRunId/hash 和 retention policy version。
- [x] 2.3 覆盖 stale dry-run、missing diagnostic summary、receipt hint missing、blocked attempts、empty candidates、approval required 等门禁规则。
- [x] 2.4 新增只读 API：`GET /api/gateway-projection/publish-attempt-retention-cleanup-execute-readiness`。
- [x] 2.5 确认不执行 DB delete/update、不触发 publish、不写 Gateway facts。
- [x] 2.6 补 Go 聚焦测试和 changed-function coverage。

## 3. Frontend

- [x] 3.1 增加 cleanup execute readiness backend API 封装。
- [x] 3.2 在 `PlatformApiMappingPage` 展示执行前就绪/审批门禁面板或抽屉。
- [x] 3.3 支持复制/导出脱敏 readiness JSON，不提供真实删除动作。
- [x] 3.4 覆盖 loading、empty、error、disabled、长 reason aliases、脱敏字段和调用参数测试。

## 4. Verification

- [x] 4.1 运行 `openspec validate implement-admin-gateway-projection-cleanup-execute-readiness --strict`。
- [x] 4.2 运行 `openspec validate --changes --strict` 和 `openspec validate --specs --strict`。
- [x] 4.3 运行后端聚焦测试和覆盖率检查。
- [x] 4.4 运行前端相关测试和 build。
- [x] 4.5 运行 `git diff --check`。
- [x] 4.6 更新 `verification.md`，记录命令、结果、覆盖率和剩余风险。

## 5. Archive / Delivery

- [x] 5.1 完成 `openspec-pre-archive-review`，修复 Blocking/Fixable。
- [x] 5.2 archive change 并同步主规格。
- [x] 5.3 整理为单个本 change commit，显式 push 工作分支。
- [x] 5.4 基于最新 `origin/hfl-test-base` 复验后 ff-only 合入并显式 push `hfl-test-base`，不触碰 `test`。
- [x] 5.5 删除工作分支并写入最终交接报告。
