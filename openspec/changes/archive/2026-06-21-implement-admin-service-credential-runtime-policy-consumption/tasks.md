## 1. OpenSpec

- [x] 1.1 创建 proposal、design、tasks 和 spec delta，中文说明并保留必要英文技术名词。
- [x] 1.2 运行 `openspec validate implement-admin-service-credential-runtime-policy-consumption --strict`。
- [x] 1.3 完成实施前 review，确认 scope、写集、安全边界、TDD 和验证计划无阻断问题。

## 2. Runtime Policy Gate

- [x] 2.1 先写 RED focused Go tests，覆盖 no saved config legacy fallback、saved disabled fail-closed、unresolved reference fail-closed、env_config/keepInEnv overlay 和脱敏 blocker。
- [x] 2.2 新增小 helper 读取 saved service credential governance config，并为 `usage_identity_resolver` 与 `gateway_organization_projection` 生成 runtime gate 结果。
- [x] 2.3 让 `usage_identity_resolver` 通过 saved policy gate 决定 legacy fallback、disabled、unresolved reference 和 caller/timeout/maxItems overlay。
- [x] 2.4 让 Gateway projection publisher/service/readiness/observability/refresh 最小路径通过统一 gated publisher config。
- [x] 2.5 确认 `credentialReferenceKey` 不被当作 URL/token 使用，且所有 blocker/status 输出保持 copy-safe。

## 3. Verification

- [x] 3.1 运行 focused Go tests 和受影响 package coverage，记录覆盖率对象和结果。
- [x] 3.2 运行 `openspec validate --changes --strict`、`openspec validate --specs --strict`、`git diff --check`。
- [x] 3.3 如未触碰前端，记录 web-admin TS gate/typecheck 为 N/A；如触碰则运行增量 TS gate 与 typecheck。
- [x] 3.4 更新 `verification.md`，记录命令、结果、覆盖率、脱敏说明和剩余风险。
- [x] 3.5 完成归档前 review 并修复阻断项。
- [x] 3.6 archive change，重新验证 changes/specs strict。
- [x] 3.7 收敛为一个 change commit，push 工作分支，ff-only 合入并 push `origin/hfl-test-base`，删除本地/远端工作分支，`push_test=false`。
- [x] 3.8 写最终 report 到 vault 并回传结构化 closeout。
