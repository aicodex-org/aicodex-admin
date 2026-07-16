# 验证记录

## 结论

本 change 在不改变 React、Router、Jest、AntD、Vite、Playwright、Bun、认证 API 或 CI workflow 的前提下，移除了 production 与 Jest 对 `react-app-polyfill` 的全部 owner。React 18 + Vite `es2020` 与 production browserslist 继续定义浏览器支持边界；`core-js/es`、`replaceAll` fallback、显式 Jest/jsdom 与其它共享 runtime owner 均保持不变。

## 实施前基线

- production browserslist 通过 `BROWSERSLIST_ENV=production yarn browserslist` 解析，结果不包含 Internet Explorer；Vite `build.target` 为 `es2020`。
- `react-app-polyfill` 的直接 owner 仅为 `src/index.tsx` 的 `ie9`/`stable` 与 `jest.config.cjs` 的 `jsdom`；`core-js` 仍是 production 直接依赖，`object-assign` 与 `regenerator-runtime` 仍有其它依赖 owner。
- 直接 dependencies：39；Yarn top-level lock keys：1152。
- closeout 前已 rebase 最新 `origin/hfl-test-base@5ca04ae7f`；在 detached baseline worktree 运行同一 frozen install 与 build，得到 5447 modules transformed、139 个 production JS 文件、总 raw 8,788,474 bytes、`SmallestSize` gzip 2,585,607 bytes；入口 raw 556,593 bytes、gzip 161,126 bytes。
- proposal、design、tasks 与 delta specs 经实施前 review 后为 READY；目标与全部 active changes strict validate 通过，`git diff --check` 无输出。

## TDD RED / GREEN

- RED：`yarn test:ci --runTestsByPath src/FrontendCiGates.test.ts` 以 exit 1 失败；1 个 suite 中 2 个断言精确命中现存 `react-app-polyfill/jsdom` 与 `react-app-polyfill/ie9` owner，没有语法或环境错误。
- GREEN：删除 production imports、Jest setup 与 package/lock owner 后，同一聚焦 suite 为 10/10 tests 通过。
- 第一次完整 `yarn test:ci` 暴露 `App.test.tsx` 依赖 CRA 注入的全局 `fetch`：149 suites 通过、1 suite 失败。修复只在该根壳测试内安装并恢复 suite-local `fetch` test double，不恢复全局 polyfill。
- 修复后聚焦 `App.test.tsx` 与 `FrontendCiGates.test.ts` 为 2 suites / 13 tests 通过；rebase 最新 base 后再次运行完整 Jest，最终为 152/152 suites、1433/1433 tests、0 失败。

## 依赖与产物差异

| 指标 | 移除前 | 移除后 | 差异 |
|---|---:|---:|---:|
| production 直接 dependencies | 39 | 38 | -1 |
| Yarn top-level lock keys | 1152 | 1146 | -6 |
| Vite transformed modules | 5447 | 5296 | -151 |
| production JS 文件 | 139 | 139 | 0 |
| production JS raw bytes | 8,788,474 | 8,714,507 | -73,967 |
| production JS gzip bytes | 2,585,607 | 2,561,530 | -24,077 |
| 入口 raw bytes | 556,593 | 482,423 | -74,170 |
| 入口 gzip bytes | 161,126 | 136,800 | -24,326 |

最终 Yarn 图不再包含 `react-app-polyfill`、`whatwg-fetch`、`raf`、`promise` 及其专属 `asap`、`performance-now`。`core-js` 继续由 package 与 production 入口直接拥有；`object-assign` 继续由 `react-helmet`/`prop-types` 路径拥有；`regenerator-runtime` 继续由 Babel/AntD/CodeMirror 路径拥有。lock diff 只包含上述 owner 删除与共享 key 合并，没有依赖升级。

## 自动化门禁

- `yarn install --frozen-lockfile --non-interactive --offline`：exit 0，tracked package/lock 已是最新。
- `yarn test:ci`：最新 base 上 152 suites / 1433 tests 全部通过。
- `yarn typecheck`、`yarn typecheck:build-tooling`、`yarn typecheck:e2e`：exit 0。
- `node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`：exit 0。
- `yarn lint`：exit 0，ESLint `--max-warnings=0` 门槛通过；命令中的既有 browserslist 数据提示单独列入下方剩余提示。
- `yarn public-scripts:check`、`yarn public-scripts:build`、`yarn public-scripts:smoke`：exit 0；public auth scripts smoke 通过。
- `yarn build`：exit 0；Vite production build 完成。
- `yarn test:e2e:list`：19 files / 22 Chromium tests，数量与 Playwright 契约一致。
- `openspec validate retire-web-admin-cra-ie-polyfill --strict`、`openspec validate --changes --strict`、`openspec validate --specs --strict`、`git diff --check`：exit 0。

构建仍报告既有 `face-api.js` browser external、`Setting.tsx` direct `eval` 和大 chunk 提示；Jest 仍有既有 FakeTimers 提示。它们不由本 change 引入，且没有通过 ignore、mock 或阈值放宽隐藏。

## Changed implementation coverage

覆盖率门槛为 N/A。本 change 虽然修改了 production 入口文件，但 diff 只删除两个 side-effect import；最终分支没有 surviving changed executable statement、函数或业务分支，changed-statement 分母为 0。其余运行态改动为 Jest setup、package/lock 与测试契约。结构契约、完整 Jest、类型检查、production build、public auth scripts 和真实 Chromium smoke 共同覆盖本次行为风险，没有通过排除生产实现制造覆盖率结论。

## 真实 Chromium smoke

使用本地 production preview、headed Chromium 与一次性脱敏 route fixture 验证，未连接 60、共享数据库或真实 Provider，也未使用真实凭据。

- `/login`：登录表单、用户名/密码输入和登录按钮可见；root 非空、无横向溢出，console/page error 为 0。
- `/login/oauth/authorize`：带本地占位 OIDC 参数可达并渲染登录表单；fixture `get-app-login` 为 200，console/page error 为 0。
- `/callback`：本地占位授权码进入可恢复失败态，显示错误说明、返回授权登录和返回首页动作；fixture `login` 为 200，console/page error 为 0。
- 登录页与 callback 截图已目视检查，无白屏、裁切、重叠或操作遮挡；截图、CLI session、report、build、Vite cache 和本任务 server 均已清理。

本机 7002 当时由另一个已登记 workspace 的 Vite preview 占用，因此未结束或复用该外部进程；本次 production smoke 使用隔离本地端口。`vite.config.ts` 的默认 7002、strict port 与 Playwright 19/22 discovery 均保持原契约。

浏览器 smoke 早于最终 rebase；上游提交只修改企业 TLS 的 Provider/Syncer/locale 与后端边界，没有触及 `index.tsx`、认证启动/回调、Jest/package/lock 或 Vite/Playwright 配置。rebase 后已重跑 frozen install、完整 Jest、全部 typecheck、lint、public scripts、Vite build 与 Playwright discovery，因此该本地 Chromium 证据继续适用于最终登录/回调源码状态。

## 剩余风险

- Internet Explorer 明确不在 React 18、Vite `es2020` 与当前 browserslist 支持范围内；本 change 不提供 IE 运行态回退。
- Chromium smoke 使用本地脱敏 fixture，只证明 production bundle、登录/OIDC/callback 前端路径与错误恢复可执行；不外推为真实外部 Provider 或部署环境端到端验收。
- browserslist 命令提示本地 `caniuse-lite` 数据可更新；本 change 不升级依赖数据库，避免把浏览器目标迁移或 lockfile 广泛更新混入本次退役。
