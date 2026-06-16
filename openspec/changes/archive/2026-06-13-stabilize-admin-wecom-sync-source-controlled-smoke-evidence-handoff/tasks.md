# Tasks

## 1. Implementation

- [x] 1.1 新增 `wecomSourceControlledSmokeEvidenceHandoff` helper，输出稳定 status、reasonAlias、operator next actions、missing prerequisites、redaction checks、hard red-line flags 和不能外推边界。
- [x] 1.2 新增 focused Node 测试，覆盖 ready、缺少 readiness/release/preflight、脱敏失败、红线信号、真实同步/DB 禁止和 full-success overclaim。
- [x] 1.3 新增 Bruno 只读 `Controlled Smoke Evidence Handoff.yml` 入口，只做本地变量和脚本校验，不连接真实环境、不触发 controlled smoke。
- [x] 1.4 新增或更新 operator README，说明输入 summary、输出状态、脱敏要求、失败修复指引和不能外推边界。

## 2. Specification

- [x] 2.1 更新 delta spec，声明 WeCom source controlled-smoke evidence handoff 的输入、状态、fail-closed 和只读边界。
- [x] 2.2 归档前已手工同步主规格包含 controlled-smoke evidence handoff requirement；归档后再次验证。

## 3. Verification

- [x] 3.1 运行 focused `node --test`。
- [x] 3.2 运行新增 helper 覆盖率命令，并确认 line/branch/function 覆盖率不低于 85%。
- [x] 3.3 运行 `openspec validate stabilize-admin-wecom-sync-source-controlled-smoke-evidence-handoff --strict`。
- [x] 3.4 运行 `openspec validate --specs --strict` 和 `openspec validate --changes --strict`。
- [x] 3.5 运行 `git diff --check`。
