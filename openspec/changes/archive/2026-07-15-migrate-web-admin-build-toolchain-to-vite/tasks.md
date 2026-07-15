## 1. 基线与提案

- [x] 1.1 读取适用 AGENTS/DESIGN、技术债基线、CI/build/local-dev/Docker/public scripts，并确认写集与 release-candidate-only 边界。
- [x] 1.2 执行 `git fetch origin --prune`，确认最新 `origin/hfl-test-base`、tracked 初始状态、目标分支和 active OpenSpec change 无写集冲突。
- [x] 1.3 重新运行迁移前 typecheck、build-tooling、incremental TS、public scripts、全量 Jest 与 CRA production build，记录入口、chunk、raw/gzip 主要 bundle 和既有告警/时序风险。
- [x] 1.4 创建 proposal/design/delta specs/tasks，并完成 placeholder、范围、类型命名与规格覆盖自审。

## 2. Typed env 与语言加载 TDD

- [x] 2.1 为 public base 规范化、mode 判断和公共资源 URL 拼接编写 Jest 失败测试，运行聚焦 suite 确认因 adapter 尚不存在而 RED。
- [x] 2.2 实现 `src/config/runtimeEnv.ts` 与 Vite build constants 类型声明，迁移 `Conf.ts`、`ManagementPage.tsx`、`serviceWorker.ts` 并运行聚焦 Jest 确认 GREEN。
- [x] 2.3 为 11 种应用语言、region suffix 与未知语言 fallback 编写失败测试，确认现有动态路径无法满足 typed loader contract。
- [x] 2.4 实现显式应用 locale loaders 与国家 locale map，迁移 `i18n.ts` 和 `Setting.initCountries()`，运行聚焦 Jest 确认 GREEN。
- [x] 2.5 对 env/locale 受影响实现运行 changed-file coverage，补齐有价值的边界断言并确认统计对象达到 85%。

## 3. Vite 工具链与入口切换

- [x] 3.1 增加 Vite 8、React plugin 6、Less 4 直接开发依赖和 Node engine，更新 lockfile；保留 React Scripts/Jest，移除 CRACO/craco-less/mv dev-build 依赖与脚本。
- [x] 3.2 增加 typed `vite.config.ts`，配置 7002/strictPort、代理 matcher、Less、HMR overlay、ES2020 build、`build` 输出、bounded Buffer/CommonJS fallback 和 build constants。
- [x] 3.3 将 CRA `public/index.html` 迁移为 Vite 根 `index.html`，使用 Vite base 占位和 module 入口；把 ResizeObserver preflight 固定为应用首个 side-effect import。
- [x] 3.4 更新 `tsconfig.build-tooling.json` 与 package scripts，建立排除 `*.test.*` 的显式 production-source `lint`、`typecheck:build-tooling`、唯一 Vite `start`/`build` 和 React Scripts Jest 入口。
- [x] 3.5 运行 build-tooling typecheck、聚焦 Jest、public scripts 和首次 Vite production build；按实际错误最小化修复 Web3/MetaMask/Web3 Onboard/Buffer/CommonJS 兼容，不添加通用 Node polyfill。
- [x] 3.6 使用受控非根 `PUBLIC_URL` 执行第二次 build，检查 HTML、动态 chunk 与 public asset base 后恢复默认根路径 build。

## 4. CI、Docker、local-dev 与稳定文档

- [x] 4.1 更新 GitHub Actions frontend checks，显式运行 app/build-tooling typecheck、incremental TS、public scripts check/build/smoke、非修改 lint 与全量 Jest，并保持 build job 依赖关系。
- [x] 4.2 检查并按需更新 Docker 前端构建说明/Node contract，确认仍只执行 `yarn build` 并复制 `/web-admin/build`，不触碰 Go runtime config。
- [x] 4.3 将 `start-frontend-remote-backend.ps1` 的 CLI 解析、workspace 进程归属与 dry-run 文案从 CRACO 改为 Vite；运行脱敏 dry-run/status 验证。
- [x] 4.4 更新根 README、local-dev README、DESIGN 和 `web-admin/AGENTS.md` 中稳定的工具链/Node/验证事实，删除过期 CRA/CRACO 默认说明，不复制长任务状态。

## 5. 全量自动化验证与构建对照

- [x] 5.1 运行 `openspec validate migrate-web-admin-build-toolchain-to-vite --strict`、`git diff --check` 与 OpenSpec 文档语言/脱敏检查。
- [x] 5.2 运行 `yarn typecheck`、`yarn typecheck:build-tooling`、incremental TS gate 和显式非修改 `yarn lint`。
- [x] 5.3 运行 `yarn public-scripts:check`、`yarn public-scripts:build`、`yarn public-scripts:smoke`，确认生成脚本内容无意外 diff。
- [x] 5.4 运行全量 `yarn test:ci`，必须取得真实 suite/test 总数与零失败；若既有 timeout 重现，按确定完成条件调查而非提高全局 timeout。
- [x] 5.5 运行默认根路径 `yarn build`，统计 Vite JS/CSS 文件数量、raw/gzip 合计、入口和主要 chunk，与 CRA 基线对照并记录任何明显回退或回退理由。

## 6. 浏览器与交付收口

- [x] 6.1 启动 Vite dev server，验证 `yarn start` 默认 7002、代理路径、首页、登录壳、刷新、OIDC/CAS callback route 与 console/page error。
- [x] 6.2 用 production build 静态服务验证 history fallback、根/非根 base、public auth scripts、Provider/Web3/MetaMask/Web3 Onboard 相关模块或懒加载 chunk，无 Buffer/global/process/CommonJS error。
- [x] 6.3 将脱敏命令、构建对照、浏览器证据、coverage、证据层级和剩余风险写入 `verification.md`，不记录完整私有 URL、Cookie、token 或账号凭据。
- [x] 6.4 完成 OpenSpec 预归档 review 和注释/语言/交付单元检查，但按 release-candidate-only 不 archive、不合入 base、不触碰 `test`。
- [x] 6.5 将本 change 收敛为基于最新 `origin/hfl-test-base` 的单个最终 commit，复跑关键验证，推送 `hfl-test/migrate-web-admin-build-toolchain-to-vite`。
- [x] 6.6 结构化回传 workspace/change/branch/HEAD/base/changed_files/validation/build comparison/browser evidence/remaining risk，并标记 `push_test=false`、`lease_release=false`、`needs_master_decision=true`。
