## ADDED Requirements

### Requirement: Auth residual Web3 and WeCom test TypeScript 收尾
Admin 前端 SHALL 支持将 `web-admin/src/auth` 中剩余的 Web3 登录组件和 WeCom 登录 panel 测试从 legacy JavaScript 渐进迁移为 TypeScript/TSX，并保持现有登录行为、测试覆盖和 JS/TS 共存边界兼容。

#### Scenario: Web3Auth 迁移
- **WHEN** 开发者迁移 auth 目录剩余 Web3 登录文件
- **THEN** `web-admin/src/auth/Web3Auth` SHALL 使用 `.tsx` 或在不含 JSX 时使用 `.ts`
- **AND** 迁移 SHALL 使用 auth-local 窄类型描述 Web3 SDK、wallet provider、浏览器注入对象、组件 props 和回调边界
- **AND** 迁移 SHALL 保持现有 Web3 登录按钮渲染、SDK 初始化、钱包连接、授权回调、错误处理和 extensionless import 兼容

#### Scenario: WeComLoginPanel 测试迁移
- **WHEN** 开发者迁移 WeCom 登录 panel 残留测试
- **THEN** `web-admin/src/auth/WeComLoginPanel.test` SHALL 使用 `.test.tsx`
- **AND** focused Jest SHALL 真实执行 `WeComLoginPanel` suite/tests，测试数量 SHALL be greater than zero
- **AND** 迁移 SHALL 保持 WeCom panel intent、polling、MFA、错误展示和 mock API payload 语义不变

#### Scenario: Auth residual 行为和边界保持兼容
- **WHEN** 本批 auth residual 文件迁移为 TypeScript/TSX
- **THEN** 迁移 SHALL NOT 修改认证 URL、OAuth/OIDC/WeCom/Web3 回调参数、token/cookie 名称或写入语义、Provider 可见性、后端 API path、HTTP method、payload shape、权限或真实认证链路
- **AND** 迁移 SHALL NOT 触碰 common/table/provider/backend/Application/Syncer/root shell/config/entry/basic/account/pricing 写集

#### Scenario: Auth residual 迁移验证
- **WHEN** auth residual Web3 and WeCom test migration 准备收口
- **THEN** OpenSpec strict validation、`git diff --check`、`WeComLoginPanel.test.tsx` focused Jest、`yarn typecheck`、增量 TypeScript gate 和 `yarn build` SHALL pass for touched TSX and JS coexistence paths
- **AND** 若迁移需要任何 Web3 或 WeCom 登录行为语义变化，change SHALL stop at RC/blocked instead of self-closeout
