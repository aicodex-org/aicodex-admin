# review-admin-platform-api-mapping-operator-readiness

## Why

Admin 已经拥有 `PlatformApiUserMapping` 作为 platform admin subject 到 `aicodex-api` user ID 的一等映射，并且 gateway projection builder 只消费同组织、同 `adminSubject` 的可信映射。此前 60 运行态观测出现 `subjectCount=0`、`skippedSubjectCount>0` 且 skip reason 为 `mapping_missing`，说明 producer 可诊断，但当前测试数据没有可发布 subject。

只读 review 发现：Admin 已有基础映射 API/UI、唯一性校验、脱敏审计和 projection observability；但 operator 仍缺少面向 publishable subject 的最小 readiness 工作流。现有用户映射页主要支持关键字搜索和逐行编辑，不能直接按映射状态、lifecycle/tombstone 候选、冲突/重复风险或 publishable 前置条件筛选，也缺少明确的“如何准备 active/tombstone subject fixture 并验证”的后台操作说明。

## What Changes

- 定义 Admin owner 范围内的 `PlatformApiUserMapping` operator readiness 要求。
- 明确 operator 必须能在 Admin 内部确认 active/tombstone publishable subject 的最小前置条件。
- 固化不能把 `displayName`、手机号、邮箱、旧 `ExternalIdentity.Lineage.apiSubjectId` 或旧 `User.Properties.*apiUserId` 当作 projection/runtime join key。
- 要求提供映射状态筛选、冲突/重复诊断、publishable 前置检查入口或等价 runbook/fixture checklist。
- 要求 observability/runbook 能解释 `subjectCount=0 + mapping_missing` 只是无可发布 subject，不代表完整 projection 业务成功。

## Out of Scope

- 不实现生产代码，不新增数据库字段，不写 60 fixture 数据。
- 不改 API / Insight，不写 gateway authorization facts。
- 不让 API/Insight 消费 Admin 管理页 JSON 或 observability JSON。
- 不把手机号、邮箱、展示名、旧 external identity 或旧 user properties 作为跨服务 join key。
- 不执行真实 gate、生产/类生产操作、数据库查询/清理或 60 写入。

## Evidence

- `admin/object/platform_api_mapping.go` 已定义 `PlatformApiUserMapping`、唯一性校验和 confirmed mapping gate。
- `admin/controllers/platform_api_mapping.go` 已提供用户映射查询和更新 API，并写入脱敏 audit。
- `web-admin/src/PlatformApiMappingPage.js` 已提供用户映射页、关键字搜索和映射状态编辑。
- `admin/object/gateway_organization_projection.go` 对缺少确定 `apiSubjectId` 的用户记录 `mapping_missing`，不使用展示字段猜测 gateway subject。
- `openspec/changes/archive/2026-06-11-stabilize-admin-gateway-projection-publishable-subject-fixture-readiness` 已固化 active/tombstone fixture 前置条件和 observability subject count 断言。

## Expected Outcome

本 change 先停在 review-ready。后续若进入 implementation，应只在 Admin owner 内补齐 operator readiness：让 operator 能识别、准备和验证最小 publishable active/tombstone subject fixture，同时保持 projection/runtime 授权边界不变。
