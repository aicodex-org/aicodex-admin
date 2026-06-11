## 60 admin organization-tree smoke runbook

本文只记录 smoke 合同和脱敏步骤。真实地址、token、Cookie、账号、密码、个人信息和完整响应体只能保存在本机私有运维配置或一次性进程内，不写入仓库。

## 字段路径

organization-tree provider 使用 `InsightProviderEnvelope`：

- 顶层读取：`status`、`traceId`、`error`。
- 成功数据读取：`data.organization`、`data.nodes[]`、`data.list[]`、`data.orgVersion`、`data.scopeVersion`、`data.freshness`、`data.generatedAt`、`data.lineage`、`data.readModelSource`。

smoke MUST 从 `data.orgVersion` / `data.scopeVersion` 判断版本字段，MUST NOT 从顶层 envelope 读取。

## 合同 smoke

适用目标：确认 provider 响应合同稳定，不要求非空组织树。

步骤：

1. 使用 60 测试环境别名和私有登录态请求 `GET /api/admin-provider/insight/v1/current-user/organization-tree`。
2. 若 HTTP 200 且 `status=ok`，检查：
   - `data.nodes[]` 存在，可为空。
   - `data.list[]` 存在，可为空。
   - `data.orgVersion` 或 `data.scopeVersion` 至少一个非空。
   - `data.freshness`、`data.generatedAt`、`data.lineage.digest`、`data.readModelSource` 非空。
3. 若 `data.nodes[]` 和 `data.list[]` 都为空，只能记录为空结果合同通过，不能记录为非空组织树能力通过。

## 非空组织树能力 smoke

适用目标：证明 60 admin 当前具备可管理组织树产品能力。

前提：

- 必须使用已知具备可管理组织树的测试账号或受控 fixture。
- 不得使用普通空树账号证明组织树能力稳定。

步骤：

1. 请求 `GET /api/admin-provider/insight/v1/current-user/organization-tree`。
2. 检查 HTTP 200、`status=ok`。
3. 检查 `data.nodes[]` 与 `data.list[]` 均非空，且节点含 `departmentId`、`departmentName`、`parentDepartmentId`、`departmentPath`、`lifecycleStatus`。
4. 检查 `data.orgVersion` 或 `data.scopeVersion`、`data.freshness`、`data.generatedAt`、`data.lineage.digest`、`data.readModelSource` 非空。
5. 只记录节点数量、根/子节点数量、字段存在性和结论，不记录真实部门名、真实人员、手机号、邮箱或完整组织明细。

## fail-closed smoke

适用目标：证明不可信 read model 不会伪装成成功空树。

步骤：

1. 使用受控 fixture 或测试数据构造“scope 指向可见部门，但该部门 lifecycle、SourceConnection 或 read model 不可信”的场景。
2. 请求 organization-tree provider。
3. 期望返回稳定错误，例如 `PROVIDER_UNAVAILABLE`；不得返回 `status=ok + 空 nodes[]`。

## 记录格式

建议记录：

```text
环境：60 测试环境
请求：GET /api/admin-provider/insight/v1/current-user/organization-tree
登录态：私有进程内使用，未写入仓库
结果：HTTP <status>，provider status=<status>
字段：data.orgVersion=<present|empty>，data.scopeVersion=<present|empty>，data.freshness=<present|empty>，data.lineage.digest=<present|empty>，data.readModelSource=<present|empty>
节点：nodes=<count>，list=<count>
结论：合同 smoke 通过/失败；非空能力 smoke 通过/未执行/失败；fail-closed smoke 通过/未执行/失败
```
