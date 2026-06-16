# 验证记录

## 2026-06-10

### 红灯阶段

- `go test ./object -run "TestStandardClaims|TestOidcDiscovery"`
  结果：失败，`ClaimsStandard` 缺少 `WecomCanonicalId` 字段，符合新增标准 claim 尚未实现的预期。

- `go test ./object -run "TestStandardClaims|TestOidcDiscovery"`
  结果：失败，`SigninMethod=Password` 且 `Provider=WeCom` 时错误输出 `wecom_canonical_id`。该失败用于证明企业微信 claim 不能被显式非企业微信登录上下文伪造。

### 绿灯阶段

- `go test ./object -run "TestStandardClaims|TestOidcDiscovery"`
  结果：通过，`git.leagsoft.com/aicodex/aicodex-admin/object`。覆盖完整企业微信身份、缺少 `corp_id` / `userid`、非企业微信登录、防 provider 伪造和 discovery `claims_supported`。

- `openspec validate add-admin-oidc-wecom-canonical-claim --strict`
  结果：通过，`Change 'add-admin-oidc-wecom-canonical-claim' is valid`。

- `openspec validate --specs --strict`
  结果：通过，13 个主规格全部通过。

- `git diff --check`
  结果：通过，无 whitespace error。

### 覆盖率

- `go test ./object -run "TestStandardClaims|TestOidcDiscovery" -coverprofile $env:TEMP\coverage-wecom-canonical.out`
  结果：通过，聚焦测试覆盖率为 `0.4% of statements`。该结果只证明本次新增行为测试可运行，不能作为 `object` package 达到 85% 覆盖率的结论。

- 使用同一 coverprofile 叠加 `git diff --unified=0 HEAD~1 -- admin/object/token_standard_jwt.go admin/object/wellknown_oidc_discovery.go` 统计变更可执行行覆盖率。
  结果：受影响实施代码变更可执行行覆盖率为 `23/23 (100.0%)`，覆盖对象为 `admin/object/token_standard_jwt.go` 与 `admin/object/wellknown_oidc_discovery.go` 中本 change 新增或修改的可执行语句。该统计覆盖 `wecom_canonical_id` 生成、缺字段 fail closed、非企业微信登录不输出、防 provider 伪造、legacy provider 兼容和 discovery claim 声明。

### 剩余风险

- 未运行完整 `go test ./object -cover`，因为该包历史测试 `TestGenerateRsaKeys` / `TestGenerateEsKeys` / `TestGenerateRsaPssKeys` 会重写已跟踪的 `admin/object/token_jwt_key.pem` 与 `admin/object/token_jwt_key.key`，直接运行会制造与本 change 无关的 fixture diff。归档判断以本 change 受影响实施代码的变更可执行行覆盖率为准。
