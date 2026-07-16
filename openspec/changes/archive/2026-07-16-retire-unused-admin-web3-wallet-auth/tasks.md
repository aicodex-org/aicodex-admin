## 1. 基线、存量与设计门禁

- [x] 1.1 读取仓库/web-admin/OpenSpec 规则、技术债、Playwright 归档、Web3 主规格/源码/测试，并确认 clean workspace、目标分支、base/test 与 active changes 状态。
- [x] 1.2 只读审计前端入口、后端 Provider/Application/Login 兼容面和 npm 直接/传递 owner，记录必须保留的 Buffer、历史头像与 CommonJS 边界。
- [x] 1.3 按授权私有说明在 60 以单事务 `READ ONLY` 聚合核验 Provider、Application binding、User 钱包字段/实际绑定和审计引用均为 0；不修改、部署或重启环境且只保留脱敏计数。
- [x] 1.4 完成 OpenSpec implementation review，修复 proposal/design/specs/tasks 的可执行性、安全、历史兼容和验证缺口，运行 target/changes strict 与 `git diff --check` 到 READY。

## 2. 后端 fail-closed（TDD）

- [x] 2.1 先新增表驱动 RED 测试，覆盖退役 classifier 的 category/type/错配组合、空白/大小写和普通 Provider 不误伤，再实现单一分类器与稳定 alias `PROVIDER_WEB3_WALLET_AUTH_RETIRED`。
- [x] 2.2 先新增 Provider Add/Update contract RED 测试，覆盖新建、普通→退役、历史退役改写拒绝，以及 Get/List/Delete/secret mask 兼容，再实现最窄对象层写保护。
- [x] 2.3 先新增 Application Add/Update RED 测试，覆盖请求嵌套 Provider 伪造、新绑定、active 保持/重新激活拒绝，以及 active→disabled、disabled 保持、移除与 `canUnlink` 兼容，再实现服务端真实 Provider 解析和状态转换保护。
- [x] 2.4 先新增 Login/controller RED 测试，证明 category/type 三种退役组合在 Application 可见性/目标组织、idp 和 user lookup 前返回稳定 alias，且 binding 缺失/`canSignIn=false` 不改变退役错误，再实现认证入口 gate。
- [x] 2.5 删除 MetaMask/Web3Onboard idp factory cases 与专属实现，保留 User `metamask`/`web3onboard` XORM/JSON 字段、通用 unlink 和历史 DTO；运行受影响 Go package 聚焦测试与 gofmt。

## 3. 前端入口退役（TDD）

- [x] 3.1 先新增共享 classifier/Provider option RED Jest，覆盖 Web3/category/type 大小写与错配 fail-closed、普通 Provider 不误伤、Provider 新建选项不含退役类型。
- [x] 3.2 先新增 Login/Signup/ProviderButton/AuthCallback RED Jest，覆盖退役 Provider 不渲染、不落入通用 OAuth fallback且不再消费 Web3 storage callback，再删除 `Web3Auth`；把退出清理收敛为只删除固定 key 前缀、不读取/记录 value 且不依赖钱包 SDK 的 bounded helper。
- [x] 3.3 先新增 Provider list/edit RED Jest，覆盖历史记录可见/可删、新增与切换选项移除、历史直链显示不可配置退役状态且无白屏/保存动作，再删除 `Web3ProviderFields` 及相关图标/专属静态入口。
- [x] 3.4 先新增 Application/User/OAuthWidget RED Jest，覆盖 Application 新绑定列表过滤、历史 binding 禁用/移除、历史 User 只保留通用 unlink且不加载钱包 SDK，再移除 Link/Connect 实现。
- [x] 3.5 使用 `admin-i18n` 只删除无其它 owner 的 Web3 文案并为历史直链增加最小同构 locale；不改其它认证文案、AntD locale 或无关 locale。

## 4. 依赖、lock 与构建边界

