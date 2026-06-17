## Context

`improve-admin-enterprise-organization-identity-center` 已把 `/organizations`、`/users`、`/roles`、`/permissions` 接入 `OrganizationIdentityCenter.tsx`，但当前实现主要共享同一套标题、指标、入口和质量提示。四页虽然数据表不同，顶部工作台语义仍偏同质化，且摘要、状态卡、入口、风险列表叠加后让表格位置偏低。主控 60 环境横向核对进一步确认，当前 Admin 多个工作台存在“大标题 + 说明 + KPI 卡片 + 入口卡片 + 风险/配置块 + 表格”的同质化模式，本 change 必须成为组织身份实体页的纠偏样板。

本 change 只在 Admin 前端和 OpenSpec 范围内收口组织身份实体工作台，不改变后端接口、权限 key、真实认证链路或同步执行逻辑。

## Goals / Non-Goals

**Goals:**

- 四类实体页分别体现组织主数据、用户生命周期、角色授权覆盖、权限目录治理的管理语义。
- 四页首屏骨架明显不同：组织是目录健康/边界面板，用户是生命周期/账号状态条，角色是权限风险矩阵，权限是敏感度/引用关系矩阵。
- 工作台顶部更紧凑，保留必要状态和下一步入口，但让原列表更早进入首屏。
- 通过配置驱动复用底层渲染能力，同时用实体级 `layoutKind`、指标 key、动作 key 和风险 key 约束不同骨架，防止再次同质化。
- 同步 zh/en i18n，并用 `.test.tsx` 覆盖关键差异化、配置 key 去重、列表可达性和 locale 完整性。

**Non-Goals:**

- 不新增后端全量统计、风险扫描、目录质量计算或用户生命周期计算。
- 不触发组织同步、认证刷新、授权发布、Gateway projection publish/cleanup。
- 不迁移四个 legacy 列表页到 TSX，不清理无关 lifecycle warning 或 `/permissions` 既有 Cell key warning。

## Decisions

1. 使用实体 profile 配置驱动差异化内容和骨架。
   - 选择：在 `OrganizationIdentityCenter.tsx` 中为 `organizations`、`users`、`roles`、`permissions` 提供不同 `layoutKind`、title、description、metric keys、primary actions 和 risk signals。
   - 原因：当前工作台本身已是共享组件，继续使用配置可以控制 diff 范围；差异化不只由文案表达，还由 `layoutKind` 决定首屏结构。
   - 替代：为每个列表页写独立工作台组件。该方式语义更直观，但会复制 i18n、当前视图计数和列表包裹逻辑，后续一致性维护成本更高。

2. 压缩顶部层级，弱化实现痕迹说明。
   - 选择：移除“原列表仍是操作入口”“不包装成全量事实”等大段说明，只保留“当前视图”“已加载”等短状态标签；入口按实体主任务收敛到少量高价值跳转。
   - 原因：企业控制台应让管理员快速判断状态并进入操作，而不是解释实现限制。
   - 替代：保留完整十入口 action grid。该方案覆盖面广，但会继续把首屏空间让给说明区。

3. 测试先刻画“差异化”和“列表可达”。
   - 选择：迁移并扩展 `OrganizationIdentityCenter.test.js` 为 `.test.tsx`，断言四类页面不复用同一套 `layoutKind`、标题、指标 key、行动 key 和风险 key，列表 children 可见，zh/en locale key 完整。
   - 原因：这是本次产品化 polish 的核心可观察行为，比只测渲染快照更能防回退。

4. 浏览器验收记录表格坐标。
   - 选择：local-dev 验证时在 1440x900 桌面和移动 UA 访问四页，记录 `.ant-table` 或列表核心入口的 `getBoundingClientRect().top`，并保存截图。
   - 原因：主控反馈明确指出表格 y 坐标过深；最终报告必须有 DOM/坐标证据，而不是只说“视觉通过”。

## Risks / Trade-offs

- [Risk] 前端摘要仍来自当前分页和已加载行，可能被误解为后端全量治理统计。
  Mitigation: 使用短状态标签表达“当前视图/已加载”，不写全量事实，也不大段解释实现限制。
- [Risk] 配置驱动可能再次积累重复 key 或缺失 i18n。
  Mitigation: 测试遍历实体 profile 的 `layoutKind`、metric/action/risk key 和可见文案，并同时初始化 zh/en locale。
- [Risk] 顶部压缩后部分入口减少，管理员需要从侧栏进入低频页面。
  Mitigation: 保留与当前实体最相关的主行动入口；既有侧栏和组织配置导航不变。
