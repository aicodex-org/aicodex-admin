# Tasks

## 1. 启动和上下文

- [x] 1.1 执行 `git fetch origin --prune`。
- [x] 1.2 确认工作区、分支、HEAD、`git status --short --branch`、`branch.hfl-test-base.merge` 和相对 `origin/hfl-test-base` 差异。
- [x] 1.3 读取仓库/openspec agent 指引和相关 projection observability 代码、Bruno、README、主规格、历史 archive。
- [x] 1.4 从最新 `origin/hfl-test-base` 创建 `hfl-test/implement-admin-gateway-projection-observability-source-freshness-diagnostics`。

## 2. OpenSpec 和实施前 review

- [x] 2.1 创建 proposal/design/tasks/spec delta/verification。
- [x] 2.2 运行 `openspec-pre-implementation-review` loop，修复到无 Blocking/Fixable。
- [x] 2.3 运行 `openspec validate implement-admin-gateway-projection-observability-source-freshness-diagnostics --strict`。
- [x] 2.4 运行 `openspec validate --changes --strict`。
- [x] 2.5 运行 `git diff --check`。

## 3. 后端 TDD 实现

- [x] 3.1 先补 `admin/object` RED 测试，覆盖 source status/freshness 分布和脱敏字段形态。
- [x] 3.2 实现 latest publish observability 的结构化 source diagnostics，并保留 `sourceConnectionStatus`。
- [x] 3.3 实现 stale/unavailable/unknown freshness 的稳定 failure category 分类。
- [x] 3.4 覆盖空 source connection、fresh、stale、unavailable/unknown、disabled source connection。

## 4. Smoke 和 runbook

- [x] 4.1 更新 Bruno `50-Gateway Projection 观测/运行态观测.yml`，增加 source diagnostics shape/assertion。
- [x] 4.2 更新 Bruno README/runbook，说明字段含义、脱敏要求和 owner 边界。
- [x] 4.3 确认 smoke 默认只读，不要求 latest audit 必然存在，不执行 60 写入。

## 5. 验证和归档

- [x] 5.1 运行 Go 聚焦测试和受影响实现覆盖率检查，记录结果。
- [x] 5.2 更新 `verification.md`，记录 OpenSpec、Go、coverage、Bruno/60、diff check 结果。
- [x] 5.3 运行 `openspec-pre-archive-review` loop 到无 Blocking。
- [x] 5.4 archive change，并运行 `openspec validate --specs --strict` 与 `openspec validate --changes --strict`。
- [x] 5.5 整理为单个本 change commit，显式 push 工作分支。
- [x] 5.6 满足门禁后 ff-only 合入并显式 push `hfl-test-base`，明确不合入 `test`。
