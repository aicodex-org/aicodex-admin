## Context

auth core flow 文件处在登录、注册、忘记密码、OAuth/OIDC callback、SAML callback、CAS logout 和 MFA 主链路。当前 change 的目标是降低 JS/TS 混合成本，而不是调整认证产品行为或后端契约。

## Decisions

- 以文件后缀迁移和最小类型补齐为主：包含 JSX 的文件迁为 `.tsx`，纯逻辑文件迁为 `.ts`。
- 在 `web-admin/src/auth/AuthCoreTypes.ts` 内提供 auth 局部 legacy 类型边界，用于承接历史动态 props、state、Provider、callback、MFA 和 API response 字段。
- 对登录按钮、登录 panel、Web3Auth、Provider support、Prompt/Consent/Result/OIDC discovery 和全局壳层保持只读，必要兼容通过本 change 迁移文件的导出类型或局部 cast 处理。
- 保持 extensionless import、默认导出、路由调用方和后端 API payload 兼容。

## Risks

- 认证流程依赖大量历史动态字段，本 change 使用局部 `LegacyAny`/`LegacyRecord` 收敛类型边界，后续仍可按页面或组件继续细化。
- 未执行浏览器 smoke 和 coverage；本 change 使用聚焦 Jest、`yarn typecheck`、增量 TS gate 和 `yarn build` 覆盖机械迁移风险。
