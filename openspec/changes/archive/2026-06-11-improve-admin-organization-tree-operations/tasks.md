## 1. 现状确认和接口收口

- [x] 1.1 盘点现有 `organization-tree` read model/service、`OrganizationManagementScopeService`、WeCom 同步页、菜单路由和权限配置，确认运营页复用点。
- [x] 1.2 确认首版菜单位置、目标用户、权限判断和组织选择方式；默认只允许全局管理员或目标组织管理员访问。
- [x] 1.3 确认刷新动作首版范围：只刷新诊断状态、触发 read model builder，还是复用现有 source sync batch；记录不做源事实编辑的边界。

## 2. 后端诊断能力

- [x] 2.1 定义组织树运营诊断 DTO，包含节点统计、filtered 统计、`orgVersion/scopeVersion`、`freshness`、`generatedAt`、`readModelSource`、SourceConnection 状态、最新 sync batch 和脱敏 lineage。
- [x] 2.2 实现 admin-only 诊断接口，复用平台组织树 read model 和 scope 计算口径，不新增独立 legacy `Group.Manager` 授权路径。
- [x] 2.3 实现空树分类：业务空结果、测试数据缺口、不可信 read model，并返回稳定 reason。
- [x] 2.4 实现异常摘要：disabled/deleted/conflicted/stale/mapping 不确定/SourceConnection 不可信节点和关系只能进入诊断，不得扩大可见范围。
- [x] 2.5 实现组织树节点搜索和筛选参数，支持稳定 ID、来源 ID、sourceConnection、lifecycle、mappingStatus、freshness、readModelSource。

## 3. 安全刷新和审计

- [x] 3.1 实现“刷新状态”只读动作，确保不写组织主数据、gateway 授权事实或 Insight 报表数据。
- [x] 3.2 实现受控 read model 重建/刷新动作，走幂等 builder、source adapter 或 sync batch 路径，并返回 trace/task 状态。
- [x] 3.3 为刷新、重建、拒绝和失败写入结构化审计日志，包含 traceId、actor、organization、operation、status、reason 和脱敏 lineage。
- [x] 3.4 对刷新动作补并发/重复触发保护，避免同一组织重复生成冲突任务或覆盖仍可信的版本。

## 4. 前端运营页

- [x] 4.1 新增 admin 组织架构树运营页面和菜单/路由入口，保持与现有 `web-admin` React/Ant Design 页面风格一致。
- [x] 4.2 展示组织树摘要卡片：节点数、异常数、`freshness`、`orgVersion/scopeVersion`、`readModelSource`、最新同步批次和 SourceConnection 状态。
- [x] 4.3 展示树形或表格节点列表，支持搜索、状态筛选、来源筛选和节点详情抽屉。
- [x] 4.4 展示空树分类和修复指引，避免把普通空树当成组织树能力通过。
- [x] 4.5 接入刷新状态和受控重建/刷新动作，提供 loading、成功、失败、权限不足和重复触发状态。

## 5. 测试

- [x] 5.1 补后端单测：权限拒绝、诊断摘要、空树分类、异常节点 fail closed、direct leader 不扩成部门子树。
- [x] 5.2 补后端单测：搜索筛选、SourceConnection stale/disabled、latest sync batch 选择、审计脱敏、刷新动作幂等。
- [x] 5.3 补前端测试：页面加载、摘要展示、空态/错误态、搜索筛选、刷新动作、无权限状态。
- [x] 5.4 跑受影响 Go package 覆盖率，记录实施代码覆盖率是否达到 85%；无法达到时说明缺口和补救路径。
- [x] 5.5 跑受影响前端测试、lint 或构建检查，确认新增页面不破坏现有后台。

## 6. 验证和交接

- [x] 6.1 在 60 环境使用已知具备非空组织树的测试账号或受控 fixture 验证运营页和诊断接口：节点非空、版本/freshness/lineage 存在、SourceConnection 可信。
- [x] 6.2 验证刷新或重建动作返回 trace/task 状态并产生脱敏审计日志；不验证或记录真实 token、Cookie、手机号、邮箱或完整组织明细。
- [x] 6.3 更新 verification，记录命令、测试对象、覆盖率、60 smoke 结果、剩余风险和 owner 分类。
- [x] 6.4 跑 `openspec validate improve-admin-organization-tree-operations --strict`、相关测试和 `git diff --check`。
- [x] 6.5 交接给 API/Insight agent：本 change 不新增 API 直连 admin 组织树 JSON 的路径，也不要求 Insight fallback。
