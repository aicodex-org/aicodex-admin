## ADDED Requirements

### Requirement: Public auth raw scripts TypeScript 生成链路
Admin 前端 SHALL 支持将 `web-admin/public` 中的 public auth raw scripts 通过 TypeScript 源文件维护，并生成最终 served `.js` 文件，同时保持登录 callback 和 provider hint redirect 行为兼容。

#### Scenario: Public auth scripts TS 源维护
- **WHEN** 开发者维护 `web-admin/public/AuthCallbackHandler.js` 或 `web-admin/public/ProviderHintRedirect.js`
- **THEN** 对应逻辑 SHALL 有 TypeScript 源文件作为维护入口
- **AND** TS 源 SHALL 使用局部窄类型描述 window、storage、fetch response、provider、application、OAuth/SAML/CAS callback payload 和 redirect 边界
- **AND** TS 源 SHALL NOT 依赖 bundler-only import/export、React、src auth 模块或新增生产依赖

#### Scenario: Served public JS 路径保持兼容
- **WHEN** public auth scripts 被构建或发布
- **THEN** 最终浏览器可加载的文件 SHALL 保持 `/AuthCallbackHandler.js` 和 `/ProviderHintRedirect.js`
- **AND** 生成链路 SHALL 输出到 `web-admin/public/AuthCallbackHandler.js` 和 `web-admin/public/ProviderHintRedirect.js`
- **AND** CRA build SHALL continue copying these `.js` files as public raw assets

#### Scenario: Public auth script 行为保持兼容
- **WHEN** public auth scripts 迁移为 TypeScript 源并重新生成 `.js`
- **THEN** 迁移 SHALL NOT 修改 OAuth/OIDC/SAML/CAS/WeCom/Web3 callback query、hash、storage key、postMessage、fetch path、HTTP method、payload shape、token/cookie 处理或 redirect 构造语义
- **AND** 迁移 SHALL NOT 输出 token、Cookie、Authorization header、raw callback payload 或真实账号到验证记录

#### Scenario: Public auth scripts 迁移验证
- **WHEN** public auth raw scripts TypeScript 迁移准备交付
- **THEN** OpenSpec strict validation、`git diff --check`、public scripts TS 静态验证或生成命令、`yarn typecheck`、增量 TypeScript gate 和 `yarn build` SHALL pass
- **AND** 生成命令 SHALL be run once and leave no non-expected diff between TS sources and generated public `.js`
- **AND** a lightweight browser or jsdom-style smoke SHALL load both generated public `.js` files with redacted fake parameters and verify global entrypoints or redirect fallback behavior without real credentials
