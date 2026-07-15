## Why

`web-admin` 的应用开发与生产构建仍依赖 CRA 5、CRACO 6 和自定义 Webpack 适配，Node 24 已出现弃用警告，构建配置、环境变量和静态资源约定也分散在 CommonJS 脚本与业务源码中。现有 Jest/CI 稳定基线已经收口，现在可以在不升级 React、Router、Testing Library 或测试运行器的前提下，独立迁移应用 dev/build，降低后续构建维护成本并保留可验证回退证据。

## What Changes

- 使用 typed `vite.config.ts` 接管 `yarn start` 与 `yarn build`，保持开发端口 `7002`、既有后端代理路径和 `web-admin/build` 交付目录。
- 将 Less、HMR overlay、ResizeObserver preflight、受控 Node/CommonJS 兼容和静态资源 base path 迁移为 Vite 可验证配置；不引入无边界全局 Node polyfill。
- 建立 typed build/runtime env adapter，集中处理 `PUBLIC_URL`、运行模式和公共资源 URL；将国家语言包和应用翻译加载改为 Vite 可静态分析的显式映射。
- 保留 Jest 与 React Scripts 测试基线，不引入 Vitest，不升级 React、React Router、Testing Library，也不执行 class-to-hooks 或业务页面视觉重做。
- 同步 CI、Docker/local-dev 接入点与稳定文档，显式保留 app/build-tooling typecheck、增量 TypeScript、Jest、public scripts、非修改 lint 和 production build 门禁。
- 在切换前记录 CRA 入口、chunk 和主要 bundle；切换后记录同口径 Vite 产物与回退项，并完成首页、登录壳、刷新、OIDC/CAS callback、Provider/Web3 懒加载、console/page error 和 base path 浏览器 smoke。
- CRA/CRACO 只保留迁移前证据与 Jest 所需的 React Scripts 能力，不长期维护第二个默认 production build。

## Capabilities

### New Capabilities

- `web-admin-vite-build-toolchain`: 定义 Vite dev/build、代理、环境与静态资源适配、兼容边界、交付产物和运行态 smoke 的稳定契约。

### Modified Capabilities

- `web-admin-incremental-typescript`: 将应用 production build 从 CRACO/React Scripts 改为 typed Vite 工具链，同时保持 TS/TSX 稳态与增量门禁。
- `web-admin-test-baseline-and-ci-gates`: 在保留全量 Jest 基线的同时，扩展前端 CI 显式门禁，避免 CRA build 隐式 lint 能力丢失。
- `admin-local-dev-workflow`: 将本地前端开发服务器和远端后台预览脚本从 CRACO 切换到 Vite，保持既有端口、代理目标和进程归属安全约定。

## Impact

- 影响 `web-admin` 的 package/lockfile、Vite 与 TypeScript 构建配置、HTML 入口、环境/语言适配、入口 preflight 和少量兼容代码。
- 影响 `.github/workflows/build.yml`、`local-dev` 前端启动脚本与文档、`deploy/Dockerfile` 构建契约说明、根 `README.md`/`DESIGN.md` 的稳定工具链事实，以及本 change OpenSpec artifacts。
- 新增当前稳定 Vite、React plugin 与 Less 直接开发依赖；Node 基线明确为 `^20.19.0 || >=22.12.0`，覆盖 CI 最新 Node 20、Docker Node 24 和当前本地 Node 24。
- 不改变 Admin Go runtime config、Go fixture/schema、后端 API、权限、认证协议或真实 credential；不部署或修改测试/生产环境。
