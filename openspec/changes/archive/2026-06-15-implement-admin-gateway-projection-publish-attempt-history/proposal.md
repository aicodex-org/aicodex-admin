# Proposal

## Why

Admin 已具备 gateway projection manual publish console，并能返回一次 publish 的脱敏 result envelope。当前 operator 只能看到当前提交后的即时结果或进程内 latest observability，无法稳定追踪 manual / scheduled publish attempt 的历史、失败分类和重试线索。

这会让 projection producer 的运营排障依赖临时页面状态或日志检索，尤其在 publisher 配置、source freshness、mapping readiness、gateway transient failure 等问题交替出现时，难以判断最近一次失败是否可重试、是否已被后续 scheduled refresh 修复。

## What Changes

- 增加 Admin-owned gateway projection publish attempt history 台账，稳定记录 manual 与 scheduled attempt 的脱敏摘要。
- 提供 admin-only 列表与详情查询，支持按组织、source、status、时间范围筛选。
- 在现有 Platform API mapping / projection 操作区展示最近 attempts 和详情，帮助 operator 判断失败原因、重试风险和 source/mapping 前置条件。
- 保持 attempt history 为 Admin producer 诊断数据，不写 gateway authorization facts，不作为 API/Insight 授权输入。

## 非目标

- 不改变 gateway projection ingestion contract，不新增 projection payload 字段。
- 不实现 API/Gateway/Insight 查询或 fallback。
- 不触发真实 60 fixture 写入、数据库明细写入/清理或真实 gate。
- 不新增权限矩阵、gateway resource authorization facts 或 Insight 本地授权事实。
- 不把 Admin 管理页面 JSON、observability JSON 或 attempt history 变成跨服务授权来源。

## 影响范围

- 后端：新增 publish attempt history DTO、store/service、manual/scheduled 记录 hook、列表/详情 controller API。
- 前端：在 `PlatformApiMappingPage` 的 projection 操作上下文增加 attempts 表格、筛选和详情展示。
- OpenSpec：更新 `admin-gateway-organization-projection-publisher` 规格，明确 attempt history 的脱敏、查询和边界。
- 测试：补后端聚焦测试、前端相关测试和构建验证。
