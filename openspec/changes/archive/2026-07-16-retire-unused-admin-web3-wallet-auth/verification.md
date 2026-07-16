# 验证记录

## 证据边界

- 本 change 退役 Admin Web3/MetaMask/Web3Onboard 钱包认证入口、服务端写入/登录能力与专属依赖；不删除数据库字段，不做 schema migration，不批量修改历史数据。
- 60 环境仅按授权私有说明执行单事务 `READ ONLY` 聚合盘点，未修改数据库、Provider、Application、User、配置或凭据，未部署、重启或运行破坏性 E2E。
- 60 脱敏计数均为 `0`：退役 Provider 记录、Application 引用、激活 binding、非空钱包用户字段、可识别实际钱包绑定、可识别审计引用。
- 60 证据只证明本次发布前存量门禁，不代表部署或钱包登录运行态验证；仓库和本记录未保存查询原文、raw row、raw audit payload、账号、钱包地址、token、Cookie、password、DSN 或完整私有 URL。

## Go 后端

- 归档前在 `admin` 目录运行 object/idp/controllers 聚焦测试及受影响 package 测试：通过。
- archive/rebase 后复跑本 change 的 object/idp/controllers contract 精确集合：通过；`go vet ./object ./idp ./controllers`：通过。
- changed implementation coverage：`36/42 = 85.71%`，覆盖 classifier、Provider Add/Update、Application binding 状态机和 login fail-closed；达到 85% 门槛。
- contract tests 固定稳定 alias `PROVIDER_WEB3_WALLET_AUTH_RETIRED`，并覆盖普通 Provider 不误伤、请求内嵌 Provider 伪造无效、历史读取/禁用/解绑/删除兼容以及响应不泄漏 Provider material。

## 前端单测与质量门禁

- 聚焦 Jest 覆盖 Provider option/filter、Login/Signup/ProviderButton/AuthCallback、Provider list/edit、Application/User/OAuthWidget 和退出 storage cleanup：通过。
- 归档前复跑 13 个直接相关 Jest suites：`13/13` suites、`212/212` tests 通过。
- `yarn test:ci`：`144` 个 suites、`1369` 个 tests 全部通过。
- changed implementation coverage：`56/65 = 86.15%`，覆盖共享 classifier、历史 token cleanup、callback code 解析及退役入口过滤；达到 85% 门槛。
- `yarn typecheck`、`yarn typecheck:build-tooling`、`yarn typecheck:e2e`、`node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`：通过。
- `yarn lint`、`yarn public-scripts:check`、`yarn public-scripts:build`、`yarn public-scripts:smoke`、`yarn build`：通过；public auth scripts 生成后无非预期 diff。
- 归档前 production build 复跑：`5445` 个 modules transformed，构建成功；仅保留仓库既有的 `face-api.js` browser external、direct eval 与 chunk size warning。
- `yarn install --frozen-lockfile`：通过；继续使用 Yarn 1，未引入 Bun 真值，未升级 React、Router、Jest 或 Vite。
- archive 后再次运行 frozen install、全部 typecheck、增量 TypeScript gate、production lint、public scripts check/build/smoke、13/212 聚焦 Jest 和 Vite production build：全部通过。完整 Jest 144/1369、Playwright 22/22 与扩展 browser smoke 复用同一最终前端源码的 RC 证据，因为后续 rebase/archive 未触碰前端源码或 E2E 契约。

## i18n、依赖与 bundle

- 11 个现有 locale 均包含同构的历史退役提示 key；中文/英文文案语义一致，其它语言按现有目录保持最小同构。已删除仅由钱包认证持有的旧连接失败文案。
- 从 `package.json` 删除 13 个直接依赖：`@metamask/eth-sig-util`、11 个直接 `@web3-onboard/*` 依赖和 `ethers`；`yarn.lock` 删除 291 个仅由该能力持有的条目。
- 源码、package、lock 与构建产物审计未发现 `Web3Auth`、Web3 Onboard、MetaMask 签名工具或 `ethers` 的专属运行图；`bluebird` 未出现。
- `buffer` 仍由密码混淆持有，`react-metamask-avatar` 仍用于历史头像，mixed CommonJS 仍有非 Web3 owner，因此保留。
- 相同构建口径下，transformed modules 从 `8246` 降至 `5445`，JS chunks 从 `221` 降至 `141`，JS bytes 减少 `26.69%`，gzip bytes 减少 `27.61%`；原 `Web3Auth` 相关 257265-byte chunk 消失。该数字仅用于同口径前后对比，不代表网络下载或业务性能承诺。

