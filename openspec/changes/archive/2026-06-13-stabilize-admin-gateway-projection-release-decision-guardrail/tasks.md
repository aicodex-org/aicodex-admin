# Tasks

## 1. Implementation

- [x] 1.1 新增 release decision wrapper，输出稳定 decision、alias、handoff、最小解除条件和不能外推边界。
- [x] 1.2 增加 Node 测试，覆盖敏感字段 fail-closed、空证据、not checked、source freshness blocker、mapping readiness blocker、contract/config blocker、controlled-smoke ready，以及本地 evidence 不能外推为真实 publish/full-success。
- [x] 1.3 新增 Bruno 只读 release decision 入口并更新 operator README。

## 2. Specification

- [x] 2.1 更新 delta spec，声明 release decision guardrail 的状态、输入边界和不能外推语义。
- [x] 2.2 验证并归档 change，更新主规格。

## 3. Verification

- [x] 3.1 运行相关 Node 测试、语法检查和覆盖率检查。
- [x] 3.2 运行 `openspec validate stabilize-admin-gateway-projection-release-decision-guardrail --strict`。
- [x] 3.3 归档后运行 `openspec validate --specs --strict`、`openspec validate --changes --strict` 和 `git diff --check`。
