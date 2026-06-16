# Tasks

- [x] 1.1 完成 implementation-first pre-implementation review，确认 change 范围只覆盖 Admin Bruno 证据快照和 OpenSpec 文档。
- [x] 2.1 先写 evidence snapshot 单测，覆盖 ready 快照、阻断 alias、最小解除条件、完整响应体和完整节点列表 fail closed。
- [x] 2.2 实现 evidence snapshot 脚本，复用 `organizationTreeOperationsSmokeSummary`，避免复制 readiness 规则。
- [x] 2.3 更新 README，说明私有变量/本地 dry-run、稳定 alias、不能外推边界和最小解除条件。
- [x] 2.4 同步主规格 `admin-organization-tree-operations`，记录 evidence snapshot guardrail 要求。
- [x] 3.1 运行相关 Node 单测、`node --check`、coverage、OpenSpec strict validate 和 `git diff --check`。
- [x] 3.2 写入 `verification.md`，记录命令、结果、覆盖率、剩余风险和硬红线遵守情况。
- [x] 4.1 完成 pre-archive review，修复阻塞问题后 archive change。
- [x] 4.2 整理为单个 change commit，合入并推送 `hfl-test-base`，完成分支清理和最终回传。
