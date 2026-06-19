## Context

当前“组织同步密钥”页面由 `OrganizationSyncApiKeyListPage.js` 实现，继承既有 `BaseListPage`，通过 `OrganizationSyncApiKeyBackend.js` 调用组织同步 API Key 管理接口。页面包含：

- 组织筛选和默认组织判断。
- 创建密钥弹窗、过期时间选择和非 `built-in` 组织校验。
- 创建/轮换后的一次性明文展示与复制。
- 列表列渲染、状态 tag、最近使用审计字段和操作按钮。

页面没有专属测试，且 backend client 也缺少类型约束。本次迁移需要在不改变运行时行为的前提下补齐类型和聚焦测试。

## Goals / Non-Goals

**Goals:**

- 将组织同步密钥页面迁移为 `.tsx`，为 props、state、API Key 记录、草稿和后端响应建立局部类型。
- 将组织同步密钥 backend client 迁移为 `.ts`，导出页面可复用的请求/响应类型。
- 保持 JS/TS 共存：`ManagementPage.js` 和其它历史 JS 文件继续按同名模块导入页面。
- 补充聚焦测试，覆盖页面关键展示、非 `built-in` 保护和 backend endpoint/method/header 行为。
- 运行增量 TypeScript 门禁、`yarn typecheck`、聚焦 Jest、`yarn build` 和 OpenSpec 校验。

**Non-Goals:**

- 不改变组织同步 API Key 的后端模型、API、权限、审计、密钥生成、哈希存储或同步读取行为。
- 不归档或重写 `add-organization-sync-api-keys` active change 的功能 spec。
- 不迁移 `BaseListPage.js`、`ManagementPage.js`、`OrganizationSelect`、同步器列表页、飞书同步主页面或同步器编辑页。
- 不调整页面视觉设计、表格列顺序、文案、i18n key、导航和真实密钥展示规则。

## Decisions

### Decision 1: 直接迁移页面文件为 TSX

页面是独立路由入口，当前导出默认类组件。直接重命名为 `.tsx` 并补局部类型，能验证历史 JS 路由导入 TSX 页面，同时避免新增 wrapper 造成双入口。

### Decision 2: Backend client 同步迁移为 TS

页面的类型主要来自组织同步 API Key 响应。把 `OrganizationSyncApiKeyBackend.js` 一起迁移为 `.ts`，可以集中定义 `OrganizationSyncApiKeyRecord`、mutation payload 和通用响应类型，减少页面内重复 shape。

### Decision 3: 保留 BaseListPage 继承

`BaseListPage` 是历史 JS 基类，迁移它会扩大范围。本 change 只在当前页面用局部接口和必要类型断言包住 `state`、`props`、`fetch` 和表格回调，保持继承关系和分页/search helper 行为不变。

## Risks / Mitigations

- **风险：历史 JS 基类没有类型，导致 TSX 迁移需要过多 `any`。** 缓解：限定 `BaseListPage` 交互面，使用局部 props/state 接口和 `unknown`/窄类型 helper；如必须使用 `any`，仅用于继承旧 JS 基类的边界并在验证记录说明。
- **风险：测试迁移时误触真实 API。** 缓解：mock backend client 和 `fetch`，只验证 URL/method/header/payload 与页面可观察行为。
- **风险：一次性明文展示规则被类型化时误改。** 缓解：测试覆盖创建/轮换响应里的 `secret` 只在弹窗展示，列表数据和 backend list response 不应要求明文字段。

## Migration Plan

1. 创建 proposal、design、tasks 和 `web-admin-incremental-typescript` spec delta。
2. 完成实施前 review，确认 active `add-organization-sync-api-keys` 只作为现有功能背景，不作为本 change 归档对象。
3. 迁移 backend client 到 `.ts`，导出记录和响应类型。
4. 迁移页面到 `.tsx`，补局部类型并保持默认导出、路由导入和表格行为。
5. 新增聚焦测试并运行 TypeScript/Jest/build/OpenSpec 校验。
6. 完成归档前 review、archive、单 commit closeout，并保持 `push_test=false`。
