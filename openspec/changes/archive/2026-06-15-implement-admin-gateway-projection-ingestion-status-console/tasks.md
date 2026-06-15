# Tasks

## OpenSpec / Review

- [x] 1.1 读取委托 prompt、仓库规则和 OpenSpec 规则。
- [x] 1.2 执行启动门禁，确认 `origin/hfl-test-base`、当前分支、HEAD、status 和 upstream merge 配置。
- [x] 1.3 从最新 `origin/hfl-test-base` 创建 `hfl-test/implement-admin-gateway-projection-ingestion-status-console`。
- [x] 1.4 创建 proposal/design/tasks/spec delta/verification。
- [x] 1.5 完成实施前 review loop 到无 Blocking/Fixable。

## Backend

- [x] 2.1 新增 ingestion status query/result DTO、status mapping 和脱敏 envelope。
- [x] 2.2 实现只读 Gateway ingestion-status client/service，支持 latest/projectionBatchId/orgVersion/sourceVersion 查询。
- [x] 2.3 新增 Admin controller/route，返回 operator envelope，不泄漏 endpoint/token/raw response。
- [x] 2.4 补后端聚焦测试，覆盖 applied/success、not_found、provider_unavailable、contract/status mapping、redaction/fail-closed。

## Frontend

- [x] 3.1 在 `PlatformApiMappingBackend` 增加 ingestion status 查询。
- [x] 3.2 在 `PlatformApiMappingPage` 增加 Gateway ingestion status operator 区块。
- [x] 3.3 补前端 backend/page 测试，覆盖查询参数、状态展示和敏感值不出现。

## Verification / Archive

- [x] 4.1 `openspec validate implement-admin-gateway-projection-ingestion-status-console --strict`。
- [x] 4.2 `openspec validate --changes --strict` 和 `openspec validate --specs --strict`。
- [x] 4.3 `git diff --check`。
- [x] 4.4 后端聚焦测试、controller/router 编译和覆盖率记录。
- [x] 4.5 前端相关测试。
- [x] 4.6 更新 `verification.md`，记录命令、覆盖率、脱敏和剩余风险。
- [x] 4.7 运行 `openspec-pre-archive-review` loop 到无 Blocking。
- [x] 4.8 archive change、验证主规格、整理单 commit。
- [x] 4.9 显式 push 工作分支和 ff-only push `hfl-test-base`，不触碰 `test`。
