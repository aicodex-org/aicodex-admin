# Tasks

## 1. Implementation

- [x] 1.1 新增 `wecomSourceControlledSmokePreflight` helper，输出稳定 status、reasonAlias、owner handoff、最小解除条件、safe next steps 和不能外推边界。
- [x] 1.2 新增 focused Node 测试，覆盖 ready、缺少 readiness、缺少 release decision、source stale、真实同步/DB 禁止、脱敏缺口、full-success overclaim、owner/fallback 指引。
- [x] 1.3 新增 Bruno 只读 `Controlled Smoke Preflight.yml` 入口，只做本地变量和脚本校验，不连接真实环境、不触发同步。
- [x] 1.4 更新 Bruno README/operator 指引，说明输入 alias、输出状态、脱敏要求和不能外推边界。

## 2. Specification

- [x] 2.1 更新 delta spec，声明 WeCom source controlled-smoke preflight 的输入、状态、fail-closed 和只读边界。
- [x] 2.2 归档后确认主规格包含 controlled-smoke preflight requirement。

## 3. Verification

- [x] 3.1 运行 focused `node --test`。
- [x] 3.2 运行新增 helper 覆盖率命令，并确认 line/branch/function 覆盖率不低于 85%。
- [x] 3.3 运行 `openspec validate stabilize-admin-wecom-sync-source-controlled-smoke-preflight --strict`。
- [x] 3.4 运行 `openspec validate --specs --strict` 和 `openspec validate --changes --strict`。
- [x] 3.5 运行 `git diff --check` 和 `git diff --cached --check`。
