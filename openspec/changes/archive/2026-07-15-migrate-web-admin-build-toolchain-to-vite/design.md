## Context

`web-admin` 当前由 CRA 5 + CRACO 6 驱动应用开发和生产构建。`craco.config.js` 同时承载端口外的代理、Less 变量、Webpack fallback、ResizeObserver runtime overlay/preflight 和 `build-temp` 输出改写；`mv.js` 再把产物改名为 `build`。业务源码仍直接读取 `process.env.PUBLIC_URL`/`NODE_ENV`，`Setting.tsx` 与 `i18n.ts` 依赖 Webpack 能推导的动态模块上下文。Docker、CI 和本地前端代理脚本又分别依赖这些隐式约定。

迁移前实时基线为：typecheck、build-tooling typecheck、incremental TS、public scripts check/build/smoke 和 CRA production build 通过；全量 Jest 137 suites 中 1 个既有 5 秒 timeout，聚焦连续两次重跑均 24/24 通过，最终门禁仍要求全量新鲜通过。新鲜 CRA build 产生 108 个 JS/CSS 文件，合计 raw 14,920,326 bytes、gzip 3,990,916 bytes，入口 JS gzip 约 959 KB，最大懒加载 chunk gzip 约 1001 KB。

当前 registry 稳定工具链为 Vite 8.1.4、`@vitejs/plugin-react` 6.0.3、Less 4.6.7，Node 要求为 `^20.19.0 || >=22.12.0`。CI 最新 Node 20、Docker Node 24 与本地 Node 24 均可满足；仓库需要把该最低版本写明，避免旧 Node 20 小版本产生不可解释失败。

## Goals / Non-Goals

**Goals:**

- 让 Vite 成为 `yarn start` 与 `yarn build` 的唯一默认应用 dev/build 工具，保持端口、代理、Less、preflight、base path 和 `web-admin/build` 交付行为。
- 用 typed config 与 runtime adapter 收口构建模式、`PUBLIC_URL`、静态资源地址、11 种应用语言 loader 和国家语言包映射。
- 对 Buffer、MetaMask、Web3 Onboard 与混合 CommonJS 依赖实施最小兼容，并用真实 production build 和浏览器 smoke 证明，而不是安装全局 polyfill 套件。
- 保留 React Scripts/Jest transform、jsdom、setup 与全部测试，不引入 Vitest；把 CI 中原本依赖 CRA build 的 lint 转为显式非修改门禁。
- 保留迁移前 CRA 证据和可回退提交边界，但切换后不维护第二套默认 production build。

**Non-Goals:**

- 不升级 React、React Router、Testing Library、Jest 或业务依赖，不执行 class-to-hooks、页面视觉重做或 bundle 专项优化。
- 不迁移 Jest 到 Vitest，也不建立独立 Jest transform 配置；测试运行器脱离 React Scripts 属于后续 change。
- 不修改 Admin Go runtime config、数据库 fixture/schema、后端 API、权限或认证协议，不执行真实登录、OAuth/OIDC/CAS 授权交换。
- 不承诺 bundle 必然缩小；只记录同口径产物与无依据明显回退。

## Decisions

### 1. 一次默认切换，迁移证据分阶段保留

先在 change 记录 CRA 的命令输出、入口、chunk 和主要 bundle，再切换 package scripts；最终仅保留 Vite `start`/`build`。回滚依赖 Git 单提交而不是长期保留 `build:cra`。

备选方案是长期并行 CRA/Vite 两套 production build。该方案增加 lockfile、CI、Docker 与告警维护成本，且会让两套结果逐渐漂移，因此拒绝。

### 2. Typed Vite config 是构建真值来源

`web-admin/vite.config.ts` 使用 `defineConfig`，集中配置：

- `server.host` 保持本机脚本可通过 `127.0.0.1` 访问，`server.port` 从 `PORT` 解析，默认 `7002` 且 `strictPort`；
- `AICODEX_ADMIN_DEV_PROXY_TARGET` → `AICODEX_ADMIN_PROXY_TARGET` → `http://localhost:8000` 的代理优先级；
- `/api`、`/swagger`、`/files`、OIDC discovery、CAS validator/proxy 与 `/scim` 的显式 proxy matcher；
- Less `javascriptEnabled` 与现有主题变量；
- HMR overlay、React plugin、`build` 输出、sourcemap 关闭、ES2020 target、mixed CommonJS 处理和受控 define。

`tsconfig.build-tooling.json` 改为 NodeNext/bundler 兼容的 typed config 检查。Vite 直接输出并清理 `build`，删除 `build-temp`/`mv.js` 的双阶段改名。

### 3. Runtime env adapter 使用 Vite define 常量，不让业务散落 `import.meta.env`

Vite config 解析 mode 与 `PUBLIC_URL`/base，注入只读 build constants；`src/config/runtimeEnv.ts` 负责规范化 base、判断 development/production 和拼接公共资源路径。`Conf.ts`、`ManagementPage.tsx`、`serviceWorker.ts` 只消费 typed adapter。

备选方案是在每个业务文件直接读取 `import.meta.env`。这会扩大 Vite 绑定面，并让现有 Jest/CommonJS transform 解析困难，因此拒绝。adapter 保留仅供 Jest 的 `process.env` 安全 fallback，但生产常量由 Vite 在构建期替换。

### 4. 语言资源使用固定 11 语言显式映射

建立单一语言清单 `de/en/es/fr/ja/pl/pt/tr/uk/vi/zh`：应用翻译使用显式动态 import loader，继续按语言拆 chunk；国家语言包使用显式 JSON import map，`Setting.initCountries()` 只调用 typed resolver。语言带 region 时先归一化到基础语言，未知语言回退 `en`。

