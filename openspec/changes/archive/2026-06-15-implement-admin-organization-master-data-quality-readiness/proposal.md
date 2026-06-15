## Why

Admin 已经具备组织主模型、Platform API mapping readiness、gateway projection 手动发布入口和 projection producer 观测能力。operator 在触发 projection 发布前，还缺少一个面向组织主数据本身的质量 readiness 汇总，无法快速判断当前组织、部门、成员关系、主体、映射、SourceConnection 和 source freshness 是否满足 projection 生产前置条件。

本 change 目标是在 Admin owner 范围内提供只读组织主数据质量 readiness：聚合 admin 自有组织主模型和映射诊断，输出稳定 `ready` / `warning` / `blocked` 状态、脱敏 reason aliases 和计数，给 manual publish console 与后续 run diff/retry readiness 作为前置质量信号参考。

## What Changes

- 新增 Admin organization master data quality readiness service/API，基于 `GatewayProjectionSnapshot` 读取 PlatformDepartment、PlatformMembership、PlatformUser、PlatformApiUserMapping、SourceConnection 和 OrgSyncBatch。
- 输出脱敏 summary：status、generatedAt、counts、reasonAliases、sourceConnectionSummary、syncBatchSummary、qualityChecks。
- 质量检查覆盖缺失外部/source key、重复 source key、orphan department、成员关系引用缺失、disabled/tombstone/unknown/conflicted/stale subject、未映射或不可信映射、source freshness/trust。
- 在现有 Platform API mapping / projection 操作区增加最小 UI 区域，展示质量状态、reason aliases、关键计数和刷新按钮。
- 补后端/前端聚焦测试、OpenSpec delta 和 verification。

## Non-Goals

- 不触发 gateway projection publish，不修改 manual publish 执行逻辑。
- 不实现 projection run diff/retry readiness，不触碰其写集。
- 不实现飞书组织同步或修改飞书同步相关接口/配置。
- 不读取 API/Gateway/Insight 内部库，不修改 API/Insight/RedClaw 仓库。
- 不写 gateway authorization facts、权限矩阵或 runtime authorization audit。
- 不输出 token、Cookie、私有 URL、真实完整组织树、真实用户明细、手机号、邮箱或完整响应体。

## Impact

- Admin operator 可在触发 publish 前看到组织主数据质量状态和阻断原因。
- 质量 readiness 只服务 Admin producer 排障和前置判断，不是授权事实，也不能证明 API/Gateway/Insight 成功。
- 后续 manual publish console、run diff/retry readiness 可以消费该只读信号，但本 change 不改变它们的执行语义。
