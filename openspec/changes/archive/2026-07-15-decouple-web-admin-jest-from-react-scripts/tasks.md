## 1. 最新基线与实施门禁

- [x] 1.1 完成 proposal/design/spec/tasks 的 placeholder、范围、命名、语言与需求覆盖自审，运行 `openspec validate decouple-web-admin-jest-from-react-scripts --strict` 和 `git diff --check`。
- [x] 1.2 按实施前 review 清单审计 artifacts 与代码落点，修复所有 Blocking/Fixable 问题并取得 implementation-ready 结论。
- [x] 1.3 提交 OpenSpec 进度后 fetch/rebase 最新 `origin/hfl-test-base`，确认 HEAD 包含 `fdd7cef0` 的 Go hermetic/MySQL/PostgreSQL/backend CI 分层且工作区 clean。
- [x] 1.4 在最新 base 上用旧 `react-scripts` 入口重新执行 `yarn test:ci --listTests` 与全量 `yarn test:ci`，保存规范化 discovery 路径集合、suite/test 数、耗时、既有 warning 和运行前后 Git status。

## 2. 显式 Jest 配置 TDD

- [x] 2.1 先修改 `web-admin/src/FrontendCiGates.test.ts`，断言 `test`/`test:ci` 不再调用 `react-scripts`、test 环境与直接 Jest 参数稳定、显式配置/transform/mocks/discovery/coverage 字段存在且不配置 tests ignore；用旧 runner 聚焦执行并确认因新配置尚未落地而 RED。
- [x] 2.2 新增 `web-admin/jest.config.cjs` 与 `web-admin/config/jest/babelTransform.cjs`，显式配置 roots/testMatch、jsdom URL、setup files、TS/TSX/JS/JSX transform、transform ignore、module extensions、resetMocks、circus runner、watch plugins 和 coverage。
- [x] 2.3 新增普通 style、通用 asset 与 SVG mocks，配置 CSS/Less Modules identity proxy、普通 styles/assets 与 SVG mapper，保留 SVG default/`ReactComponent` 语义。
- [x] 2.4 更新 `web-admin/package.json` 的 `test`/`test:ci` scripts 和显式 Jest 27/Babel/jsdom/mapper/watch devDependencies，保持 Vite/public/typecheck/lint scripts 与生产 dependencies 不变；聚焦执行 `FrontendCiGates.test.ts` 确认 GREEN。

## 3. React Scripts 依赖收敛

- [x] 3.1 在显式配置聚焦 GREEN 后移除 `react-scripts` 和重复的 package `eslintConfig`，保留生产入口使用的 `react-app-polyfill` 与显式 transformer 实际需要的 Babel 包。
- [x] 3.2 使用 Yarn 1 更新 `web-admin/yarn.lock`，运行 `yarn why`/lockfile 搜索确认无 `react-scripts`，并确认 Jest 27、`@jest/globals`、Babel preset、jsdom、identity proxy 与 watch plugin 具有直接 owner。
- [x] 3.3 运行 frozen lockfile 安装验证和 `yarn lint`，确认 `.eslintrc` 独立生效且移除 package CRA preset 未改变 production-source lint 结果。

## 4. Discovery 与高风险兼容回归

- [x] 4.1 用新显式配置运行 `yarn test:ci --listTests`，将 repo-relative 路径集合与最新旧 runner 基线逐项比较；旧 141 条路径必须全部保留，0 tests、缺失路径、ignore/skip/delete 均视为失败。
- [x] 4.2 聚焦运行 auth/provider/application/Management、`FrontendCiGates`、`App` lazy import、`config/runtimeEnv`、`config/supportedLocales`、`StyleModuleTopology` 与 4 个 fake-timer suites，确认 CommonJS/ESM、dynamic import、jsdom globals、mocks、timers 与默认 timeout 语义保持。
- [x] 4.3 运行完整 `yarn test:ci`，记录真实 suites/tests/耗时与零失败；不得使用 `--passWithNoTests`、提高 timeout、skip、删除测试或全局 warning suppression。
- [x] 4.4 评估 changed implementation/config coverage：若最终只改 Jest/package/test 配置与契约测试，则记录 production implementation coverage 为 N/A，并以配置契约测试、discovery parity、聚焦与全量 Jest 作为替代证据；如出现生产实现改动，必须对受影响文件运行 coverage 并达到 85%。

## 5. Vite、静态门禁与产物卫生

- [x] 5.1 依次运行 `yarn typecheck`、`yarn typecheck:build-tooling`、`node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base` 和非修改 `yarn lint`。
- [x] 5.2 依次运行 `yarn public-scripts:check`、`yarn public-scripts:build`、`yarn public-scripts:smoke` 与 `yarn build`，确认 Vite 8.1.4、`web-admin/build` 和 public auth scripts 不依赖 React Scripts。
- [x] 5.3 解析 `.github/workflows/build.yml` YAML 并运行 `FrontendCiGates.test.ts`，确认 frontend Jest step 仍调用 `yarn test:ci`，且最新 base 的 Go hermetic/integration/backend/linter 段未被本 change 修改。
- [x] 5.4 在测试、public scripts 和 build 前后检查 `git status`，清理 ignored 验证产物并确认无 tracked/untracked coverage、build、public 生成差异或测试缓存进入交付写集。
- [x] 5.5 运行 `openspec validate decouple-web-admin-jest-from-react-scripts --strict`、`openspec validate --changes --strict`、`git diff --check` 和 OpenSpec 语言/脱敏扫描。

## 6. Pre-archive review 与 release candidate 收口

- [x] 6.1 将命令、discovery 对照、全量 Jest、聚焦 suites、coverage N/A/结果、静态/构建门禁、workflow 审计、产物卫生、证据层级与剩余风险写入中文 `verification.md`，不包含私有 URL、凭据或环境敏感信息。
- [x] 6.2 完成 OpenSpec pre-archive review 的 artifacts/spec 语言、最终代码、测试质量、coverage、注释、Vite/CI 兼容、主规格同步预期和交付单元循环，修复所有 Blocking 后取得 READY。
- [x] 6.3 最终再次 `git fetch origin --prune` 并 rebase 最新 `origin/hfl-test-base`；若 base 变化，重新确认 Go CI 段并按触达面重跑 discovery、聚焦/全量 Jest、typecheck、YAML 与 build。
- [x] 6.4 将 change 收敛为最新 base 上单个最终 Conventional Commit，确认 `<base>..HEAD` 正好 1 个提交、工作区 clean，推送 `hfl-test/decouple-web-admin-jest-from-react-scripts`。
- [x] 6.5 按 `release-candidate-only` 结构化回传 workspace/change/branch/HEAD/base/changed_files/discovery comparison/full Jest/coverage/validation/remaining risk/subagent usage/push，并标记 `archive=false`、`push_test=false`、`lease_release=false`、`needs_master_decision=true`。
