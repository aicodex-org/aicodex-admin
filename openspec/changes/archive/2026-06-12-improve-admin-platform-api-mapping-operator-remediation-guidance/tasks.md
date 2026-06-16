# Tasks

- [x] 1.1 确认工作区、`hfl-test-base` upstream、HEAD、工作区状态和同名 branch/change 冲突。
- [x] 1.2 从最新 `origin/hfl-test-base` 创建 `hfl-test/improve-admin-platform-api-mapping-operator-remediation-guidance`。
- [x] 1.3 创建 OpenSpec proposal/design/tasks/spec delta/verification。
- [x] 1.4 运行实施前 review loop 到无 Blocking/Fixable。

## Backend

- [x] 2.1 先补 Go 聚焦测试，覆盖 readiness remediation guidance contract。
- [x] 2.2 实现只读 `remediationGuidance` 响应，不写 mapping、不读 API/Insight/gateway。
- [x] 2.3 运行后端聚焦测试和受影响 package coverage。

## Frontend / Runbook

- [x] 3.1 先补前端页面测试，覆盖 remediation guidance 展示。
- [x] 3.2 在 Platform API mapping 用户映射页展示 guidance，并保持现有筛选/只读语义。
- [x] 3.3 更新 Bruno README，补 category 到 remediation 的 operator runbook。
- [x] 3.4 运行前端聚焦测试或可用替代验证。

## Verification / Archive

- [x] 4.1 运行 `openspec validate improve-admin-platform-api-mapping-operator-remediation-guidance --strict`。
- [x] 4.2 运行 `openspec validate --specs --strict`。
- [x] 4.3 运行 `openspec validate --changes --strict`。
- [x] 4.4 运行 `git diff --check`。
- [x] 4.5 更新 `verification.md`，记录命令、结果、coverage、未执行真实 fixture/DB 的原因和剩余风险。
- [x] 4.6 运行 pre-archive review loop 到无 Blocking。
- [x] 4.7 archive change，验证主规格，整理为单个本 change commit。
- [x] 4.8 用显式 refspec 推送当前 HEAD 到 `origin/hfl-test-base`，切回并清理本地/远端工作分支。
