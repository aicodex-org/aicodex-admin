## Why

`aicodex-admin` 已有企业微信组织同步、管理范围和 Insight provider 能力，但这些能力仍以 WeCom 专用表和字段为核心语义。后续客户可能接入钉钉、飞书、LDAP、HR、北森或自建组织系统，需要先把 admin 收敛为 source-neutral 的平台组织主数据 owner，避免 api/gateway 和 insight 被外部来源专用模型绑死。

本 change 基于已归档的 `define-aicodex-organization-data-and-auth-boundaries` 架构基线，拆出 admin 项目的第一个实施子 change。该基线归档在 `aicodex-insight` 项目（仓库：`https://git.leagsoft.com/aicodex/aicodex-insight.git`）的 `openspec/changes/archive/2026-06-03-define-aicodex-organization-data-and-auth-boundaries`，归档后的长期规格位于该项目 `openspec/specs/` 下的 `aicodex-service-data-ownership`、`aicodex-organization-authorization-boundary`、`aicodex-cross-service-data-access`、`aicodex-report-permission-audit-boundary` 和 `aicodex-analytics-read-model`。它只定义 admin 组织主模型和 provider 契约，不实现 gateway 授权或 insight 报表恢复。

## What Changes

- 新增平台组织主模型规格，定义 Platform Organization、SourceConnection、ExternalIdentity、Department、Membership、Role、Position、LifecycleEvent、OrgSyncBatch、scope/org version 和 freshness。
- 将现有企业微信组织同步定位为 WeCom source adapter/source connection 的过渡输入源，而不是长期跨服务权威模型。
- 统一后续钉钉、飞书、LDAP、HR、北森和客户自建系统的接入方式：外部来源写入 admin 归一化组织主模型。
- 将外部身份映射稳定键收敛为 `sourceConnectionId + externalSubjectId`；`sourceType`、`sourceTenantId` 作为来源元数据和外部事件解析字段。
- 收口第一阶段实施口径：多来源冲突只提供后端状态、诊断日志和 fail-closed；Role/Position 先定义 source-neutral 契约和兼容映射；非 WeCom adapter 先使用通用 `metadata/configRef`，不预留专用配置字段。
- 调整管理范围和 Insight admin provider 契约，使 scope 计算依赖平台组织主模型、lifecycle、mappingStatus、scope/org version 和 freshness。
- 调整 WeCom 用量身份解析契约，使企业微信身份解析成为 ExternalIdentity 的一个来源适配结果，同时保留现有 `wecom:{corpId}:{userid}` 兼容路径。

## Capabilities

### New Capabilities

- `admin-organization-master-model`: 定义 admin source-neutral 平台组织主模型、外部来源连接、外部身份映射、多来源冲突处理、生命周期、版本和 provider 输出边界。

### Modified Capabilities

- `wecom-organization-sync`: 将现有企业微信同步约束为 source adapter 过渡实现，并要求同步结果写入平台组织主模型。
- `organization-management-scope`: 将当前用户管理范围从 WeCom 专用关系表语义收敛为平台组织主模型和生命周期驱动的 scope。
- `insight-admin-provider-wrapper`: 将 Insight provider 输出收敛为 source-neutral scope/org 契约，保留来源元数据但不暴露 WeCom 专用权威语义。
- `wecom-usage-identity-mapping`: 将企业微信用量身份解析映射到 ExternalIdentity/sourceConnection 语义，同时保留现有兼容字段。

## Impact

- 影响后端组织模型、同步表、provider service、管理范围计算、审计和版本字段设计。
- 影响现有 WeCom 同步实现的迁移方向，但不要求一次性删除现有 `wecom_*` 表。
- 影响 `aicodex-insight` 后续恢复部门用量报表时消费的 admin provider contract。
- 影响 `aicodex-api / ai-gateway` 后续组织授权投影 change 的输入前提，但本 change 不实现 api/gateway 消费端。
- 不新增多来源冲突人工确认页面，不提前实现完整 Role/Position 管理产品，也不为钉钉、飞书、LDAP、HR、北森或客户自建 adapter 预留专用配置字段。
- 不涉及真实客户数据迁移或生产部署；业务代码实现与测试环境验证已在本 change apply 阶段完成。

## Parallel Change Coordination

本组织架构路线拆成三个并行 active change，当前 admin change 是三边契约锚点。三个 change 在实施和 review 期间都不应 archive，且各 agent 只修改自己仓库。

| 项目 | 分支 | Change | 职责边界 |
| --- | --- | --- | --- |
| `aicodex-admin` | `hfl-test/define-admin-organization-master-model` | `define-admin-organization-master-model` | 组织主模型、SourceConnection、ExternalIdentity、lifecycle、scope/org version、admin provider contract |
| `aicodex-api` | `hfl-test/define-gateway-organization-authorization-projection` | `define-gateway-organization-authorization-projection` | admin-to-gateway projection、gateway-owned resource authorization facts、runtime allow/deny、authorization audit |
| `aicodex-insight` | `hfl-test/restore-insight-department-usage-report-boundary` | `restore-insight-department-usage-report-boundary` | 恢复部门用量报表，只消费 admin scope/org provider 和 api usage provider |

协作约束：

- admin provider contract/fixture 是 api 和 insight 的依赖锚点；admin 实施阶段先冻结 `current-user`、`scope` 和 `organization-tree` fixture。
- api 和 insight 如果发现契约字段不够，必须先提出 contract gap，不得私自发明字段或扩展语义。
- admin 如果要改 provider 字段、错误码、version/freshness/mappingStatus 语义，必须同步通知 api 和 insight。
- api 不得把 insight report scope 当 gateway 授权事实；gateway 授权事实只属于 `aicodex-api / ai-gateway`。
- insight 不实现组织同步、不实现 gateway 授权、不建设权限矩阵，只消费标准 provider。
- review 修复后先运行 `openspec validate <change-name> --strict` 和 `git diff --check`。
