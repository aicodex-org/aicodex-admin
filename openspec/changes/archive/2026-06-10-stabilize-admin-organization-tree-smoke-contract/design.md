## Goals

1. 让 organization-tree smoke 能稳定判断成功响应是否具备版本、新鲜度和 lineage。
2. 让业务空树与不可信 read model 可区分，避免 `status=ok + 空 nodes` 掩盖生命周期或来源连接问题。
3. 保持 admin / API / Insight 既有组织边界不变。

## Decisions

### 1. 响应字段路径

organization-tree provider 继续使用现有 `InsightProviderEnvelope` 传输层：

- 顶层：`status`、`traceId`、`data`、`error`。
- 成功数据：`data.organization`、`data.nodes[]`、`data.list[]`、`data.orgVersion`、`data.scopeVersion`、`data.freshness`、`data.generatedAt`、`data.lineage`、`data.readModelSource`。

因此 smoke 应读取 `data.orgVersion` / `data.scopeVersion`，不是顶层 `orgVersion` / `scopeVersion`。

### 2. 空树成功 envelope

无可管理节点可以返回空 `nodes[]` 和空 `list[]`，但这只是业务空结果。只要 provider 返回 `status=ok`，`data` 必须有：

- `freshness`
- `generatedAt`
- `lineage.digest`
- `readModelSource`
- `orgVersion` 或 `scopeVersion` 至少一个非空

当没有可用 `OrgSyncBatch.OrgVersion` 或平台部门快照版本时，provider 可以派生 `scopeVersion`。该派生版本用于 smoke/read model 诊断，不等同于 gateway projection 的 int64 `orgVersion`，也不表示组织事实发生变化。

### 3. 不可信数据 fail closed

如果后端 scope 已确认有可见部门，但 read model 因这些部门生命周期、SourceConnection 状态、新鲜度或结构不可信而过滤为空，provider 必须返回 `PROVIDER_UNAVAILABLE` 或等价稳定错误，不能把该场景伪装成业务空树。

如果 scope 本身没有任何可见部门或下属部门，返回空 `nodes[]` 是业务空结果，可以保持 `status=ok`。

### 4. Smoke runbook

60 admin organization-tree smoke 分两类：

- 合同 smoke：可以使用普通账号，验证 `data` 字段路径、版本、新鲜度、lineage 和 readModelSource，不要求非空树。
- 能力 smoke：必须使用已知具备非空可管理组织树的测试账号或受控 fixture，验证 `nodes[]` / `list[]` 非空和父子关系。

验证记录只写环境别名、HTTP path、状态码、脱敏字段和结论，不写 token、Cookie、真实人员、完整组织明细、真实地址或完整响应体。
