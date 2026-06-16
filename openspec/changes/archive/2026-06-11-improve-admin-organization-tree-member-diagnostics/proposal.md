## Why

`improve-admin-organization-tree-operations` 已经把 admin 组织树运营页推进到可查看部门树、来源连接、版本、新鲜度和诊断项的状态。验收页面时发现一个新的运营问题：只看部门树可以确认 `PlatformDepartment` 和父子关系，但无法直接判断“部门下成员是否归属正确、离职/禁用/冲突成员是否被诊断出来、成员映射状态是否影响后续 projection”。

这不是要求把成员变成组织树主结构，也不是重新定义跨服务合同。需要的是 admin 内部的只读成员诊断能力，让管理员和研发在组织树运营页中轻量查看部门成员归属和状态，辅助排查同步、生命周期和映射问题。

## What Changes

- 在组织树运营能力中新增只读成员诊断视图，可按部门查看成员摘要和轻量成员列表。
- 在前端提供 `成员视图` 或 `含成员树` 入口，默认仍保持部门树视图，避免大组织下一次性展示全部成员造成噪声和性能风险。
- 成员节点或列表只展示诊断字段：脱敏 display metadata、稳定 subject 标识短显、`lifecycleStatus`、`mappingStatus`、`sourceType`、`sourceConnectionId`、`readModelSource` 和 freshness/lineage 摘要。
- 点击部门时展示成员统计，点击成员时展示成员诊断详情；不提供源事实编辑、不写 gateway authorization facts、不要求 Insight fallback。
- 对 disabled/deleted/conflicted/stale/mapping 不确定成员保持 fail-closed 语义：可以进入诊断视图，但不能扩大组织树可见范围、报表 scope 或 projection 输入。

## Capabilities

### Modified Capabilities

- `admin-organization-tree-operations`: 增加 admin 内部组织树成员诊断视图，用于只读查看部门成员归属、生命周期、映射状态和数据质量。

## Impact

- 影响 `aicodex-admin` 后台组织树运营页、诊断 DTO/service、前端详情抽屉和测试。
- 不影响 `aicodex-api` gateway authorization facts、runtime allow/deny 或 admin-to-gateway projection contract。
- 不影响 `aicodex-insight` 的组织树/scope 消费边界；Insight 仍只读消费 admin provider，不本地补算成员、scope、projection 或授权事实。
- 风险主要在成员信息脱敏、分页/懒加载、不要把 displayName 当作 join key，以及不要把成员视图误用为跨服务合同。
