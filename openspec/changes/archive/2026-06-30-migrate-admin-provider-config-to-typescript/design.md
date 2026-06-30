## Context

Provider 配置页目前由 `ProviderEditPage.js` 统一承载，并把不同类别 Provider 的字段区域拆到 `web-admin/src/provider/*ProviderFields.js`、`LarkProviderGuide.js`、`LarkProviderUtils.js` 和 `WeComProviderUtils.js`。这些文件同时覆盖 OAuth/OIDC、WeCom、Lark、SAML、MFA、Captcha、Payment、Storage、Web3 等敏感配置字段，迁移必须优先保持现有运行时语义。

当前 `web-admin` 已允许 `.js`、`.ts`、`.tsx` 共存，`ManagementPage.js` 等调用方通过无后缀 import 解析页面。因此本 change 可以只迁移目标文件后缀并补局部类型，不需要改路由、全局壳或 TypeScript 基建。

## Goals / Non-Goals

**Goals:**

- 将 Provider 配置页、Provider 字段组件、Lark/WeCom 配置 helper 迁移为 `.tsx` / `.ts`。
- 为 Provider 记录、字段更新回调、mapping 渲染回调、Lark/WeCom helper 补充足够窄的局部类型。
- 迁移触碰的聚焦测试为 `.test.tsx` / `.test.ts`。
- 保持现有无后缀 import、路由、Provider 字段展示、字段保存和校验行为兼容。

**Non-Goals:**

- 不迁移 `LoginPage.js`、`auth/*`、`ManagementPage.js`、`ApplicationEditPage.js`、`SyncerEditPage.js`、`App.js`、`Setting.js` 或 `BaseListPage.js`。
- 不修改 OAuth/OIDC/WeCom/Lark 授权 URL、回调参数、登录行为、Provider 可见性、后端 API payload 或字段持久化语义。
- 不引入新依赖，不调整 `tsconfig.json`、包管理文件或全局构建配置。

## Decisions

- **使用局部 Provider 类型而不是新建全局模型。** Provider 配置对象包含大量按类别动态扩展的字段；本次迁移只需要描述目标文件读写到的键，使用 `Record<string, unknown>` 叠加常用字段可以控制风险，避免把不完整全局模型误用为后端契约。
- **字段组件保持现有函数式 render API。** `ProviderEditPage` 现在通过 `renderXProviderFields(provider, updateProviderField, ...)` 组合字段区；迁移只补参数和返回类型，不改为 React 组件或 hooks，以避免行为和 diff 放大。
- **测试随触碰文件迁移。** 已覆盖 OAuth/Lark helper 或 guide 的测试同步改为 `.test.tsx` / `.test.ts`，继续验证现有可观察输出和校验结果。
- **保持调用方无后缀 import。** 文件后缀变化依赖现有 TS/JS module resolution，不修改 `ManagementPage.js` 或其它全局路由壳。

## Risks / Trade-offs

- **动态 Provider 字段类型过宽** → 使用局部类型覆盖已读写字段，对真正动态字段保留 `Record<string, unknown>`，避免用错误的精确类型改变运行时处理。
- **JS 调用 TSX/TS 后出现隐式类型洞** → 以 `yarn typecheck` 和 `yarn build` 验证 JS/TS 共存导入边界。
- **敏感 Provider 语义被迁移时顺手改变** → 实施只做机械后缀迁移、局部类型和必要测试适配；验证记录不得包含 token、secret、Cookie、私有 URL、个人邮箱或手机号原值。
