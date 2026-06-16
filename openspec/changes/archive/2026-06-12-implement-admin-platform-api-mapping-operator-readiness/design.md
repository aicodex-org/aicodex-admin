# Design

## Current Code

- `admin/object/platform_api_mapping.go` 定义 `PlatformApiUserMapping`、保存逻辑和 API mapping gate。
- `admin/controllers/platform_api_mapping.go` 提供 `GetPlatformApiUserMappings` / `UpdatePlatformApiUserMapping`，并记录脱敏 audit。
- `web-admin/src/PlatformApiMappingPage.js` 是现有 operator UI，可复用当前组织、用户映射表、搜索和状态编辑模式。
- `admin/object/gateway_organization_projection.go` 已在 projection builder 中区分 `mapping_missing`、`mapping_untrusted`、lifecycle/source/lineage 风险，但这些信号目前主要在 build summary/audit 中出现，operator 难以在映射页面提前排查。

## Decisions

### 1. Readiness 只读，不写映射

新增 readiness 服务和 API 只返回诊断结果，不创建、更新或确认 mapping。写 mapping 仍走现有 `UpdatePlatformApiUserMapping`，并保持 operator 显式操作和 audit。

### 2. 复用现有 Admin owner 数据

readiness 聚合只读取 Admin owner 数据：

- `PlatformUser` 的 `OrganizationId`、stable admin subject、`LifecycleStatus`、`MappingStatus`。
- `PlatformApiUserMapping` 的 `ApiUserId`、`MappingStatus`、`MappingSource`。
- 可用的 source/lineage/freshness 元数据，优先复用 projection builder 或现有 helper 的判断规则。

不读取 API/Insight 数据库，不消费 Admin 管理页 JSON 作为跨服务授权输入。

### 3. 分类结果面向 operator

每个候选 subject 给出稳定、脱敏的 readiness category：

- `active_publishable`
- `tombstone_publishable`
- `mapping_missing`
- `mapping_untrusted`
- `lifecycle_not_publishable`
- `source_metadata_unavailable`
- `lineage_freshness_unavailable`

响应允许包含 `adminSubject` 和 `apiUserId` 这类 operator 已维护的 Admin 管理数据，但日志、runbook 和验证记录不得输出真实账号、手机号、邮箱、完整组织树或完整响应体。

### 4. 前端最小改动

在 `PlatformApiMappingPage` 增加只读 readiness 面板和筛选：

- 展示 readiness counts 和 blocked reason counts。
- 支持按 readiness category / mapping status / keyword 筛选。
- 链接或展示 runbook 摘要，说明 `subjectCount=0 + mapping_missing` 不是完整 projection 业务成功。

### 5. Bruno/runbook 只做脱敏交接

新增或更新 `api-tests/bruno/aicodex-admin/README.md`，记录如何用只读 readiness 和 projection observability 定位 gap。默认不要求 60 subject count 成功，不写 fixture。

## Testing

- 后端：优先为 readiness 分类服务写聚焦 Go 测试，覆盖 active/tombstone publishable、mapping missing/untrusted、legacy/display 字段不参与 join、只读响应聚合。
- 前端：按项目现有测试方式覆盖 API 调用封装、页面筛选/渲染或至少运行 lint/build。
- OpenSpec：change validate、changes validate、archive 后 specs validate。
- Coverage：生产代码改动后统计受影响 Go package coverage，目标 85%；前端按项目脚本记录结果。

## Risks

- 如果现有 `PlatformUser` 查询能力不足，先做最小只读 helper，不新增迁移。
- 真实 60 subject count 仍需要用户授权写入 fixture，本 change 只提供 readiness 诊断和 runbook。
