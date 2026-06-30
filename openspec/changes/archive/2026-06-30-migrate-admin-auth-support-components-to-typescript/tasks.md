## 1. OpenSpec 和基线

- [x] 1.1 创建并校验 `migrate-admin-auth-support-components-to-typescript` change artifacts
- [x] 1.2 确认工作分支基于 `origin/hfl-test-base`，且不触碰历史残留 active changes

## 2. P0 auth/provider support 迁移

- [x] 2.1 迁移 `Provider`、`ProviderButton`、`SigninMethodChoice`、`LoginLanguage`、`LoginPageVisibility`
- [x] 2.2 迁移 `MfaSetupPage`、`PromptPage`、`ConsentPage`、`ResultPage`、`OidcDiscoveryPage`
- [x] 2.3 保持登录/OIDC/Provider 可见性、授权 URL、回调参数和 API 契约不变

## 3. 小型登录按钮组件

- [x] 3.1 评估并迁移低风险登录按钮组件
- [x] 3.2 对类型洞过大的登录按钮组件记录 deferred，避免拖慢 P0

## 4. 测试迁移

- [x] 4.1 迁移触碰组件对应 Jest 测试为 `.test.ts` 或 `.test.tsx`
- [x] 4.2 聚焦覆盖 `Provider`、`ProviderButton`、`SigninMethodChoice`、`LoginLanguage`、`LoginPageVisibility`、`WeComLoginPanel`

## 5. 验证与交付

- [x] 5.1 运行 `openspec validate migrate-admin-auth-support-components-to-typescript --strict`
- [x] 5.2 运行 `git diff --check origin/hfl-test-base..HEAD`
- [x] 5.3 运行触碰的 auth/provider 聚焦 Jest 测试
- [x] 5.4 运行 `yarn typecheck`
- [x] 5.5 运行 `node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`
- [x] 5.6 运行 `yarn build`
- [x] 5.7 提交并推送工作分支，回传主控所需摘要

## Deferred

- 小型登录按钮组件暂不迁移：这些组件均由 `ProviderButton.tsx` 通过 JS/TS 共存边界继续导入；本次优先完成 P0 support 组件和测试迁移，避免把第三方按钮/SDK 类型洞扩入同一 change。
- `WeComLoginPanel.js` 暂不迁移：聚焦 Jest 已覆盖该组件；生产组件迁移会牵出 intent/polling/MFA mock 的大面积类型工作，留给后续独立 auth button/panel 迁移。
