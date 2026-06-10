## Agent Handoff

本 change 在 `aicodex-admin` 实施，目标是稳定 admin 侧组织架构树 read model/provider。

### 背景

`define-aicodex-organization-data-and-auth-boundaries` 已经明确 admin 是组织主数据 owner。API/gateway 不直接消费 admin 管理页面组织树 JSON；它消费 admin 发布的 gateway organization projection contract。Insight 只读消费 admin provider，不本地补算组织关系。

### 当前重点

- 优先稳定 `GET /api/admin-provider/insight/v1/current-user/organization-tree`。
- 让组织树优先来自 `PlatformDepartment`、平台关系、lifecycle、SourceConnection 和 OrgSyncBatch lineage。
- 保留旧 `Group` 兼容，但不要把它继续描述成长期权威来源。
- 补版本、新鲜度、lineage 和 readModelSource，方便下游排障。
- 组织树可见范围要复用或抽取 `OrganizationManagementScopeService` 的平台主模型 scope 计算，不要在 `insight_provider.go` 继续维护独立 `Group.Manager` 授权路径。
- `orgVersion` 优先来自最新可用 `OrgSyncBatch.OrgVersion` 或平台部门快照版本；失败、运行中、缺版本或缺完成时间的批次只能作为诊断 lineage，不能覆盖上一份可用版本。
- `InsightProviderEnvelope` 顶层保持 `status/traceId/data/error`；组织树 read model envelope 放在 `data` 内。旧数组 consumer 需要明确兼容响应形态或兼容解包路径，不能让同一 JSON 字段同时既是数组又是对象。
- 直属上级关系只能表达下属用户可见范围，不能扩成整棵部门树；如为了展示返回部门节点，也只能覆盖已确认下属所在的 enabled 部门。

### 不要做

- 不改 API/gateway 授权事实。
- 不让 API 直连 admin 源库或直接解析管理页面组织树 JSON。
- 不在 Insight 侧 fallback 或补算组织树。
- 不提交真实 token、Cookie、手机号、邮箱、客户真实组织明细。

### 建议实施顺序

1. 先跑现有 `admin/controllers/insight_provider_test.go`，记录当前基线。
2. 抽出/新增 platform department tree builder，补纯函数测试。
3. 接入同一后端 scope 计算口径，覆盖管理员、部门负责人、直属上级和普通用户。
4. 改 provider handler/envelope，保留旧 consumer 兼容。
5. 用已知具备非空可管理组织树的 60 测试账号或受控 fixture 跑 smoke；没有这类数据时先记录测试数据缺口，不把普通空树当作通过。
6. 补 verification，记录结果时只用环境别名，不写真实 IP、token、Cookie、手机号、邮箱或完整组织明细。
