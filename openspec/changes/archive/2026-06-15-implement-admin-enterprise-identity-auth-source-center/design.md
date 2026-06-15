## Context

`admin-enterprise-identity-console-shell` 已将 Admin 首页和左侧导航重组为企业认证中心语义，其中“认证源”分组包含 `/providers`、企业微信同步、飞书同步和同步器入口。当前 `/providers` 仍直接展示传统 Provider 表格，缺少认证源视角的启用状态、配置完整度、同步/授权运行状态和诊断入口。

本阶段属于 Admin 企业认证中心路线。目标是在现有前端和只读数据上做产品化，不改变真实认证、同步或 OAuth/OIDC 链路。

## Goals / Non-Goals

**Goals:**

- 将 `/providers` 作为认证源中心主工作区，首屏展示企业微信、飞书、OIDC 等来源的运行概览。
- 基于现有 Provider 列表数据推导启用状态和配置完整度，并提供配置、同步诊断、审计入口。
- 展示最近同步/授权状态与失败摘要的只读占位：当缺少聚合接口时明确为“待巡检/进入诊断”，不伪造真实健康度。
- 保持既有 Provider 表格、分页、筛选、编辑、新增、删除和权限行为兼容。
- 覆盖加载、空态、无数据和窄屏可读性。

**Non-Goals:**

- 不新增或修改真实认证链路、OAuth/OIDC 回调、企业微信/飞书同步执行、密钥写入、生产配置和后端数据模型。
- 不把组织边界路线、组织同步执行治理或 Gateway projection 变更纳入本 change。
- 不实现真实最近失败聚合接口；后续如需精确失败摘要，应另起只读后端接口 change。

## Decisions

### 1. 复用 `/providers` 作为认证源中心主入口

`/providers` 已位于企业认证中心“认证源”分组，并承载 Provider 列表、编辑和权限过滤。直接在该页面上方增加认证源中心工作区，可以保留深链接和现有操作习惯，同时避免新增重复路由。

备选方案是新增 `/identity-sources` 或 `/auth-source-center`。这会引入额外导航 key、权限配置迁移和路由重复，因此本阶段不采用。

### 2. 前端只读聚合现有 Provider 数据

认证源中心根据 `ProviderBackend` 现有列表响应推导每类认证源状态：

- 企业微信：匹配 `WeCom` / `WeChat` 类型或包含 `wecom` 的 provider。
- 飞书：匹配 `Lark` / `Feishu` 类型或包含 `lark` / `feishu` 的 provider。
- OIDC：匹配 `OIDC`、`OpenID` 或相关 providerUrl。

配置完整度只依据前端已有字段是否存在，例如 `clientId`、`clientSecret`、`providerUrl`、`host` 等，不展示字段原值，不写入密钥。

备选方案是新增后端聚合接口一次性返回真实授权、同步和失败摘要。该方案更准确，但会扩大接口、权限和运行态验证范围，不符合本阶段“不改真实认证链路”的约束。

### 3. 运行状态以入口和降级为主

企业微信和飞书同步状态在没有聚合接口时展示“进入同步诊断/待巡检”；OIDC 授权状态展示“进入配置/检查回调配置”。最近失败摘要展示“以同步页面和审计记录为准”，并提供 `/records`、`/wecom-org-sync`、`/feishu-org-sync` 入口。

这样能让管理员看到运营闭环，同时避免把前端推断包装成真实健康度。

### 4. 企业管理台视觉与列表兼容

认证源中心使用 Ant Design 的 `Card`、`Tag`、`Progress`、`Alert`、`Button`、`Space` 等现有组件，布局采用紧凑标题、状态卡片、诊断队列和原 Provider 表格。页面避免 hero、装饰背景和卡片套卡片；移动端卡片和按钮换行，长文本允许断行。

## Risks / Trade-offs

- [状态准确度有限] → 明确标注只读巡检、待诊断和后续接口契约，不宣称真实授权健康度。
- [Provider 类型命名差异] → 使用类型、分类、名称和 URL 的保守匹配；未匹配时展示未启用，不影响表格真实数据。
- [页面首屏信息增多] → 认证源中心只放关键状态和入口，原表格仍在同页下方，保持扫描效率。
- [覆盖率统计只能按组件/测试文件] → 新增组件级测试覆盖状态推导、空态和入口行为，并在 `verification.md` 记录统计对象。

## Migration Plan

1. 新增认证源中心组件和样式，接入 `ProviderListPage.renderTable()` 的现有 Provider 数据。
2. 补充组件测试，先写失败测试再实现状态推导和 UI。
3. 运行 OpenSpec validate、前端聚焦测试、覆盖率/构建、`git diff --check`。
4. 归档后由 archive 同步主规格。

回滚策略：如认证源中心展示异常，可移除 `ProviderListPage` 顶部工作区并保留原 Provider 表格；该 change 不包含数据库、后端接口或认证协议迁移。
