## 验证边界

- 仅迁移 `web-admin` 的应用 dev/build 工具链；Jest 继续由 React Scripts 提供，不验证或宣称 Vitest、React、Router、Testing Library 升级。
- 浏览器运行态使用本地 Vite dev/preview，并把 API 代理到已授权的“60 测试后台”；未执行真实登录、OIDC/CAS 授权交换、Provider 钱包连接、后端配置写入或 fixture 写入。
- callback 浏览器检查使用 Playwright context 拦截 `/api/login`，固定返回脱敏失败结果；请求未到达测试后台。报告不记录完整后台 URL、Cookie、token、账号或响应体。

## TDD 与单测覆盖率

- `runtimeEnv`：先确认 adapter 缺失测试 RED，再实现 base/mode/public asset 适配并 GREEN；浏览器发现非根路由后，继续以 RED→GREEN 增加 router basename、pathname 去 base 和 branding public asset 规则。
- locale：先确认 11 种语言、region suffix、未知语言 fallback 与显式 loader contract RED，再实现 `supportedLocales.ts` / `countryLocales.ts` 并 GREEN。
- 浏览器发现 Vite dev 将 `buffer` 解析成 Node builtin shim 后，先让 `FrontendCiGates.test.ts` 的显式 browser alias 契约 RED，再加入唯一 `buffer -> buffer/` alias 并 GREEN。
- 浏览器发现 `AuthCallback` 丢失 `i18next.t` receiver 后，先用 `AuthCallback.test.tsx` 稳定复现 `translator` TypeError，再改为保留 receiver 的调用并 GREEN。
- 受影响 env/locale 实现的 rebase 后 changed-file coverage：statements/lines `97.67%`、branches `86.11%`、functions `100%`，超过 85% 门槛。AuthCallback 的 receiver 由聚焦回归测试覆盖；App/LoginPage/branding 的 legacy 接入点由根/非根浏览器 smoke 覆盖，避免用整个历史大文件的低信息量 file coverage 掩盖实际改动边界。

## 构建对照

| 指标 | CRA 迁移前基线 | Vite RC 根路径 |
| --- | ---: | ---: |
| JS/CSS 文件数 | 108 | 221 |
| raw 合计 | 14,920,326 bytes | 12,260,727 bytes |
| gzip 合计 | 3,990,916 bytes | 3,657,060 bytes |
| 最大 gzip chunk | 约 1,001 KB | 784,370 bytes |
| production build 阶段 | 约 78 秒 | `6.97s`；完整 `yarn build` `21.11s`（含 public scripts） |

- Vite 文件拆分更细；当前同口径 raw/gzip 与最大 chunk 未出现明显回退。该结果只描述本次仓库状态，不宣称 Vite 或后续构建必然更小。
- 根入口由 `build/index.html` 加载 hashed module/CSS；production preview 实际请求 `Provider`、`Web3Auth`、`buffer` 与 ManagementPage 相关产物均为 200。
- 已知构建告警：`face-api.js` 的 `fs` 与 `micro-ftch` 的 `url/http/https/zlib` 被 browser-externalize；`Setting.tsx` 既有 direct `eval`；若干 chunk 超过 500 KB。这些模块未在 smoke 中触发 Buffer/global/process/CommonJS page error，不以通用 Node polyfill 隐藏告警。

## 浏览器证据

### Vite dev

- 默认 `yarn start` 已验证占用 `7002` 且 `strictPort` 生效；为避免干扰既有 7002 进程，远端后台预览脚本使用本任务端口 `7003`。
- `/api/get-account`、应用配置请求均通过既有 proxy 返回 200；登录壳可见密码、验证码、Web 身份验证、Face ID tab，刷新后保持渲染。
- 普通 `/cas/<owner>/<app>/login` 未被 CAS validator proxy matcher 误截获，刷新后仍渲染登录壳。
- OIDC/CAS callback 使用 Playwright context mock 截断 `/api/login` 后渲染脱敏失败壳；没有 `translator`、Buffer、global、process 或 CommonJS page error。
- dev console 仍可见既有 AntD `Spin` / `Form.Item` / `message` warning；production preview 未出现这些 warning。本 change 不混入 AntD 页面清债。

### Production preview 与 base path

- 根路径：入口、`/callback` 与 CAS login history route 返回同一 HTML hash；刷新登录壳正常，console `0 error / 0 warning`。
- 非根 `/admin-console`：入口自动进入 `/admin-console/login`，刷新与 `/admin-console/cas/<owner>/<app>/login` 均渲染登录壳，内部 Router link 带 basename，console `0 error / 0 warning`。
- 非根入口、callback 与 CAS route 返回同一 HTML hash；`AuthCallbackHandler.js`、`ProviderHintRedirect.js` 在根/非根 base 下均为 JavaScript 200。
- 非根静态请求使用 `/admin-console/assets/*` 与 `/admin-console/branding/*`；Buffer、Provider、Web3Auth 相关产物均成功加载。

## 自动化门禁

最终 rebase 到最新 `origin/hfl-test-base` 后的新鲜结果：

- `openspec validate migrate-web-admin-build-toolchain-to-vite --strict`：通过。
- `git diff --check origin/hfl-test-base...HEAD` 与工作区 `git diff --check`：通过；同时清除了 delta specs 的 EOF 多余空行。
- `yarn typecheck`、`yarn typecheck:build-tooling`：通过。
- `node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`：通过。
- `yarn lint`：通过；仅输出既有 Browserslist 数据更新提示，没有 lint warning/error。
- `yarn public-scripts:check`、`yarn public-scripts:build`、`yarn public-scripts:smoke`：全部通过。
- `yarn test:ci`：`141/141` suites、`1327/1327` tests、0 snapshots，exit 0，Jest `742.295s`、完整命令 `749.32s`；未提高 timeout。
- env/locale changed-file coverage：2 suites、16 tests 通过；statements/lines `97.67%`、branches `86.11%`、functions `100%`。
- `yarn build`：Vite 8.1.4 production build 通过，8349 modules transformed，build 阶段 `6.97s`，完整命令 `21.11s`。
- rebase 后 production browser smoke：根登录壳、CAS login route/history fallback/刷新与脱敏 OIDC callback 失败壳正常；public auth scripts 和 Buffer/Provider/Web3Auth/Management 相关静态请求 200，最终隔离场景 console 均为 `0 error / 0 warning`。
- `self-closeout=true` 最终 rebase 先引入基线的 ProviderEdit 显示名称修复，再引入中英文 locale 重复键清理，均未触碰本 change 的认证、路由、env、Vite config 或兼容边界；因此复用同一 Vite 实现状态的浏览器与 coverage 证据。ProviderEdit 基线后重新执行全量 Jest、typecheck、lint、public scripts 与 production build；locale 清理基线后补跑 typecheck、审计/Setting/locale 4 suites 24 tests 和 production build。

## 剩余风险与证据层级

- 浏览器证据证明本地 dev/production 静态入口、代理形态、history fallback、base path 与前端兼容层；未执行真实登录、OAuth/OIDC/CAS 授权交换或钱包连接，因此不将其表述为认证端到端验收。
- `face-api.js` / `micro-ftch` browser-externalize 与大 chunk/direct eval 告警仍需后续独立依赖或 bundle change 评估；当前 production build 与已触发模块加载没有运行时错误。
- Vite preview 使用已授权测试后台的只读未登录数据形态；没有新增 fixture、没有服务重启、没有测试后台数据变更，也没有待清理数据 marker。
