## Context

`/providers` 之前被定义为认证源中心工作区，页面上方渲染 `AuthSourceCenter`，下方再展示 Provider 列表。近期“群组”“应用”“接入中心”等页面已经向公共列表布局收敛，用户反馈当前 Provider 页面仍有大块顶部区域、缺少扩展搜索，且 `ProviderListPage` 仍是 legacy JavaScript。

当前前端已有可复用列表能力：`ListPageTable` 统一表格壳，`EnterpriseListQueryToolbar` 已支持 `advancedFilters` 展开区域，`ListPageIdentityCell` 和 `ListPageRowActions` 已覆盖识别列和行操作。Provider backend 调用仍是既有 `getGlobalProviders` / `getProviders` 分页查询契约，本 change 不改后端 API。

## Goals / Non-Goals

**Goals:**

- 让 `/providers` 成为直接可扫描和操作的 Provider 列表页，移除列表上方认证源概览区。
- 在现有基础查询外增加可展开扩展搜索，覆盖当前列表中可展示和可查询的 Provider 属性。
- 继续复用公共列表配置和 Ant Design 控件，避免新建页面级特殊布局。
- 将 `ProviderListPage` 和对应测试迁移到 TSX / `.test.tsx`，补齐局部类型并保持行为兼容。
- 通过 TDD、类型检查、构建和浏览器验证证明改动可验收。

**Non-Goals:**

- 不新增或修改 Provider 后端接口、分页字段、排序字段或删除语义。
- 不触发或改动真实 OAuth/OIDC、企业微信、飞书授权、组织同步、Gateway projection publish 或真实 provider 探测。
- 不删除 `AuthSourceCenter.tsx` 组件文件；本 change 只要求 `/providers` 不再渲染该顶部区域。
- 不重构 `BaseListPage`、`ProviderBackend`、全局路由壳或导航体系。

## Decisions

1. **使用现有 `EnterpriseListQueryToolbar.advancedFilters` 承载扩展搜索。**
   - 理由：共享工具栏已经提供展开按钮、布局壳和回调，Provider 页面只需要传入受控字段，不需要新增工具栏模式。
   - 替代方案：单独写 Provider 专用搜索区。该方案会复制“群组”页已沉淀的公共模式，也会增加未来列表页一致性维护成本。

2. **扩展搜索仍映射到既有单字段查询契约。**
   - 理由：当前 Provider 列表 API 接受 `field + value` 查询，本 change 不改变后端 contract。基础搜索优先；扩展搜索按固定字段顺序选择第一个有值字段发起查询，重置时清空所有查询状态。
   - 替代方案：前端一次提交多个字段并要求后端支持复合查询。该方案会扩大到接口契约和后端过滤语义，不符合本轮页面体验收敛目标。

3. **Provider 列表默认展示能放下的搜索属性，并保留行操作列。**
   - 理由：用户已经明确希望搜索属性能放下就尽量展示，列表当前可通过紧凑列宽、长文本 Tooltip/ellipsis 和横向滚动兜底承载类别、类型、归属组织、client ID、Provider URL、创建时间与操作。
   - 替代方案：隐藏一部分字段到“对象信息”。该入口之前的信息质量不足，且会增加查找成本。

4. **触碰即迁移 `ProviderListPage` 到 TSX，测试同步迁移。**
   - 理由：相邻的“应用”“群组”“接入中心”页面已经 TS 化，Provider 页面本轮会改动查询状态和表格列，适合低风险渐进迁移。
   - 替代方案：继续在 `.js` 内修改。该方案短期快，但会继续留下和相邻页面不一致的迁移缺口。

## Risks / Trade-offs

- **复合扩展搜索期望与后端单字段契约不一致** → 在 spec 和实现中明确本轮不改 API；扩展搜索一次只映射一个有效字段，后续如需多字段联合查询再单独开后端 contract change。
- **TSX 迁移牵出 legacy `BaseListPage` 类型不完整** → 采用相邻列表页已经使用的 `TypedBaseListPage` 兼容 cast，只为当前页面声明实际用到的 props/state/方法。
- **表格字段增多带来横向滚动** → 桌面端通过列宽收敛和 ellipsis 降低溢出；窄屏允许表格内部横向滚动作为兜底，页面级不应横向溢出。
- **移除顶部概览后失去认证源状态摘要入口** → 本 change 的目标是列表页收敛；如后续需要真实认证源状态工作区，应基于真实聚合数据单独设计入口，不再压在 Provider 列表首屏上方。
