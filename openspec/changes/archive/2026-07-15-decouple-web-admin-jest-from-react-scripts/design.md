## Context

`web-admin` 的 `start`/`build` 已由 Vite 8.1.4 接管，但 `test`/`test:ci` 仍调用 `react-scripts 5.0.1`。React Scripts 当前隐式注入 Jest 27.5.1、Babel transform、`jest-environment-jsdom`、`react-app-polyfill/jsdom`、`src/setupTests.ts`、CSS/file transforms、CSS Modules mapper、watch plugins、coverage defaults 与 `resetMocks`。最新旧 runner 基线在 Node 24.14.0 / Yarn 1.22.22 下发现 141 suites，并通过 141 suites / 1329 tests；运行前后没有 Git 产物。

测试兼容面包含 137 个直接使用 `@jest/globals` 的 suites、73 个 `jest.mock` suites、66 个 CommonJS `require()` suites、运行时 JSON dynamic import、React lazy import、4 个 fake-timer suites 和大量 jsdom/window/storage 依赖。当前 `babel.config.json` 只面向旧浏览器 production 转译，不能直接承担 TSX/Jest CommonJS transform。与此同时，上游最新 base `fdd7cef0` 已新增 Go hermetic/MySQL/PostgreSQL CI 分层，本 change 不得改写这些 workflow 段。

## Goals / Non-Goals

**Goals:**

- 用仓库自有的显式 Jest 配置完整替代 React Scripts 的测试职责，并把实际使用的 Jest/Babel/jsdom/mapping/watch 包固定为直接开发依赖。
- 保持旧 runner 的 141 条 discovery 路径全部存在，保持全量断言语义和 `yarn test`/`yarn test:ci` 使用体验。
- 移除 `react-scripts` 与同目录重复的 package CRA ESLint 配置，同时保持 Vite、public scripts、production lint、TypeScript gates 和生产入口不变。
- 用配置契约测试、旧/新 `--listTests` 路径集合对照、聚焦 suites 和全量 Jest 证明迁移，而不是通过 ignore、skip、删测或放宽 transform 制造绿灯。

**Non-Goals:**

- 不迁移 Vitest，不升级 Jest major、React、React Router、Testing Library 或业务依赖，不执行 class-to-hooks。
- 不修改生产组件、用户可见 UI、路由、权限、API、认证协议、runtime config、Go fixture/schema 或数据库。
- 不清理既有 React 18 legacy warning、fake-timer warning、Browserslist 基线或 bundle 技术债。
- 不修改 GitHub Actions 的 Go tests、backend、integration、linter、e2e、release 段；若现有 `yarn test:ci` step 无需调整，workflow 保持零 diff。

## Decisions

### 1. 固定当前 Jest 27 兼容线，不把解耦变成升级

显式声明当前 lockfile 已验证的 Jest 27.5.1、`babel-jest`、`jest-environment-jsdom`、`@jest/globals`、`identity-obj-proxy` 和 Jest 27 兼容 watch plugin。版本升级会同时改变 fake timers、jsdom、mock reset、snapshot 与 CLI 行为，应由后续独立 change 评估。

备选方案是直接升级最新 Jest。它会扩大到测试行为迁移，无法把失败归因于“配置显式化”还是“runner 升级”，因此拒绝。

### 2. Jest 使用隔离的 Babel transformer，并保留 CRA preset 语义

新增 `config/jest/babelTransform.cjs`，通过 `babel-jest.createTransformer` 显式关闭外部 `babelrc/configFile`，固定 `babel-preset-react-app` automatic JSX runtime。该 transformer 覆盖 `js/jsx/mjs/cjs/ts/tsx`，保留 Jest hoist、TypeScript/JSX、dynamic import 到 CommonJS 和现有语法插件语义，同时不让 Jest 复用或改写 `babel.config.json` 的 production targets。

备选方案一是直接让 `babel-jest` 读取现有 `babel.config.json`，但它缺少 React/TypeScript preset，会使 TSX 解析失败。备选方案二是重新拼装 `preset-env/react/typescript`，虽然更“纯”，但会无必要改变已验证的 CRA preset 插件集合；本次优先行为等价。

### 3. 一个显式 Jest config 作为测试真值来源

新增根级 `jest.config.cjs`，明确声明：

- `roots`、两条标准 `testMatch`，不新增 `testPathIgnorePatterns`；
- `jest-environment-jsdom`、稳定的 `http://localhost` environment URL、`react-app-polyfill/jsdom`、`src/setupTests.ts`；
- Babel transform、style mock、asset mock 与保留 `default`/`ReactComponent` 的 SVG mock；
- CSS Modules `identity-obj-proxy`、`react-native` mapper、CRA 顺序的 module extensions；
- 显式 node_modules/style-module transform ignore、`resetMocks=true`、`jest-circus/runner`、coverage source/directory/provider/reporters；
- 文件名/测试名 watch plugins。

普通 CSS/Less 返回空对象，CSS/Less Modules 返回 identity proxy，普通资产返回稳定文件名，SVG 额外提供 React component stub。当前源码没有依赖 style import 返回值，但这种映射比继续复制 React Scripts 内部 file transformer更清晰；全量 suites 与样式 topology 聚焦测试负责证明兼容。

### 4. 脚本保持开发 watch 与 CI 确定性

