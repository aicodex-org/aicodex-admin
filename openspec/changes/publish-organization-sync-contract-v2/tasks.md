## 1. Contract 与 current snapshot loader

- [x] 1.1 定义 contract v2 DTO、稳定错误码、source connection 选择和 deterministic digest helper，确保 DTO 不包含 secret/config ref/PII 字段。
- [x] 1.2 实现 key-bound organization 的 current source snapshot loader，校验 active/fresh SourceConnection、current OrgSyncBatch、source org version/batch 和同组织/同来源边界。
- [x] 1.3 增加 zero/multiple source、stale/disabled connection、missing batch、version/lineage mismatch 和 deterministic digest 单元测试。

## 2. 目录关系构建

- [x] 2.1 从 PlatformDepartment 构建 current departments，保留 external department、parent、lifecycle/mapping/source version/batch 并稳定排序。
- [x] 2.2 从 PlatformMembership、PlatformUser、confirmed ExternalIdentity 和 PlatformApiUserMapping lineage 构建 multi-department member relations，保留 source-scoped main、lifecycle/mapping、role/position。
- [x] 2.3 从 PlatformMembership.IsManager 构建显式 departmentLeaderRelations；从 enabled WecomUserDirectLeader + confirmed identity 构建 directLeaderRelations，禁止 display/职位/层级推断。
- [x] 2.4 增加多部门/单 main、department leader、U1→U2→U3 direct chain、disabled relation、identity missing/conflict、legacy manager 不授权和 PII/secret 扫描测试。

## 3. Export 协商与兼容

- [x] 3.1 扩展 `GET /api/organization-sync/export`：默认执行原 legacy builder，`contractVersion=v2` 调用新 builder，未知版本稳定拒绝，并支持显式 `sourceConnectionId`。
- [x] 3.2 增加 controller/router tests，验证 API Key 组织边界、legacy JSON shape、v2 JSON contract、multiple source selection、masked applications 和错误响应。
- [x] 3.3 增加结构化安全日志，只记录 contract/source/version/batch/count/reason 摘要，不记录 API Key、external identity 原文或完整 payload。

## 4. 验证与交接

- [x] 4.1 运行 object/controllers/routers 定向测试、Go formatting/build/test，并修复全部失败。
- [x] 4.2 运行 OpenSpec strict validate，生成 verification.md，记录与 `aicodex-api` contract v2 字段映射和 legacy 回滚步骤。
