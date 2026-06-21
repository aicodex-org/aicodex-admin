## 1. OpenSpec

- [x] 1.1 创建 proposal、design、tasks、verification 和 spec delta，说明 owner boundary、copy-safe policy、legacy fallback、saved disabled fail-closed、no raw issuer URL。
- [x] 1.2 运行 `openspec validate implement-admin-insight-provider-trust-runtime-policy --strict`。
- [x] 1.3 完成实施前 review，确认字段设计、写集、安全边界、TDD 和验证计划无阻断问题。

## 2. TDD Backend

- [x] 2.1 写 RED tests 覆盖无显式 saved trust policy 时 legacy fallback。
- [x] 2.2 写 RED tests 覆盖 saved enabled policy 覆盖 env，并让 provider bearer trust 使用 saved audience/scope/issuer digest。
- [x] 2.3 写 RED tests 覆盖 saved policy 不完整、audience mismatch、issuer digest mismatch 或 scope mismatch 时拒绝且不回落 env。
- [x] 2.4 写 RED tests 覆盖 saved disabled policy fail-closed。
- [x] 2.5 写 RED tests 覆盖 governance status copy-safe source/count/digest/defaulted/cannotInfer 输出。
- [x] 2.6 写 RED tests 覆盖 sanitizer 拒绝 issuer raw URL、Authorization、Cookie、clientSecret、private key、DSN、raw payload/raw id/full private URL。

## 3. Implementation

- [x] 3.1 扩展 `insight_provider_trust` saved runtime policy normalization 和 copy-safe 校验。
- [x] 3.2 让 provider bearer trust 校验消费 saved runtime policy，并保持无显式 policy 时 legacy fallback。
- [x] 3.3 让 saved enabled policy 覆盖 legacy env/config，saved disabled policy fail-closed。
- [x] 3.4 扩展 service credential governance status 中 `insight_provider_trust` 的 copy-safe source/count/digest/defaulted/cannotInfer 摘要。
- [x] 3.5 确认实现不触发 Gateway projection publish/refresh、API/Gateway/Insight 写操作、Login/OIDC callback/WeCom 主流程。

## 4. Verification And Closeout

- [x] 4.1 运行 focused Go tests：`cd admin; go test ./controllers -run 'Insight|ServiceCredentialGovernance' -count=1`。
- [x] 4.2 运行 object focused tests：`cd admin; go test ./object -run ServiceCredentialGovernanceConfig -count=1`。
- [x] 4.3 运行受影响 package 覆盖率并记录结果。
- [x] 4.4 运行 `openspec validate --changes --strict`、`openspec validate --specs --strict`、`git diff --check`。
- [x] 4.5 更新 `verification.md`，记录命令、结果、覆盖率、脱敏说明和剩余风险。
- [x] 4.6 完成归档前 review 并修复阻断项。
- [x] 4.7 archive change，重新验证 changes/specs strict。
- [x] 4.8 收敛为一个 change commit，push 工作分支，ff-only 合入并 push `origin/hfl-test-base`，删除本地/远端工作分支，`push_test=false`。
- [x] 4.9 写最终 report 到 vault 并回传结构化 closeout。
