# Tasks

## 1. Implementation

- [x] 1.1 新增 `wecomSourceControlledSmokeExecutionHandoff` helper，输出稳定 status、decision、reasonAlias、reference summaries、blocker reasons、redaction checks、hard red-line flags、owner handoff、最小解除条件和不能外推边界。
- [x] 1.2 新增 focused Node 测试，覆盖 ready、缺少 preflight/evidence/remediation、remediation blocker、脱敏失败、真实执行红线和 full-success overclaim。
- [x] 1.3 新增 Bruno 只读 `Controlled Smoke Execution Handoff.yml` 入口，只做本地变量和脚本校验，不连接真实环境、不触发 controlled smoke。
- [x] 1.4 更新 operator README，说明输入 summary、输出状态、失败修复指引和不能外推边界。

## 2. Specification

- [x] 2.1 新增 delta spec，声明 WeCom source controlled-smoke execution handoff 的输入、状态、fail-closed 和只读边界。
- [x] 2.2 手工同步主规格包含 controlled-smoke execution handoff requirement。

## 3. Verification

- [x] 3.1 运行 focused `node --test`。
- [x] 3.2 运行相关 WeCom source helper tests。
- [x] 3.3 运行新增 helper 覆盖率命令，并确认 line/branch/function 覆盖率不低于 85%。
- [x] 3.4 运行 `openspec validate stabilize-admin-wecom-sync-source-controlled-smoke-execution-handoff --strict`。
- [x] 3.5 运行项目现有 OpenSpec 校验命令。
- [x] 3.6 运行 `git diff --check`。
