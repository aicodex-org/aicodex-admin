# Tasks

- [x] 1.1 确认工作区、分支、HEAD、`git status --short --branch` 和 `branch.hfl-test-base.merge`。
- [x] 1.2 读取仓库指引、projection 主规格、archived change、mapping API/UI 和 observability 资产。
- [x] 1.3 只读确认已有 `PlatformApiUserMapping` API/UI、唯一性校验、脱敏审计和 projection `mapping_missing` 诊断。
- [x] 2.1 编写 proposal/design，限定为 Admin owner 的 operator readiness gap。
- [x] 2.2 编写 delta spec，定义 publishable readiness、筛选诊断、runbook 和边界要求。
- [x] 3.1 运行 `openspec-pre-implementation-review` loop 到无 Blocking/Fixable。
- [x] 3.2 运行 `openspec validate review-admin-platform-api-mapping-operator-readiness --strict`。
- [x] 3.3 运行 `openspec validate --changes --strict`。
- [x] 3.4 运行本 change 范围 `git diff --check`；全局检查受无关工作区 dirty 阻塞，已在 `verification.md` 记录。
- [x] 3.5 更新 `verification.md`，记录只读证据、验证结果、coverage N/A 和剩余风险。

## 后续 implementation 候选任务

- 增加 mapping status、keyword、publishable readiness 和 skip reason 的只读筛选或诊断接口。
- 在 `PlatformApiMappingPage` 增加 operator 摘要、状态筛选、冲突/重复提示和 publishable 前置条件说明。
- 补充 active/tombstone fixture checklist 和 Bruno 可选 subject count 断言说明。
- 补后端/前端测试和脱敏 verification；未获授权时不执行 60 写入。
