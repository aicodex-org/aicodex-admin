## Why

`define-aicodex-organization-data-and-auth-boundaries` 已经明确 `aicodex-admin` 是组织主数据、稳定身份映射、报表 scope 和 admin-to-gateway projection 的 owner。近期 admin/api/insight 的跨服务 smoke 已证明 projection refresh、API provider 和 Insight consumer 可以端到端工作，但组织架构树本身仍需要在 admin 侧稳定为可长期依赖的产品能力。

当前 `GET /api/admin-provider/insight/v1/current-user/organization-tree` 已可用，但实现仍以旧 `Group` 树为主要来源，再用 `PlatformDepartment` 补来源元数据。这是兼容过渡形态，不足以作为后续报表 scope、组织树展示、gateway projection 和排障诊断共同依赖的稳定 read model。

领导要求尽快稳定 admin 侧组织架构树。本 change 将该工作收敛在 `aicodex-admin`，不改变 API/Insight 的 owner 边界。

## What Changes

- 定义 admin 组织架构树 read model 的稳定契约，优先来自 `PlatformDepartment`、成员关系、生命周期、SourceConnection 和 OrgSyncBatch lineage。
- 收敛 `organization-tree` provider：返回稳定部门节点、父子关系、路径、来源元数据、生命周期、`orgVersion`、`freshness`、`generatedAt` 和 lineage。
- 保留旧 `Group` 兼容读取，但仅作为迁移输入或兼容投影，不作为跨服务长期权威来源。
- 明确管理员、部门负责人、直属上级和普通用户的可见树范围，禁止从前端过滤、展示名、手机号、邮箱或来源专用字段推断授权。
- 补充 admin 侧测试和 60 环境 smoke 验证；60 smoke 必须使用已知具备可管理组织树的测试账号或 fixture，证明组织树非空、父子关系稳定、禁用/冲突节点 fail closed、版本和 freshness 可诊断。

## Out Of Scope

- 不修改 `aicodex-api` 的 gateway authorization facts 或 provider contract。
- 不让 API 直接消费 admin 管理页面组织树 JSON；API/gateway 只消费 admin 发布的 gateway organization projection contract。
- 不修改 `aicodex-insight` 报表页面和 fallback 策略；Insight 仍只读消费 admin provider。
- 不建设完整组织架构编辑后台、人工冲突确认页面或多来源治理 UI。
- 不把所有历史 `Group` 数据一次性迁移删除。

## Impact

- 主要文件：`admin/controllers/insight_provider.go`、`admin/object/platform_organization.go`、组织/同步相关 object/service、provider 测试和 smoke 文档。
- 下游影响：Insight 组织树、部门用量和权限报表会获得更稳定的组织事实；API/gateway projection builder 后续可继续复用同一主模型口径。
- 风险：如果现有测试环境 PlatformDepartment 或关系数据不完整，provider 应返回可诊断的 unavailable/empty/fail-closed，而不是回退到更宽 scope。
