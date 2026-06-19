## Context

当前身份源菜单包含身份源中心、企业微信同步、飞书同步、组织同步密钥和同步器。用户目标是分多个 OpenSpec change 持续推进这些入口的渐进 TypeScript 迁移，而不是一次性全站 JS 清零。

`AuthSourceCenter` 的现状：

- 是 `/providers` 页面顶部的只读摘要区块，由 `ProviderListPage.js` 渲染。
- 输入仅来自已加载的 Provider 列表和 loading 状态。
- 通过本地 helper 归类企业微信、飞书/Lark、OIDC provider，展示启用/待补全/未启用状态、配置完整度和只读诊断入口。
- 不发起后端请求、不触发同步、不触发 OAuth/OIDC 授权流程。

因此本 change 可以只迁移 `AuthSourceCenter` 和测试，不需要迁移 `ProviderListPage.js` 或 Provider 编辑页。

## Goals / Non-Goals

**Goals:**

- 将 `AuthSourceCenter` 迁移为 TSX，并为组件 props、Provider 输入、认证源定义、状态卡片和风险项建立局部类型。
- 保持现有 UI 文案、诊断入口、只读提示、helper 输出和测试覆盖语义不变。
- 将对应测试迁移为 `.test.tsx`，符合 `web-admin/AGENTS.md` 对 TSX 组件测试后缀的要求。
- 保持 JS/TSX 共存：`ProviderListPage.js` 继续导入迁移后的 TSX 组件。

**Non-Goals:**

- 不迁移 `ProviderListPage.js`、`ProviderEditPage.js`、`SyncerListPage.js`、`SyncerEditPage.js`、组织同步密钥页面或飞书同步主页面。
- 不改变企业认证中心导航、Provider 表格列、权限、后端 API、i18n key、样式系统或 provider 配置契约。
- 不新增真实运行态诊断聚合接口，不触发同步、登录、授权刷新或真实探测。

## Decisions

### Decision 1: Direct TSX migration for the small component

`AuthSourceCenter` 只有约 300 行，且主要是纯展示和本地归类 helper。直接将文件改为 `.tsx` 比新增 wrapper 更清晰，也能减少 JS/TS 混合边界。

### Decision 2: Keep ProviderListPage in JS

`ProviderListPage.js` 是 Provider 管理旧页面，包含表格、权限、编辑/删除和身份资产详情抽屉。它不是本次低风险入口，强行迁移会扩大行为风险和 review 面。本 change 只验证 JS 页面导入 TSX 组件的共存路径。

### Decision 3: Type local data shapes only

只为本组件需要的 Provider 字段和派生状态补局部接口，不把 Provider 全局模型或后端 client 一起迁移。这样可以避免引入不完整全局类型，后续迁移 Provider 管理页时再沉淀更通用的模型。

## Risks / Mitigations

- **风险：TSX 迁移暴露历史 Provider 字段不完整。** 缓解：Provider 输入类型只声明本组件读取的可选字段，并保留现有 fallback 行为。
- **风险：测试迁移产生 Jest/TS 互操作问题。** 缓解：迁移既有测试断言，运行聚焦 Jest、`yarn typecheck` 和增量 TS gate。
- **风险：误改 Provider 主表行为。** 缓解：不迁移 `ProviderListPage.js`，仅保持默认导入和命名导出兼容。

## Migration Plan

1. 迁移测试文件后缀到 `.test.tsx`，保持既有测试语义。
2. 将 `AuthSourceCenter.js` 重命名为 `.tsx`，补齐局部类型并处理 JSX/Ant Design 类型。
3. 运行增量 TypeScript 门禁、`yarn typecheck`、聚焦 Jest、`yarn build`。
4. 更新验证记录，进入归档前 review。
