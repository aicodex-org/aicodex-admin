# Tasks

- [x] 1.1 确认工作区、`hfl-test-base` upstream、HEAD、工作区干净和归档输入。
- [x] 1.2 从最新 `origin/hfl-test-base` 创建 `hfl-test/implement-admin-platform-api-mapping-operator-readiness`。
- [x] 1.3 创建 OpenSpec proposal/design/tasks/spec delta/verification。
- [x] 1.4 运行 `openspec-pre-implementation-review` loop 到无 Blocking/Fixable。

## Backend

- [x] 2.1 为 Platform API mapping readiness 分类服务补 Go 测试，覆盖 active publishable、tombstone publishable、mapping missing、mapping untrusted 和 legacy/display 字段不参与 join。
- [x] 2.2 实现只读 readiness 聚合服务，输出 counts、blocked reason 分布和候选 subject 摘要。
- [x] 2.3 增加 admin-only 只读 controller/route/authz entry，不写 mapping、不写 gateway authorization facts。
- [x] 2.4 补后端聚焦测试和受影响 package coverage。

## Frontend / Runbook

- [x] 3.1 在 `PlatformApiMappingPage` 增加只读 readiness 摘要和筛选入口。
- [x] 3.2 补前端 API 调用、页面状态或渲染测试；如项目无合适测试，运行 lint/build 并记录原因。
- [x] 3.3 更新 Bruno/runbook，说明 `mapping_missing` 诊断、subject count 断言和 60 fixture 写入授权边界。

## Verification / Archive

- [x] 4.1 运行 `openspec validate implement-admin-platform-api-mapping-operator-readiness --strict`。
- [x] 4.2 运行 `openspec validate --changes --strict`。
- [x] 4.3 运行 `git diff --check`。
- [x] 4.4 运行后端聚焦测试和 coverage，记录是否达到 85%。
- [x] 4.5 运行前端测试/lint/build，记录结果。
- [x] 4.6 更新 `verification.md`，记录命令、结果、coverage、未执行 60 写入原因和剩余风险。
- [x] 4.7 运行 `openspec-pre-archive-review` loop 到无 Blocking。
- [x] 4.8 archive change，验证主规格，整理为单个本 change commit，并按门禁推送。