## Playwright 与浏览器

- 删除一次性 smoke 后运行 `yarn test:e2e:list`：`19` 个 files、`22` 个 tests；静态审计 `skip`/`only`/`fixme` 为 `0`。
- 在本地 disposable SQLite 数据库运行完整 Playwright Chromium suite：`22/22` 通过（约 3.5 分钟）；未连接 60 或共享数据库。
- 一次性扩展 smoke 覆盖普通登录、Provider 列表/新增、历史退役直链、普通 Captcha Provider 编辑、Application Provider 选择、User 第三方登录和匿名登录页：page error `0`、非 warning console error `0`、非取消 request failure `0`、路由取消 `3`、既有 framework warning `2`。
- 历史 Provider 直链截图已目视检查：页面显示清晰退役提示，无白屏、保存动作或钱包配置，仅保留 Back/Delete。截图、HTML report、trace、test-results、临时 spec 和 disposable 数据库均已清理。

## CI 与脚本契约

- `.github/workflows/build.yml` 通过 YAML 静态解析。
- `e2e` job 仍使用 frozen Yarn install、Playwright Chromium cache/install、`yarn typecheck:e2e`、disposable DB 标志和实际 `yarn test:e2e`；失败时仅上传 `web-admin/output/playwright`，保留 7 天。
- `package.json` 的 `test:e2e` 仍为 `playwright test`，未回退或改写已归档的 Playwright 19/22、7002、逐测试登录、清理或 CI artifact 契约。

## OpenSpec 与归档前 review

- `openspec validate retire-unused-admin-web3-wallet-auth --strict`、`openspec validate --changes --strict`、`openspec validate --specs --strict`：通过。
- `git diff --check`：通过；浏览器、build、coverage、report、临时 spec、disposable DB 与本地监听残留已清理。
- OpenSpec 文档以中文说明为主；`MODIFIED Requirements` 中保留的英文 requirement 标题用于精确匹配既有主规格，`Requirement`/`Scenario`、`SHALL`/`MUST`、Provider/Application、字段名和 alias 属于结构关键字或技术标识。
- 注释 review 已覆盖后端 classifier、Provider/Application/login fail-closed 以及前端 copy-safe classifier、历史 token cleanup、callback 和仅 Unlink 状态；新增关键说明以中文为主，许可证与代码标识保留英文。
- `openspec-pre-archive-review` 结论：`READY`。change 已归档到 `openspec/changes/archive/2026-07-16-retire-unused-admin-web3-wallet-auth`，已新增 `admin-web3-wallet-auth` 主规格并同步四个 modified capabilities。
- archive 后已补齐 `admin-web3-wallet-auth` 与受影响 Application binding 主规格的中文 Purpose；`openspec validate --changes --strict` 无 active change，`openspec validate --specs --strict` 为 `48/48` 通过。
- 已 rebase 到 `origin/hfl-test-base@b27dc186c` 并收敛为 base + 1 个逻辑 commit；上游 idp HTTP client 运行语义未与本 change 文件冲突，idp 和 Web3 contract 测试通过；最后一笔上游提交仅修改技术债文档，因此复用同一最终源码的 archive 后运行时门禁。

## 剩余风险

- 60 的零存量是发布前只读快照，不能证明其它部署环境也为零；其它环境发布前仍须执行同口径只读盘点，任一计数非零即停止发布并由 owner 决策。
- 本地浏览器验证使用 disposable fixture，只证明当前源码与本地 Admin 运行链路；本 change 按产品决策不恢复或新建真实钱包凭据，因此未做钱包正向登录。
- 浏览器记录到 2 条既有 framework warning，未出现 page error、非 warning console error 或非取消请求失败；这些既有 warning 不属于本 change 的钱包退役写集。
- 额外运行全 object package 时，基线 `TestMigrateAICodexOwnedSchemaSerializesConcurrentSQLiteEngines` 曾在 SQLite migration history `Sync2` 等待连接并触发 10 分钟超时；该测试单独无缓存复现于 1.12 秒通过，重复全包运行又出现相同低 CPU 等待。本 change 未修改 schema/fixture 写集，required Web3 object contract 精确集合、归档前全包证据和 go vet 均通过；该基线并发夹具波动不作为本 change 的通过证据，保留为非阻塞测试基础设施风险。
