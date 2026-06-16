## Context

Admin 企业认证中心路线已经落地总览 Shell、认证源中心和应用接入中心，但三页仍各自拼装 AntD Card、Row、Col 和局部 CSS。页面虽然可用，但状态摘要、风险摘要、配置入口和列表区域缺少统一工作台层级，用户难以快速判断“现在状态如何、风险在哪里、下一步做什么”。

本轮不把“更好看”理解为装饰性视觉换肤，而是把已有页面做成企业身份治理控制台：稳定、专业、可扫描，并围绕治理闭环组织信息。

## Goals / Non-Goals

**Goals:**

- 为三页提供轻量共享工作台组件，统一页面画布、页头、摘要/状态、风险/待办、入口网格和内容分区。
- 让每页首屏回答明确的操作问题：总览看跨域治理态势，认证源看身份源接入和诊断，应用接入看应用配置缺口和入口分流。
- 减少重复 CSS 和松散 AntD Card 堆叠，保留 8px 以内圆角、清晰边界、低阴影和响应式约束。
- 保持现有只读推导和既有列表/表格行为不变。

**Non-Goals:**

- 不新增真实聚合接口，不修改 OAuth/OIDC、Provider、同步、授权、Gateway projection 或密钥相关执行逻辑。
- 不引入新 UI 库，不做营销式 hero、装饰背景、orb/bokeh 或大面积单色渐变。
- 不迁移三页为全量 TSX；只新增必要共享 TSX 组件。

## Decisions

### 1. 新增共享 TSX 展示组件，而不是继续复制页面 CSS

新增 `web-admin/src/common/EnterpriseIdentityConsoleLayout.tsx`，提供 `EnterpriseIdentityConsolePage`、`EnterpriseIdentitySummaryStrip`、`EnterpriseIdentityStatusGrid`、`EnterpriseIdentityActionGrid`、`EnterpriseIdentityRiskList` 和 `EnterpriseIdentitySection`。三页仍保留各自数据推导和业务文案，只把通用控制台结构抽出。

替代方案是只改 `App.less`。该方式可以快速改变外观，但不能解决页面角色、风险/入口结构和重复实现问题，因此不作为主方案。

### 2. 产品化结构优先于装饰视觉

总览页使用跨域摘要条、治理状态卡、风险待办和能力入口；认证源中心使用接入摘要、三类认证源状态、同步/授权诊断和失败摘要；应用接入中心使用接入摘要、应用卡、风险摘要和配置入口。共享组件只提供结构和视觉约束，页面仍显式定义“下一步动作”文案。

### 3. 保持只读安全边界

所有新增入口继续跳转既有路由，不触发同步、授权刷新、回调探测、密钥写入或 Gateway projection 执行。页面文案明确当前摘要来自只读状态、当前列表视图或既有配置页。

## Risks / Trade-offs

- [Risk] 新增 TSX 共享组件可能暴露 JS/TS 互操作问题。→ 运行 `yarn typecheck`、聚焦 Jest 和 `yarn build` 验证。
- [Risk] 页面文案增强可能带来中英文模式不一致。→ 本轮遵循现有三页中文硬编码模式，不扩大 i18n 迁移；若后续要求语言模式完整一致，应单独开展 i18n 梳理。
- [Risk] 前端摘要仍不是后端全量聚合。→ 页面持续标注只读/当前视图/以既有页面为准，不把推导结果包装成真实运行事实。

## Migration Plan

1. 新增共享 TSX 布局组件和聚焦测试。
2. 逐页替换重复页面结构，保持原有数据推导、路由和列表行为。
3. 更新 CSS 为统一控制台视觉系统，删除或收敛重复 page-specific 样式。
4. 运行 OpenSpec、typecheck、聚焦测试/coverage、build 和浏览器验证。

如需回滚，可移除共享组件并恢复三页原有 JSX/CSS；本 change 不包含数据库、接口或后端行为迁移。

## Open Questions

- 暂无阻塞问题。后续若需要跨租户/全量真实聚合摘要，应另起后端只读聚合接口 change。