备选方案是 `import.meta.glob`。虽然 Vite 可分析，但会把 `import.meta` 语法带入 Jest 当前 transform 边界；固定 11 语言的显式映射更直接，也能让 Jest 在不改 runner 的情况下测试。

### 5. Node/CommonJS 兼容采用白名单边界

保留 `buffer` 直接依赖和源码显式 import；仅在 Web3Auth 既有入口把 Buffer 暴露给需要全局变量的 provider。Vite config 允许 node_modules mixed CommonJS 转换，并仅对实测需要的依赖添加 optimize/alias/define。不会引入通用 Node polyfill 插件，也不会为 `crypto/fs/http/stream` 等浏览器不应使用的模块制造空实现。

### 6. ResizeObserver 与错误 overlay 分层

Vite HMR overlay 保留编译/HMR error 展示。`resizeObserverLoopErrorPreflight.ts` 作为应用入口第一个 side-effect import，在 React/AntD 初始化前安装；既有 runtime guard 继续兜底，只过滤已知 ResizeObserver loop noise，不吞掉其它 page error。

### 7. Jest 保持 React Scripts，移除 CRACO 测试包装

当前 CRACO config 没有 Jest 定制。`test`/`test:ci` 可直接调用 `react-scripts test`，因此移除 CRACO 与 craco-less 依赖不会改变 Jest runner、transform、jsdom 或 setup。`react-scripts` 继续保留，直到后续独立 change 显式解耦 Jest。

### 8. CI、Docker 与 local-dev 使用同一 package 契约

CI frontend checks 显式运行 app typecheck、build-tooling typecheck、incremental TS、public scripts check/build/smoke、production-source lint 与全量 Jest；frontend job 在 checks 后运行唯一 `yarn build`。lint 使用非修改模式并排除未进入 production build graph 的 `*.test.*`，等价接替 CRA build 的生产源码检查；全量 Jest 继续负责测试行为门禁，既有测试 lint 清债不混入本 change。Docker 仍执行 `yarn build` 并复制 `/web-admin/build`。本地全栈脚本继续调用 `yarn start`；远端后台预览脚本改为直接调用本地 `vite.cmd`/`yarn vite`，并把进程归属识别从 `craco start` 改为 workspace 内 Vite 命令。

### 9. 浏览器 smoke 分开发与生产静态两层

- Vite dev server：确认 `7002`、代理 matcher、HMR/overlay、首页/登录壳与 callback route 刷新。
- production build 静态服务：确认 index fallback、base path、公共 auth scripts、入口/懒加载 chunk、Provider/Web3 相关模块无 page/console error。

不执行真实登录或 provider 授权；必要 API 使用已授权远端后台只读代理或本地脱敏 mock。证据只记录环境别名、HTTP path、状态和资源名，不记录完整私有 URL、Cookie、token 或响应体。

## Risks / Trade-offs

- [Vite 8 Node 最低小版本高于宽泛的 Node 20] → package/docs 明确 engine，CI 使用最新 Node 20，Docker/本地 Node 24，并在 build-tooling gate 早失败。
- [Rollup/Rolldown chunk 切分与 Webpack 不同] → 对照入口、chunk 数、raw/gzip 主要 bundle；若明显回退先定位依赖归属，不以手工 chunk 拆分掩盖问题。
- [Web3/CommonJS 依赖只在特定交互加载] → production build 后用浏览器触发 Provider/Web3 相关路径并检查网络、console/page error；兼容修复保持白名单。
- [viem/Web3 使用 BigInt，无法无损降级到 ES2018] → 明确采用 ES2020 build target，与现有 Web3 语义一致；不通过无效转换伪装旧浏览器支持。
- [Vite public/base 语义与 CRA `%PUBLIC_URL%` 不同] → HTML 使用 Vite base 占位，运行时代码统一走 adapter，同时验证根路径与非根 base 构建。
- [现有全量 Jest 有一次迁移前 timeout] → 不提高全局 timeout，不修改无关业务测试；最终全量门禁必须重新通过，失败时按确定性完成条件调查。
- [直接移除 CRACO 可能暴露隐藏 Jest 差异] → 在改 package scripts 后先运行聚焦 Setting/env/i18n tests，再运行全量 `yarn test:ci`；React Scripts 版本和 Jest 配置保持不变。

## Migration Plan

1. 提交并严格校验 proposal/design/spec/tasks，完成实施前 review。
2. 先写 runtime env、语言映射与 build contract 的失败测试，确认 RED。
3. 安装 Vite/React plugin/Less，增加 typed config 与 HTML/入口适配，改 package scripts；完成聚焦 GREEN 与 production build。
4. 同步 CI、Docker/local-dev/docs，执行脚本 dry-run 与 public auth smoke。
5. 运行所有静态/测试/coverage/build 门禁，记录 CRA/Vite 对照与任何回退。
6. 完成浏览器 smoke、预归档 review、单提交收敛和工作分支 push；RC 阶段不 archive、不合入 base、不触碰 `test`，后续仅在明确获得 `self-closeout=true` 授权后同步主规格、archive 并合入约定 base。

回滚方式：在尚未合入 base 前直接放弃工作分支；后续若决定合入但部署验证失败，revert 单个最终 change commit 即可恢复 CRA/CRACO package、config、HTML 和 local-dev 接入点。无需保留第二个 production build 命令。

## Open Questions

无。版本、Node 基线、测试边界、base path、语言清单、兼容策略和从 release candidate 转入 `self-closeout=true` 的授权边界均已确定。
