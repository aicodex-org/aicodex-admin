## 1. OpenSpec

- [x] 创建 proposal、design、tasks 和 spec delta，范围限定为 `usage_identity_resolver` live provider runtime path。
- [x] 运行 `openspec validate wire-admin-usage-identity-resolver-runtime-path --strict`。
- [x] 完成实施前 review，确认不扩大到 API/Gateway/Insight 或登录/OIDC/WeCom 主流程。

## 2. TDD

- [x] 写 RED Go 测试：local confirmed mapping 保持本地优先且不调用 resolver。
- [x] 写 RED Go 测试：local missing + saved disabled / unresolved reference 在 outbound 前 fail-closed。
- [x] 写 RED Go 测试：local missing + saved `env_config` / `keepInEnv=true` 使用 saved caller/maxItems/timeout 调用 fake resolver。
- [x] 写 RED Go 测试：resolver 返回 invalid / caller-scope mismatch 时 provider fail-closed，不回落 legacy。
- [x] 写 RED Go 测试：批量 scope mapping path 在 local missing 时复用 resolver gate。

## 3. Implementation

- [x] 在 `insight_provider` live path 中接入现有 resolver runtime policy。
- [x] 保持本地 confirmed mapping、source identity enrichment、skipMissing 聚合语义兼容。
- [x] 确保 saved disabled/unresolved/invalid 不触发 outbound 且不回落 legacy。
- [x] 确保日志、错误和测试断言不包含 secrets、完整私有 URL、raw payload 或 raw ids。

## 4. Verification

- [x] 运行 focused Go tests。
- [x] 运行 `go test -cover ./admin/controllers` 并记录受影响 package 覆盖率。
- [x] 运行 `openspec validate wire-admin-usage-identity-resolver-runtime-path --strict`。
- [x] 运行 `openspec validate --changes --strict`。
- [x] 运行 `openspec validate --specs --strict`。
- [x] 运行 `git diff --check`。
- [x] 评估 60 环境聚焦 downstream gate acceptance：本地归档前阶段未读取 60 私有运维配置、未发现可直接使用的安全 fake/no-op resolver target；已在 `verification.md` 记录后续复验口径，不伪造正向成功。

## 5. Closeout

- [ ] 完成归档前 review。
- [ ] archive OpenSpec change。
- [ ] 收敛为 1 个逻辑 commit。
- [ ] push 工作分支，ff-only 合入并 push `origin/hfl-test-base`。
- [ ] 删除本地和远端工作分支，确认最终 clean/aligned。
- [ ] 写入最终脱敏 report。
