## 验证摘要

本 change 修改 Admin 后端运行时 gate 和 OpenSpec 文档，未触碰 `web-admin` 前端、API/Gateway/Insight 仓库、OIDC/Login/WeCom 主流程或 `test` 分支。

## 命令结果

- `openspec validate implement-admin-service-credential-runtime-policy-consumption --strict`: 通过。
- `openspec validate --changes --strict`: 通过，4 个 active changes 全部 valid。
- `openspec validate --specs --strict`: 通过，28 个 specs 全部 valid。
- `git diff --check`: 通过，无 whitespace error。
- `cd admin; go test ./controllers -run 'InsightUsageIdentityResolver|ServiceCredentialGovernance' -count=1`: 通过。
- `cd admin; go test ./object -run 'ServiceCredential|GatewayProjection' -count=1`: 通过。

## 覆盖率

由于 `controllers` 和 `object` 是大包，focused coverage 的 package 总覆盖率分别为 3.6% 和 8.0%；因此按受影响函数记录 changed-function 覆盖证据：

- `controllers/insight_usage_identity_resolver.go:getInsightUsageIdentityResolverConfig`: 94.4%。
- `controllers/application_access_service_credential_governance_status.go:applyServiceCredentialGovernanceStatusGroupConfigOverlay`: 87.8%。
- `controllers/application_access_service_credential_governance_status.go:serviceCredentialGovernanceRuntimeRequiredPolicyKeys`: 100.0%。
- `object/gateway_organization_projection_publisher.go:GetGatewayProjectionPublisherConfig`: 100.0%。
- `object/gateway_organization_projection_publisher.go:normalizeGatewayProjectionTimeoutMs`: 100.0%。
- `object/service_credential_runtime_policy.go:GetServiceCredentialRuntimePolicyDecision`: 100.0%。
- `object/service_credential_runtime_policy.go:BuildServiceCredentialRuntimePolicyDecision`: 95.8%。
- `object/service_credential_runtime_policy.go:ServiceCredentialRuntimePolicyInt`: 100.0%。

## web-admin

N/A。本 change 未修改 `web-admin` 文件，没有新增或迁移 TS/TSX，也未改变前端路由、组件或构建入口。

## 脱敏与运行态边界

- 验证记录只包含命令、文件名、函数名、配置 key 名和 stable blocker alias。
- 未记录 token、Authorization header、Cookie、DSN、client secret、完整私有 URL、raw payload/raw id、真实账号或完整组织树。
- 未执行 60 运行态保存/回滚验收；本轮验证是源码级和单测级。由于当前 Admin 没有 external secret resolver，`external_secret_system` 与 `admin_config` 引用的正确行为是 fail-closed + `admin_service_credential_reference_unresolved`。

## 剩余风险

- 本 change 不实现 secret vault 或 external secret resolver；未来如要让 `external_secret_system` / `admin_config` 真正发起服务间调用，需要单独引入脱敏 resolver 契约并重新评估安全边界。
- 未做真实 Gateway projection publish/refresh 运行态调用；这是有意保持的边界，避免在本 change 中触发外部写操作。
