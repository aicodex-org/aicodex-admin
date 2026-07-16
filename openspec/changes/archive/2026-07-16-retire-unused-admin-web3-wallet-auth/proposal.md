## Why

Admin 仍暴露 MetaMask/Web3Onboard 钱包登录、Provider 配置和客户端 SDK，但该能力已确认不再用于线上产品；现有服务端链路还会信任客户端提交的钱包地址，单纯隐藏前端入口无法阻止通用 API 或手工登录绕过。60 受控测试环境的 Provider、Application 绑定、用户钱包字段和可识别审计引用均已通过只读聚合证明为零，因此现在可以在不迁移历史数据的前提下退役该高风险死能力并收敛前端依赖图。

## What Changes

- **BREAKING**：Admin UI 不再提供 Web3、MetaMask 或 Web3Onboard 钱包认证的创建、配置、登录、注册或绑定入口；历史 Provider/用户 DTO 仍保持只读兼容，并继续允许禁用、解绑和删除。
- 在 Admin 后端建立单一退役分类边界，对 `category=Web3` 或 `type=MetaMask/Web3Onboard` 的 Provider 新建、普通 Provider 转换、Application 新绑定/重新启用和登录请求统一 fail-closed，稳定返回 `PROVIDER_WEB3_WALLET_AUTH_RETIRED`。
- 删除 `Web3Auth`、前端 Web3 Provider 专用字段组件、后端 idp 工厂和只由该能力持有的钱包 SDK；保留有其它 owner 的 `buffer`、`react-metamask-avatar`、历史用户字段及必要 CommonJS 兼容。
- 明确发布与回退边界：不做 schema migration、不批量改历史数据、不恢复退役能力；如需回退应用版本，仍以现存数据库字段和 DTO 兼容为前提。
- 保持其它认证方式、Provider 通用 DTO/API shape、Playwright 19 specs/22 tests、Yarn/Vite/React 技术栈和 `test` 分支不变。

## Capabilities

### New Capabilities

- `admin-web3-wallet-auth`: 定义 Web3 钱包认证退役后的 UI、服务端 fail-closed、历史兼容、依赖清退、只读存量门禁和脱敏验证契约。

### Modified Capabilities

- `web-admin-incremental-typescript`: 删除继续迁移或保持 `Web3Auth` 行为的要求，并把已退役模块从 auth/public callback 的 TypeScript 兼容边界中移除。
- `web-admin-vite-build-toolchain`: 将浏览器兼容 fallback 从 MetaMask/Web3 Onboard 收敛到仍有运行 owner 的 Buffer 与必要 CommonJS 模块。
- `admin-enterprise-identity-auth-source-center`: Provider 列表和历史记录仍可读/删，但新增和编辑入口不得再创建或改写 Web3 钱包认证 Provider。
- `admin-application-identity-source-bindings`: Application 不得新增或重新激活 Web3 钱包认证绑定，同时允许历史绑定保持禁用、转为禁用或移除。

## Impact

- 前端：`web-admin/src/auth`、Provider/Application/User 认证入口、相关测试与 locale；`package.json`、`yarn.lock` 和 Vite 的 Web3 专属预打包项。
- 后端：Provider 分类与 Add/Update、Application Provider binding 写入、登录入口、Web3 idp 工厂及直接 contract tests。
- 依赖：移除 `@metamask/eth-sig-util`、直接 `@web3-onboard/*`、`ethers` 及其专属传递树；`buffer`、`react-metamask-avatar` 和非 Web3 CommonJS owner 保留。
- 数据与环境：数据库 schema、历史 Provider/Application/User 字段和 60 环境状态均不变；60 只读存量证据不得包含地址、账号、凭据、连接信息、完整私有 URL 或 raw row。
