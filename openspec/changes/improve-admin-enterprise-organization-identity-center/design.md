## Context

现有企业认证中心导航已经把组织、用户、部门、目录质量和树操作放在“组织身份”分组，把角色/权限放在“权限治理”分组，把企业微信/飞书组织同步放在“身份认证”分组。这个 IA 对菜单清晰，但列表页本身仍停留在“配置列表”形态，缺少面向组织身份治理的首屏摘要和跨入口引导。

组织身份域不能把当前页数据包装成后端全量事实。当前 change 只基于列表页已有 `pagination.total`、当前页行数、组织选择、账号上下文和既有只读页面入口展示“当前视图”口径，避免引入真实聚合接口或新的同步/授权执行行为。

## Goals / Non-Goals

**Goals:**

- 在组织、用户、角色、权限列表页前方提供统一的组织身份工作台壳层。
- 让管理员能快速判断当前视图范围、已加载行数、目录/权限治理下一步入口和需要检查的配置缺口。
- 保持列表页原有新增、编辑、删除、上传、筛选、分页、排序、导入和表格列行为不变。
- 保持运行时侧栏与组织配置页导航树复用同一 IA，并通过测试覆盖关键叶子 key。

**Non-Goals:**

- 不新增后端组织身份聚合接口，不做跨租户全量统计。
- 不触发组织同步、Gateway projection publish/cleanup/receipt、OAuth/OIDC 回调、会话清理、令牌签发或验证码重发。
- 不迁移既有大型 JS 列表页为全量 TSX，不做无关视觉重构。
- 不改变角色、权限、组织、用户的后端数据模型或 API 契约。

## Decisions

### 1. 新增共享 TSX 壳层，列表页保持 JS 类组件

新增 `OrganizationIdentityCenter.tsx` 作为展示型组件，接收页面类型、当前列表 total、当前页行数、组织范围和可用入口。既有 JS 列表页只负责传入当前状态，并继续通过原 `renderTable()` 返回原表格。

这样可以按渐进 TypeScript 规则新增 TSX，又避免把大型列表页一次性迁移为 TSX 或重写数据拉取逻辑。

### 2. 摘要口径限定为当前视图

工作台文案和摘要明确使用“当前视图”“当前筛选”“已加载行数”等口径。`pagination.total` 仅表示当前接口分页 total；当前页行数仅表示前端已加载表格行数。目录质量、组织树操作、认证源同步和权限治理都通过既有路由入口承接。

### 3. IA 使用稳定叶子 key

如果增强组织身份域入口，必须保持 `/organizations`、`/groups`、`/users`、`/organization-tree-operations`、`/organization-directory-quality`、`/providers`、`/wecom-org-sync`、`/feishu-org-sync`、`/roles`、`/permissions` 等叶子 key 不变。组织配置页导航树继续由 `buildEnterpriseNavigationConfigTreeData()` 从运行时分组生成，避免双份 IA 漂移。

## Risks / Trade-offs

- [Risk] 新增 TSX 被 JS 列表页导入可能暴露类型或构建互操作问题。→ 运行 `yarn typecheck`、聚焦 Jest 和 `yarn build`。
- [Risk] 摘要被误解为后端全量治理事实。→ 文案和测试都强调当前视图/当前列表口径。
- [Risk] 多个列表页接入壳层可能影响表格密度或窄屏滚动。→ 使用现有企业认证中心布局和浏览器桌面/窄屏复验。
- [Risk] 入口变多导致导航权限过滤漂移。→ 聚焦测试覆盖运行时侧栏、配置树和稳定叶子 key。

## Migration Plan

1. 创建 OpenSpec artifacts 和 delta specs。
2. 先补组织身份中心组件/导航测试，确认目标行为红灯。
3. 新增共享 TSX 组件并接入组织、用户、角色、权限列表页。
4. 更新 zh/en locale、必要样式和聚焦测试。
5. 运行 OpenSpec、diff check、typecheck、Jest/coverage、build 和 local-dev 浏览器复验。

## Open Questions

- 暂无阻塞问题。若后续需要跨租户真实目录健康总览，应另起只读聚合接口 change。
