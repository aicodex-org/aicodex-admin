## 验证结论

`publish-organization-sync-contract-v2` 的 producer 实现、legacy 协商、来源血缘、稳定身份、多部门、部门负责人、直属上级及撤销 tombstone 已通过定向测试和编译验证。v2 使用专用最小 DTO，不序列化完整 `Organization` 或 `Application`。

## 契约字段映射

| Admin v2 字段 | aicodex-api consumer 语义 | 校验规则 |
| --- | --- | --- |
| `contractVersion` | 目录契约版本 | 必须严格等于 `v2` |
| `sourceConnectionId` | source ownership / 撤销边界 | 必须非空，且一次快照仅一个真实 connection |
| `sourceType` / `sourceTenantId` | provider 与外部租户 lineage | 必须来自 active/fresh `SourceConnection` |
| `sourceOrgVersion` / `batchId` | current source version/batch | 必须与 connection 的 `lastSeenBatchId` 和 current batch 一致 |
| `generatedAt` / `freshnessExpiresAt` | Gateway freshness gate | 过期或非 fresh 必须拒绝 active facts |
| `lineage.sourceService` | producer 标识 | 固定为 `aicodex-admin` |
| `lineage.sourceVersion` / `digest` | 幂等与 lineage 校验 | digest 为安全、排序后 DTO 的 `sha256:<hex>` |
| `organization.organizationId` | Admin 外部组织绑定键 | 只能用于匹配 Gateway `admin_organization_id`，不得替代 Gateway UUID `organization_id` |
| `departments[]` | mirrored department / closure 输入 | 按 department natural key 稳定排序、去重，并携带 source/version/batch/lifecycle |
| `memberRelations[]` | organization membership 与 department binding 输入 | 只接受 current PlatformUser、current confirmed ExternalIdentity 和同来源 membership；active 必须通过所有生命周期层校验 |
| `departmentLeaderRelations[]` | department managed-scope 输入 | 仅来自 `PlatformMembership.isManager`，不等同于 organization manager |
| `directLeaderRelations[]` | direct-report edge 输入 | 仅来自同 corp 的显式关系；本批次 `missingSinceRunId` 输出 `disabled` tombstone |
| `applications[]` | 只读应用摘要 | 仅包含 name/displayName/category/type/organization，不包含认证配置或 secret |
| `diagnostics.skippedReasonCounts` | ingestion readiness/诊断 | 只能用于诊断，不能据此扩大授权 |

## 已执行验证

- `gofmt`：新建和修改的 Go 文件已格式化。
- `go test ./object ./controllers ./routers -count=1`：通过。
- `go test ./object ./controllers ./routers -run 'Test(OrganizationSyncContractV2|ExportOrganizationSyncSnapshot|IsOrganizationSyncApiKeyReadPath|ApiFilterAllowsOrganizationSyncApiKey)' -count=1`：通过。
- `go build ./...`：通过。
- `openspec validate publish-organization-sync-contract-v2 --strict --json`：通过，0 issues。
- `go test ./... -count=1`：业务相关包通过；仓库既有环境型测试因本机未提供 RADIUS `:1812`、MySQL `:3306`/外部测试数据库、`tmpFiles/example`，以及 macOS 上未实现的网络指标而失败。这些失败不经过本 change 的代码路径，未修改或掩盖。

## 覆盖的强制场景

- legacy 默认响应与 v2 显式协商互不混淆，未知版本失败关闭。
- zero/multiple/stale/disabled source、missing/current batch、lineage/freshness 异常失败关闭。
- 多部门且 source-scoped 单 main；department leader 与 U1→U2→U3 direct chain 独立输出。
- stale identity、stale PlatformUser、identity conflict、main conflict 不形成 active trusted facts。
- membership active 但 user disabled 时输出 disabled，不得输出 active。
- 本批次直属上级撤销输出 disabled tombstone，且其他 corp 的关系不会混入。
- legacy `Group.Manager` 文本不进入 v2 leader builder。
- 输入数组和 applications 顺序变化不改变排序结果或 digest。
- JSON 扫描确认不包含密码策略、master password、IP 白名单、client secret、redirect URI、HTML、secret/config ref、邮箱或手机号。

## Legacy 回滚

1. Gateway 停止发送 `contractVersion=v2`，Admin 同一路径自动回到原 legacy builder 和原 JSON shape。
2. 不删除 v2 endpoint 分支，不改变 API Key 组织绑定与只读路由 allowlist。
3. 已由 v2 写入 Gateway 的 source-managed membership、department binding 或 reporting relation，必须由 Gateway 按 source ownership/version 撤销；不得通过切回 legacy 直接删除。
4. 回滚期间 legacy 数据仅作为兼容读取，不得重新作为 organization manager 或 managed scope 的授权事实。
