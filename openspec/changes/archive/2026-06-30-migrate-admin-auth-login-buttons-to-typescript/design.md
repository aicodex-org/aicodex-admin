## Context

`migrate-admin-auth-support-components-to-typescript` 已把 `Provider`、`ProviderButton`、登录可见性和小型认证页迁移到 TS/TSX，并保留登录按钮、WeCom panel、Web3 等组件作为 deferred。当前 `ProviderButton.tsx` 仍通过 JS/TS 共存边界导入这些按钮组件，导致登录入口的 props、provider 数据和 SDK 全局对象缺少局部类型约束。

本 change 在最新 `hfl-test-base` 上继续迁移 auth 登录按钮文件；并行工作覆盖后台路由页、Provider 配置、Application/Syncer 编辑页，当前写集不得越过 `web-admin/src/auth` 登录按钮和对应测试。

## Goals / Non-Goals

**Goals:**

- 迁移 `LoginButton` 和低风险第三方登录按钮为 `.tsx`，保持无后缀 import。
- 用窄局部类型描述按钮 props、Provider 记录、应用对象和第三方 SDK/window 全局对象。
- 对 WeCom/Web3/panel 等风险较高文件先评估；低风险则迁移，类型洞过大则记录 deferred。
- 让 focused Jest、`yarn typecheck`、增量 TypeScript gate 和 `yarn build` 覆盖最终 JS/TS 共存边界。

**Non-Goals:**

- 不迁移 `LoginPage`、注册/忘记密码/自助登录页、callback、`Auth`、`AuthBackend` 或后台编辑页。
- 不重构授权 URL 生成、provider 可见性、WeCom polling/MFA、Web3 钱包初始化、CAS logout 或后端 API 契约。
- 不引入新依赖，不修改 TypeScript/CRACO/Jest 基建。

## Decisions

- **Mechanical rename first.** 先按 `.js` 到 `.tsx` 迁移，必要时只补 props/interface/declaration，避免把行为重构混入迁移 diff。
- **Shared auth types stay local.** 复用并按需扩展 `AuthTypes.ts`，优先服务 auth login button 组件，不抽象成全仓通用身份模型。
- **SDK globals use narrow declarations.** 对 Telegram、WeCom、WeChat、Web3 等 SDK/window 对象使用最小 declaration 或局部类型；如果 SDK 类型要求牵出主登录页或后端 wrapper，则 deferred。
- **Tests follow touched risk.** 触碰组件已有测试时优先迁为 `.test.tsx`/`.test.ts`；final gate 至少跑 ProviderButton、WeCom panel、Util 和 LoginPage 中现有登录按钮/URL 相关测试，确保不是空跑。

## Risks / Trade-offs

- 第三方登录按钮依赖 provider-specific URL 参数，类型收窄可能暴露历史宽松数据形态 → 只使用兼容 optional 字段，不改变 URL 拼接逻辑。
- Panel/SDK 文件可能包含隐式全局对象或异步 polling 行为 → 低风险机械迁移；遇到大范围类型洞时记录 deferred。
- `LoginPage.js` 仍是主登录页 legacy JS → 保持现状，不为登录按钮迁移扩散到主登录页。