`yarn test` 改为通过 `cross-env` 固定 `BABEL_ENV=test`、`NODE_ENV=test`、空 `PUBLIC_URL` 后进入显式 Jest watch；`yarn test:ci` 额外保持 `CI=true`、`--watchAll=false`、`--runInBand`、`--silent`，但直接调用 Jest CLI。配置不设置全局 `silent`，开发运行仍能看到诊断；也不设置 `--passWithNoTests`，确保 0 tests 失败。仓库没有自有 `.env.test*`/`.env` 文件，本 change 不复制 CRA 的 env-file loader。

备选方案是编写 wrapper 完整复制 CRA 的 git/watch heuristics。当前仓库固定在 Git 工作区，显式环境加 `jest --watch` 已满足开发体验；复制不存在的 env 文件加载和 rejection handler 会继续维护 CRA wrapper 复杂度，YAGNI 拒绝。

### 5. 依赖与 package 配置按实际 owner 收敛

先把 Jest 所需传递依赖转为直接 `devDependencies`，保持聚焦测试 GREEN 后再删除 `react-scripts`。保留 `react-app-polyfill`，因为生产 `src/index.tsx` 仍直接使用。`web-admin/.eslintrc` 已独立定义 parser/presets/plugins/rules，因此删除 package `eslintConfig.extends=react-app`，不为重复配置继续保留 `eslint-config-react-app`。

只删除能证明为 React Scripts 遗留且不再被显式 transformer/ESLint/Vite/public scripts使用的项；Browserslist 与 production Babel 配置不在本 change 顺手清理。

### 6. discovery 以路径集合而非数量验收

在旧 runner 与新 config 下分别执行 `--listTests`，规范化为 repo-relative 路径后比较集合。新配置必须包含旧基线全部 141 条路径；若新增配置契约 suite，则只允许出现可解释的新路径，不允许旧路径缺失。全量 `yarn test:ci` 必须执行真实 tests 并报告 suites/tests，而不是仅依赖静态文件数。

### 7. CI 保持稳定 package contract 并保护上游 Go 写集

GitHub Actions 继续通过 frontend-checks 中的 `yarn test:ci` 调用新 runner，所以默认不修改 workflow。rebase 最新 `origin/hfl-test-base` 后，使用 YAML parse、focused `FrontendCiGates.test.ts` 与 Git diff 审计确认 Go hermetic/MySQL/PostgreSQL/backend/linter 段原样保留；只有 frontend Jest step 确有必要时才允许最小修改。

## Risks / Trade-offs

- [Babel preset 与 React Scripts 内部 transform 仍可能有细微差异] → 使用同版本 `babel-preset-react-app`、隔离外部 Babel config，并运行 dynamic import/CommonJS/auth/provider/application/Management 聚焦 suites 与全量 141+ suites。
- [移除 React Scripts 会同时裁剪隐式 ESLint/Jest 依赖] → 先用 `yarn why` 建立 owner 清单，显式声明真实依赖，使用 frozen lock install、lint、typecheck、public scripts 与 build 验证。
- [开发 watch 命令是长驻进程] → 用短时启动观察确认进入 watch 且发现非零测试，再主动终止；CI 入口单独完成全量非交互验证。
- [旧 runner 基线来自旧 base] → OpenSpec review 后先提交并 rebase 到最新 `fdd7cef0`，重新运行 discovery/full baseline；最终 RC 前再次 fetch/rebase 并重跑关键门禁。
- [全量 Jest 单进程约需 11 分钟] → 聚焦 RED/GREEN 先收敛错误；全量基线与新配置至少各跑一次，final rebase 若源码/依赖未变化可按 closeout 规则复用同一最终源码状态证据，但必须重新执行 discovery、聚焦 suite、OpenSpec、diff 与 build/typecheck 门禁。

## Migration Plan

1. 严格校验 proposal/design/spec/tasks 并完成实施前 review，创建仅含 OpenSpec artifacts 的进度提交。
2. rebase 最新 `origin/hfl-test-base`，确认上游 Go CI 段保留，重新记录旧 runner discovery 与全量 baseline。
3. 先修改 `FrontendCiGates.test.ts` 表达独立 Jest script/config/依赖契约并确认 RED；随后新增显式 config/transform/mocks、更新 scripts/dependencies 并运行聚焦 GREEN。
4. 在显式 Jest 已通过聚焦 suite 后移除 `react-scripts` 与重复 package CRA 配置，更新 lockfile并复跑聚焦/静态门禁。
5. 对照旧/新 discovery 路径集合，运行全量 `yarn test:ci`、coverage 例外评估、typecheck、build-tooling、incremental TS、lint、public scripts、YAML、Vite build 和无产物检查。
6. 完成 pre-archive review；按 `release-candidate-only` 收敛为最新 base 上单个 commit并推送工作分支，不 archive、不合入 base、不触碰 `test`。

回滚方式：release candidate 未合入 base 前直接放弃工作分支；若后续合入后需要回滚，revert 单个最终 change commit即可恢复 React Scripts test scripts/依赖与隐式配置。该回滚不影响 Vite dev/build 或上游 Go CI 分层。

## Open Questions

无。Jest major、Vitest、React 生态升级、Browserslist/production Babel 清理和 React 18 warning 治理均明确留给后续 change。
