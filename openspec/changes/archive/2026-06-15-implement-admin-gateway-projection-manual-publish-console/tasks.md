# Tasks

## OpenSpec / Review

- [x] 1.1 确认工作区、分支、HEAD、`hfl-test-base` upstream 和工作区干净。
- [x] 1.2 从最新 `origin/hfl-test-base` 创建 `hfl-test/implement-admin-gateway-projection-manual-publish-console`。
- [x] 1.3 创建 proposal/design/tasks/spec delta/verification。
- [x] 1.4 运行 `openspec-pre-implementation-review` loop 到无 Blocking/Fixable。

## Backend

- [x] 2.1 新增 manual publish result envelope 和 readiness summary DTO。
- [x] 2.2 实现 Admin-only manual publish service，复用 `GatewayProjectionService.BuildAndPublishOrganization`，输出脱敏结果和稳定 failureCategory。
- [x] 2.3 新增 controller/route/authz entry，禁止输出 token、Cookie、私有 URL 或完整 gateway response。
- [x] 2.4 补 object/controller 聚焦测试和 changed-function coverage。

## Frontend / Runbook

- [x] 3.1 在 `PlatformApiMappingPage` 增加 gateway projection manual publish 操作区。
- [x] 3.2 补前端 backend/page/permission 测试，覆盖按钮状态、结果展示和错误分类。
- [x] 3.3 更新 Bruno/runbook，说明 manual publish 的环境变量、脱敏输出和真实环境授权边界。

## Verification / Archive

- [x] 4.1 `openspec validate implement-admin-gateway-projection-manual-publish-console --strict`。
- [x] 4.2 `openspec validate --specs --strict`。
- [x] 4.3 `openspec validate --changes --strict`。
- [x] 4.4 `git diff --check`。
- [x] 4.5 后端聚焦测试与覆盖率记录。
- [x] 4.6 前端相关测试和 build/lint。
- [x] 4.7 运行 `openspec-pre-archive-review` loop 到无 Blocking。
- [x] 4.8 archive change、同步主规格、整理为相对最新 `origin/hfl-test-base` 单 commit。
- [x] 4.9 显式 refspec push 工作分支；满足门禁后 ff-only 合入并 push `hfl-test-base`，不触碰 `test`。
