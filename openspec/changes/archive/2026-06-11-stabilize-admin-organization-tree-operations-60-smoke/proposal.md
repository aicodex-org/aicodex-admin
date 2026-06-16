## Why

`improve-admin-organization-tree-operations` 已合入 `test`，admin 后台已经具备组织树总览、诊断、搜索筛选和安全刷新能力。下一步需要把 60 测试环境运行态验证收口成可重复 smoke，避免后续只凭页面截图或普通空树结果误判“组织树运营能力可用”。

本 change 只做 runtime readiness：部署验证、组织树运营页最小 smoke、诊断接口 smoke、安全刷新/重建动作 smoke、验证记录脱敏和可重复 Bruno/runbook。它不扩大组织树功能范围，也不实施成员诊断。

## What Changes

- 固化 admin 组织树运营化能力的 60 smoke 口径：服务健康、页面入口、诊断接口核心字段、非空组织树、普通空树分类、安全刷新/重建动作和审计信号。
- 复用 Bruno 集合补齐可重复 smoke 资产，新增受控 `refresh_read_model` 请求，默认关闭，只有显式开关才允许触发写入型同步路径。
- 更新验证记录，记录脱敏命令、核心响应字段、非空树结果、刷新/重建动作结果和剩余风险。
- 同步组织边界路线清单中 admin 组织树运营化 60 smoke 状态。

## Capabilities

### Modified Capabilities

- `admin-organization-tree-operations`: 补充已合入能力的运行态 smoke readiness 和 60 验证口径。

## Impact

- 影响 OpenSpec 文档、Bruno smoke 集合、验证记录和组织边界路线清单。
- 不改变 admin 组织主模型、组织树 read model、provider contract 或页面功能。
- 不影响 API/gateway；API/gateway 仍只能消费 admin-to-gateway projection contract。
- 不影响 Insight；Insight 仍只读消费 admin/API provider，不 fallback、不本地补算组织树或授权事实。
