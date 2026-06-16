## Goals

- 使用 60 测试环境验证已合入的 admin 组织树运营化能力在运行态可用。
- 将最小 smoke 固化为可重复 Bruno/runbook，并保持所有验证记录脱敏。
- 明确普通空树只能验证空结果或 fail-closed 分类，不能作为非空组织树能力通过证据。
- 对 `refresh_read_model` 做受控 smoke：默认不触发，只有在私有环境显式设置开关时才运行。

## Non-Goals

- 不新增组织树页面功能，不实现成员诊断。
- 不修改 API/Insight 逻辑。
- 不写 gateway authorization facts。
- 不让 API/gateway 或 Insight 消费 admin 管理页面组织树 JSON。
- 不提交真实环境地址、token、Cookie、账号、手机号、邮箱或完整组织明细。

## Smoke Scope

### 部署和入口

60 smoke 先确认 admin 服务部署到目标分支并 health 通过。页面入口验证只记录“组织树运营入口可访问、树视图和列表视图存在、刷新诊断不报错”等信号，不记录真实组织结构截图或完整响应体。

### 诊断接口

诊断接口 smoke 必须校验：

- HTTP 成功且业务 `status=ok`。
- `summary.orgVersion` 或 `summary.scopeVersion` 至少存在一个。
- `summary.freshness`、`summary.generatedAt`、`summary.readModelSource` 存在。
- `nodes`、`diagnostics`、`sourceConnections` 是稳定数组字段。
- 设置 `organizationTreeOperationsRequireNonEmpty=true` 时，`nodes.length` 必须大于 0；否则失败并记录空树分类，不能伪装通过。

### 安全刷新和重建

`refresh_status` 是只读 smoke，必须返回 `traceId` 和诊断摘要。

`refresh_read_model` 是写入型同步路径入口，Bruno 请求默认由 `organizationTreeOperationsRebuildEnabled=false` 阻断。只有使用已知测试账号、受控 fixture 和明确验证窗口时，才设置为 `true`。响应允许 `accepted`、`running`、`unavailable` 或 `error`，但必须返回 `traceId` 和稳定 `triggerType`；结果应结合日志确认有脱敏审计信号。

### 脱敏

所有文档和最终汇报只写环境别名、命令、HTTP 状态、字段存在性、节点数量级和结果分类；不写可直连地址、凭据、真实人员信息、完整组织树或完整响应体。

## Rollback

如果 smoke 资产误触发不期望的重建路径，可以删除或禁用 `refresh_read_model` Bruno 请求；生产代码不受本 change 影响。
