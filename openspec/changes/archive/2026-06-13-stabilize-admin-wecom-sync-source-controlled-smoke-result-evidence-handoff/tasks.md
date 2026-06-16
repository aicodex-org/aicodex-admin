# Tasks

## 1. Implementation

- [x] 1.1 新增 `wecomSourceControlledSmokeResultEvidenceHandoff` helper，输出稳定 status、release、reasonAlias、result aliases/counts、missing prerequisites、owner handoff limits、operator actions、red-line flags 和不能外推边界。
- [x] 1.2 新增 focused Node 测试，覆盖 passed、partial-handoff、blocked、needs-user-action、缺少 evidence、未部署、未授权、脱敏失败、真实环境红线和 full-success overclaim。
- [x] 1.3 新增 Bruno 只读 `Controlled Smoke Result Evidence Handoff.yml` 入口，只做本地变量和脚本校验，不连接真实环境、不触发 controlled smoke。
- [x] 1.4 更新 operator README，说明输入 summary、输出状态、失败修复 owner 和不能外推边界。

## 2. Specification

- [x] 2.1 新增 delta spec，声明 WeCom source controlled-smoke result evidence handoff 的输入、状态、fail-closed 和只读边界。
- [x] 2.2 手工同步主规格包含 controlled-smoke result evidence handoff requirement。

## 3. Verification

- [x] 3.1 运行 focused `node --test` 并记录 RED/GREEN。
- [x] 3.2 运行相关 WeCom source helper tests。
- [x] 3.3 运行新增 helper 覆盖率命令，并确认 line/branch/function 覆盖率不低于 85%。
- [x] 3.4 运行 `openspec validate stabilize-admin-wecom-sync-source-controlled-smoke-result-evidence-handoff --strict`。
- [x] 3.5 运行项目现有 OpenSpec 主规格校验命令。
- [x] 3.6 运行 `git diff --check`。