- [x] 4.1 使用 Yarn 1 从 `package.json`/`yarn.lock` 删除 `@metamask/eth-sig-util`、全部直接 `@web3-onboard/*`、`ethers` 及专属传递树；保持 Yarn 单一真值和 `--frozen-lockfile` 可安装。
- [x] 4.2 从 Vite 删除 MetaMask 专属 `optimizeDeps`，保留 `buffer` alias/include、`react-metamask-avatar`、`define.global` 和 mixed CommonJS 配置；补充/更新构建 gate 回归断言。
- [x] 4.3 运行源码、`package.json`、`yarn.lock` 和 build 产物审计，证明 Web3Auth/Onboard/MetaMask/ethers 专属运行图消失、`bluebird` 未被引入，并按同口径记录主要 bundle 变化而不夸大 `node_modules` 磁盘数字。

## 5. 本地自动化与浏览器验证

- [x] 5.1 运行聚焦 Go tests、受影响 package tests、`go vet` 和 changed implementation coverage；实际改动 package/file 目标至少 85%，低于门槛则补高价值行为测试或明确阻断。
- [x] 5.2 运行聚焦 Jest、全量 Jest/`test:ci`、app/build-tooling/E2E typecheck、增量 TypeScript gate、production lint、public scripts check/build/smoke 和 Vite production build。
- [x] 5.3 运行 `yarn install --frozen-lockfile`，确认 package/lock 一致且未切换包管理器、升级 React/Router/Jest/Vite 或引入 Bun 真值。
- [x] 5.4 确认 Playwright discovery 保持 19 files/22 tests、0 skip/only；在 disposable DB 执行完整 22/22，保持 7002、逐测试登录、清理和 CI artifact 契约，不在 60/共享 DB 运行。
- [x] 5.5 运行登录/Provider/Application/User 高价值浏览器 smoke，确认无 Web3 创建/配置/登录/绑定入口，历史直链安全降级，普通登录和 Provider 编辑无回归，page/console error 为 0，且截图/trace/report 脱敏并清理。
- [x] 5.6 静态校验 CI workflow/YAML 与 public scripts，确认 Playwright runner、browser cache/install、失败 artifact 和实际 E2E 执行契约未被改写。

## 6. 验证记录与归档前 review

- [x] 6.1 编写中文 `verification.md`，分层记录 60 只读存量、Go/Jest/coverage、前端质量门禁、dependency/bundle、Playwright/browser 与未验证项，不包含 secrets、地址、账号、连接信息、完整私有 URL 或 raw payload。
- [x] 6.2 运行 OpenSpec target/changes/specs strict、`git diff --check` 和工作区残留审计，逐项更新 tasks，仅基于新鲜证据标记完成。
- [x] 6.3 使用 `openspec-pre-archive-review` 迭代审查 artifacts、主规格同步预期、实现、测试、覆盖率、历史兼容、文档语言与脱敏卫生，直到 READY；真实 blocker 回传主控且不弱化门禁。

## 7. Self-closeout

- [x] 7.1 fetch/prune 并 rebase latest `origin/hfl-test-base`；如触及本 change 生产文件或语义，按风险重跑受影响验证，确保最终为 latest base + 1 logical commit。
- [x] 7.2 archive `retire-unused-admin-web3-wallet-auth`，同步/检查 `admin-web3-wallet-auth` 及四个 modified main specs，重跑 archive 后 target/changes/specs strict、diff check 和全部 final gates。
- [x] 7.3 普通非强制 push `HEAD:hfl-test-base`，确认 `origin/test` 未变且禁止 push/merge test；删除本地/远端工作分支并固定 workspace 回到 clean/aligned base。
- [x] 7.4 清理 build/report/browser/temp 残留，回传 envelope、`RELEASED`、final HEAD/archive、60 脱敏计数、changed files、依赖/lock/bundle、测试/浏览器证据、remaining risk、resource lock release、`push_test=false`、`lease_release=true`。
