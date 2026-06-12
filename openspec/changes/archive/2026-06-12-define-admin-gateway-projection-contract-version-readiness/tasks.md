# Tasks

- [x] 1.1 从最新 `origin/hfl-test-base` 创建 `hfl-test/define-admin-gateway-projection-contract-version-readiness`。
- [x] 1.2 确认工作区、分支、HEAD 和 `git status --short --branch`。
- [x] 1.3 读取仓库指引、OpenSpec 主规格、projection 实现和 fixture。
- [x] 2.1 编写 proposal/design，限定为 Admin owner 的 contract readiness review。
- [x] 2.2 明确当前不新增 payload `contractVersion` 的 owner 结论。
- [x] 2.3 明确 `lineage.sourceVersion`、gateway `orgVersion`、subject `projectionVersion` 不得混用为 contract version。
- [x] 2.4 写清 API handoff：如 API 需要显式字段，先由 API ingestion contract 定义字段、兼容策略和错误码。
- [x] 3.1 编写 OpenSpec delta spec。
- [x] 4.1 运行 `openspec-pre-implementation-review` loop 到无 Blocking/Fixable。
- [x] 4.2 运行 `openspec validate define-admin-gateway-projection-contract-version-readiness --strict`。
- [x] 4.3 运行 `openspec validate --changes --strict`。
- [x] 4.4 运行 `git diff --check`。
- [x] 4.5 更新 `verification.md`，记录验证结果、覆盖率 N/A 和剩余风险。
