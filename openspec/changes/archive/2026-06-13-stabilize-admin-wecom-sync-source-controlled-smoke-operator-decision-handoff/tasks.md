# Tasks

## 1. Implementation

- [x] 1.1 新增 `wecomSourceControlledSmokeOperatorDecisionHandoff` helper，输出 decision status、next options、stable blocker alias、最小解除条件、fail-closed 红线、redaction metadata 和不能外推边界。
- [x] 1.2 新增 focused Node 测试，覆盖 ready、missing prerequisite、non-ready upstream、needs-user-action、hard-red-line、脱敏失败、未知 alias 和不回显敏感值。
- [x] 1.3 新增 Bruno local-only `Controlled Smoke Operator Decision Handoff.yml` 入口，pre-request 输出 decision package 后主动中止网络请求。
- [x] 1.4 更新 WeCom Bruno README 和集合 README，说明 decision handoff 的输入、输出、变量、只读边界和 dry-run。

## 2. Specification

- [x] 2.1 新增 delta spec，声明 WeCom source controlled-smoke operator decision handoff 的输入、状态、fail-closed 和只读边界。
- [x] 2.2 手工同步主规格包含 operator decision handoff requirement。

## 3. Verification

- [x] 3.1 运行 focused `node --test` 并记录 RED/GREEN。
- [x] 3.2 运行 Admin WeCom source controlled-smoke 相关 helper tests。
- [x] 3.3 运行新增 helper 覆盖率命令，并确认 line/branch/function 覆盖率不低于 85%。
- [x] 3.4 运行 `openspec validate stabilize-admin-wecom-sync-source-controlled-smoke-operator-decision-handoff --strict`。
- [x] 3.5 运行 `openspec validate --specs --strict` 和 `openspec validate --changes --strict`。
- [x] 3.6 运行 `git diff --check`。
