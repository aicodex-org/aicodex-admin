## 1. 提案和边界确认

- [x] 1.1 盘点现有组织树运营 DTO/service、PlatformUser/ExternalIdentity/部门成员关系模型，确认可复用字段和脱敏口径。
- [x] 1.2 确认成员诊断首版交互：默认部门树、成员视图入口、成员详情抽屉、分页或懒加载策略。
- [x] 1.3 确认边界：成员诊断视图不写源事实、不写 gateway 授权事实、不作为 Insight fallback 或跨服务合同。

## 2. 后端成员诊断能力

- [x] 2.1 定义成员诊断 DTO，包含部门成员摘要、轻量成员项、脱敏 lineage/freshness 和稳定 subject 标识短显。
- [x] 2.2 实现 admin-only 成员诊断查询，复用平台组织主模型、部门成员关系、ExternalIdentity、SourceConnection 和 OrgSyncBatch lineage。
- [x] 2.3 实现成员 fail-closed 分类：disabled/deleted/conflicted/stale/mapping 不确定只进入诊断，不扩大可见组织树或 scope。
- [x] 2.4 增加分页或按部门懒加载，避免大组织下一次性返回全部成员。

## 3. 前端成员视图

- [x] 3.1 在组织树运营页增加 `成员视图` 或 `含成员树` 入口，默认仍为部门树。
- [x] 3.2 展示部门成员摘要和成员轻量节点，成员视觉上区别于部门节点。
- [x] 3.3 实现成员详情抽屉，展示生命周期、mapping、sourceConnection、readModelSource、freshness 和脱敏 lineage。
- [x] 3.4 覆盖加载态、空成员部门、异常成员、权限不足和接口失败状态。

## 4. 测试和验证

- [x] 4.1 补后端测试：成员摘要、按部门成员查询、异常成员 fail-closed、脱敏和权限拒绝。
- [x] 4.2 补前端测试：视图切换、成员摘要、成员详情抽屉、默认不全量展开、空态/错误态。
- [x] 4.3 跑受影响 Go package 覆盖率；实施代码覆盖率目标 85%，不足时记录原因和补救路径。
- [x] 4.4 跑受影响前端测试、lint 或 build。
- [x] 4.5 在 60 测试环境使用已知非空组织树测试账号或受控 fixture 做 smoke，记录脱敏结果。本轮无已确认 60 环境和测试账号，记录为 N/A。

## 5. 归档准备

- [x] 5.1 更新 verification，记录验证命令、覆盖率、60 smoke 结果和剩余风险。
- [x] 5.2 跑 `openspec validate improve-admin-organization-tree-member-diagnostics --strict`、`openspec validate --specs --strict` 和 `git diff --check`。
- [x] 5.3 完成归档前 review，确认主规格同步、边界表述和敏感信息脱敏。
