# Tasks

## 1. OpenSpec

- [x] 新增诊断动作的 proposal、design、tasks 和 spec delta。
- [x] 运行 `openspec validate add-admin-service-credential-governance-diagnostic-actions --strict`。
- [x] 完成实施前 review，并修复 readiness 缺口。

## 2. Backend

- [x] 新增 copy-safe diagnostic request/response 类型和 service logic。
- [x] 新增带权限检查的 Application Access diagnostic route 和 controller method。
- [x] 覆盖 ready、disabled、missing reference、unresolved reference、keep-in-env/env_config、unsupported group/source class，以及 raw sensitive material fail-closed 行为。

## 3. Frontend

- [x] 新增 diagnostic client method 和 typed response models。
- [x] 在现有服务凭据治理配置入口新增 scoped “诊断/预检”动作。
- [x] 展示包含 stable alias、owner hint、source class、reference status、caller policy presence、keep-in-env、cannot-infer 和 next action 的诊断结果。
- [x] 使用 focused Jest tests 覆盖按钮可见、copy-safe payload、结果渲染、错误态和敏感材料不渲染。

## 4. Verification and Closeout

- [x] 运行要求的 OpenSpec、Go、TypeScript、Jest、build 和 diff validations。
- [x] 运行 pre-archive review。
- [x] Archive the change and validate specs/changes strictly.
- [x] Squash to one logical commit, push work branch, ff-only merge/push `hfl-test-base`, delete work branch, and write the final report.
