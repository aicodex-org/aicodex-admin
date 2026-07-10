## 1. OpenSpec

- [x] 1.1 定义 Admin secure handoff grant 包 shape、生命周期 API、脱敏和 fallback 边界。
- [x] 1.2 校验 change strict validate 通过。

## 2. Backend

- [x] 2.1 新增 Admin owner grant 模型、脱敏 envelope、内存 store 和可注入 credential issuer。
- [x] 2.1a 将默认 grant store 收敛为 DB 持久化 record/store，内存 store 仅保留测试注入。
- [x] 2.2 实现 create/redeem/confirm/fail/revoke/status API，覆盖 TTL、一次性、防重放、audience/workspace/environment/provider/target registration 校验。
- [x] 2.3 新增组合 Insight Admin 接入包生成 endpoint，复用 copy-safe metadata 并附带 secure grant envelope。
- [x] 2.3a 对齐 Insight common envelope：`schemaVersion=aicodex.insight.access-package.v1`、`target=insight.connection-profile.import`、`copySafeHandoff`、`secureHandoffGrant`。
- [x] 2.4 确保状态查询、组合包和错误响应不输出 raw credential material、完整 URL、完整 secretRef 或 raw payload。

## 3. Frontend

- [x] 3.1 扩展前端 package builder 和 API client，默认生成/复制组合 Insight Admin 接入包。
- [x] 3.2 更新默认 UI 文案：主动作表达“复制 Insight Admin 接入包”，manual/secretRef 仅作为 fallback。
- [x] 3.3 更新 zh/en locale 和 focused Jest，避免默认层引导 env/config。

## 4. Validation

- [x] 4.1 后端 focused tests 覆盖 grant shape、redaction、expired/redeemed/revoked/fail-closed。
- [x] 4.2 前端 focused Jest 覆盖组合包 shape、无 raw secret、UI 文案。
- [x] 4.3 运行 incremental TS gate、typecheck、build（如成本可接受）和 `git diff --check`。
- [x] 4.4 普通 push 工作分支，等待主控决策；不 archive、不合 base、不 push test。
