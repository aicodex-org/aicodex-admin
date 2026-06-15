# Tasks

## OpenSpec / Review

- [x] 1.1 确认工作区、分支、HEAD、`origin/hfl-test-base` 和 clean 状态。
- [x] 1.2 从最新 `origin/hfl-test-base` 创建 `hfl-test/implement-admin-gateway-projection-run-diff-and-retry-readiness`。
- [x] 1.3 读取仓库与 OpenSpec 规则、相关主规格、manual publish / observability 上下文。
- [x] 1.4 创建 proposal/design/tasks/spec delta/verification。
- [x] 1.5 运行实施前 review loop 到无 Blocking/Fixable。

## Backend

- [x] 2.1 新增 run diff/readiness DTO、retry action 分类和只读 service helper。
- [x] 2.2 实现 Admin-only run readiness API，复用 snapshot dry-run 与 latest publish observability，不触发 publish。
- [x] 2.3 覆盖核心分支：safe retry、source stale 等待、mapping/subject invalid、last failure classified、脱敏响应。
- [x] 2.4 补 controller/route 和后端聚焦测试、覆盖率记录。

## Frontend

- [x] 3.1 在 `PlatformApiMappingBackend` 增加 run readiness 查询。
- [x] 3.2 在 `PlatformApiMappingPage` 展示 run diff/retry readiness 摘要和 operator action。
- [x] 3.3 补前端 backend/page 测试，覆盖查询参数、action 展示、脱敏字段不出现。

## Verification / Archive

- [x] 4.1 `openspec validate implement-admin-gateway-projection-run-diff-and-retry-readiness --strict`。
- [x] 4.2 `git diff --check`。
- [x] 4.3 后端聚焦测试与覆盖率记录。
- [x] 4.4 前端相关测试。
- [x] 4.5 更新 `verification.md`，记录命令、覆盖率、脱敏和剩余风险。
- [x] 4.6 运行 `openspec-pre-archive-review` loop 到无 Blocking。
- [x] 4.7 archive change、验证主规格、整理单 commit。
- [x] 4.8 ff-only 合入并 push `hfl-test-base`，删除工作分支，不触碰 `test`。
