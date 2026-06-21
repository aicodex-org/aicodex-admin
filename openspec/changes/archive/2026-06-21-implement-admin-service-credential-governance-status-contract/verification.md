## 验证记录

### OpenSpec

- `openspec validate implement-admin-service-credential-governance-status-contract --strict`：已在实施前通过，确认 proposal/design/tasks/spec delta 结构有效。
- `openspec validate --changes --strict`：待最终归档前运行。
- `openspec validate --specs --strict`：待最终归档前运行。

### 后端 focused tests 与覆盖率

- `cd admin; go test ./controllers -run 'Test(Get|Build)ApplicationAccessServiceCredentialGovernanceStatus' -count=1 -coverprofile <temp-cover-profile>`：通过，聚焦覆盖只读治理状态 builder 和 controller wrapper。
- `go tool cover -func <temp-cover-profile>`：受影响新增实现文件 `admin/controllers/application_access_service_credential_governance_status.go` 的关键函数覆盖率如下：
  - `GetApplicationAccessServiceCredentialGovernanceStatus`: 100.0%
  - `requireServiceCredentialGovernanceGlobalAdmin`: 100.0%
  - `buildApplicationAccessServiceCredentialGovernanceStatus`: 100.0%
  - `buildInsightProviderTrustGovernanceGroup`: 96.4%
  - `buildUsageIdentityResolverGovernanceGroup`: 100.0%
  - `buildGatewayOrganizationProjectionGovernanceGroup`: 96.2%
  - `buildKeepInEnvGovernanceGroup`: 100.0%
  - helper functions: 100.0%
- 说明：`controllers` package 总覆盖率为 1.5%，原因是该 package 包含大量与本 change 无关的 legacy controllers；本次 coverage 判断以新增实现文件和关键函数为准，均达到 85% 门槛。

### 前端 focused tests、TypeScript 与构建

- `cd web-admin; yarn test --watchAll=false ApplicationAccessCenter.test.tsx --coverage --coverageDirectory <temp-dir> --coverageReporters=text --collectCoverageFrom=src/ApplicationAccessCenter.tsx --collectCoverageFrom=src/backend/ApplicationAccessServiceCredentialGovernanceBackend.ts`：通过，10 个 focused tests 全部通过。
- changed-file coverage：
  - `src/ApplicationAccessCenter.tsx`: statements 98.61%，branches 92.35%，functions 100%，lines 98.56%。
  - `src/backend/ApplicationAccessServiceCredentialGovernanceBackend.ts`: statements/branches/functions/lines 100%。
- `cd web-admin; node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`：通过，退出码 0。
- `cd web-admin; yarn typecheck`：通过，`tsc --noEmit` 退出码 0。
- `cd web-admin; yarn build`：通过，构建成功；输出包含既有 `Browserslist: caniuse-lite is outdated`、`fs.F_OK is deprecated` 和 bundle size 提示，本 change 未修改依赖或构建配置。

### 安全与脱敏验证

- 后端测试覆盖 token、Authorization、Cookie、client secret、private key、完整 private URL 和内部 endpoint 字符串不出现在响应 JSON 中。
- 后端 controller 测试覆盖 anonymous 和非 `built-in/*` 用户拒绝访问，只有 global admin session 才返回治理状态。
- 前端测试覆盖 mocked runtime contract 即使携带 `unsafeTokenValue` / `unsafeEndpoint` 这类异常字段，也不会在 `ApplicationAccessCenter` 中渲染出来。
- 本 change 未新增写接口，未触发 credential test、Provider request、resolver request、Gateway projection publish/refresh、login、OIDC callback 或 WeCom sync。

### 运行态验收口径

- 本次已完成源码级、单测、覆盖率、TypeScript 和构建验证。
- 未连接真实测试环境执行 HTTP smoke；原因是该 change 的 P0 是 Admin-owned 只读脱敏契约和应用接入消费，当前自动化已覆盖路由 handler、authz allowlist、前端 fetch 路径和脱敏展示。真实环境 smoke 可作为后续部署验收补充，不作为本次归档阻断。

### 剩余风险

- 新接口读取的是 Admin 运行态配置状态，不验证外部 provider、resolver 或 Gateway 的真实连通性。
- `keep_in_env` 分组只返回安全 key/pattern 分类，不代表对应 secret backend 已完成轮换或审计。
