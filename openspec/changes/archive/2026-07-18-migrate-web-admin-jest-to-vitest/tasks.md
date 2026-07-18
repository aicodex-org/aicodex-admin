## 1. 最新基线与迁移证据

- [x] 1.1 Fetch并rebase最新 `origin/hfl-test-base`，确认active changes、write set/resource locks、branch/HEAD、工作区clean与production写集禁令仍成立。
- [x] 1.2 在最新base复核并记录精确版本兼容：Bun 1.3.14、Vite 8.1.4、Vitest 4.1.10、jsdom 28.1.0、jest-dom 6.9.1与coverage provider 4.1.10；将Node engines收窄为共同兼容的 `^20.19.0 || ^22.12.0 || >=24.0.0`，不得接纳Node 23或采用Node下界冲突的jsdom latest。
- [x] 1.3 重新统计并保存迁移面清单：157 test files、153 `@jest/globals`、116 `jest.*`、77 module mocks、48 files/148处factory动态require、71 require、37 `__dirname`、5 fake-timer owners、2处requireActual（2个owner）、1 isolateModules；实施前复测纠正了dispatch中的1处requireActual初始统计。
- [x] 1.4 在同一base执行Jest规范化discovery、全量non-silent串行测试与coverage，记录157 paths、至少1503 tests、0 failure、warning分类、reporter产物形态、同硬件耗时和运行前后Git状态。
- [x] 1.5 执行 `bun run test:e2e:list` 与现有app/build-tooling/E2E typecheck基线，记录Playwright 19 files / 22 tests且无skip/only。

## 2. Toolchain 契约 TDD

- [x] 2.1 先修改 `FrontendCiGates.test.ts` 与直接配置契约测试，断言最终 `test`/`test:ci`只调用Vitest、non-silent、single-worker/file-serial、无`passWithNoTests`，并在旧Jest状态确认预期RED。
- [x] 2.2 为typed Vitest config建立RED契约：jsdom URL、setup、globals=false、discovery、mockReset、isolate、worker/file串行、coverage include/exclude/reporters与production Vite隔离。
- [x] 2.3 为CSS Modules、普通style、普通asset与SVG default/`ReactComponent` support建立RED契约，覆盖alias顺序和ESM export语义。
- [x] 2.4 更新Package Manager安装/完整性测试形成RED，要求direct dependency动态计数、Vitest/coverage critical entry与CLI shim存在、Jest CLI不再是关键入口、lock漂移fail-closed。
- [x] 2.5 为活动OpenSpec/文档单真值建立直接审计：最终不保留可执行Jest runner requirement、Jest/Vitest双入口、`@jest/globals` alias或global `jest = vi`。

## 3. Vitest 依赖、配置与 setup

- [x] 3.1 更新 `package.json`，精确添加 `vitest@4.1.10`、coverage provider 4.1.10、`jsdom@28.1.0`与`@testing-library/jest-dom@6.9.1`，并将Node engines收窄为 `^20.19.0 || ^22.12.0 || >=24.0.0`；添加临时迁移对照命令但不替换最终公共脚本前先通过最小smoke。
- [x] 3.2 新增typed `vitest.config.ts`，配置React/Vite transform、jsdom、URL、显式imports、单worker、文件串行、mock reset、isolation、discovery、coverage与test-only aliases；将配置纳入build-tooling typecheck而不修改production `vite.config.ts`行为。
- [x] 3.3 将 `src/setupTests.ts` 迁移到 `@testing-library/jest-dom/vitest`，保留`matchMedia`等现有DOM support且不新增console/timer/module全局兼容层。
- [x] 3.4 新增最小typed style module proxy、style、file与SVG support文件，使对应toolchain contract tests GREEN并移除`identity-obj-proxy`。
- [x] 3.5 运行最小Vitest smoke与toolchain contract tests，确认TS/TSX/JS/JSX、dynamic import、jsdom、matcher、assets与0-test失败语义成立。

## 4. 157 个测试文件分批迁移

- [x] 4.1 将全部 `@jest/globals` import与隐式Jest globals迁移为显式 `vitest` imports，将普通 `jest.*` API迁移为等价 `vi.*`，删除/更新`eslint-env jest`而不改业务断言。
- [x] 4.2 迁移77个module mock owners：删除48个factory内动态`require("@jest/globals")`，使用静态`vi`或`vi.hoisted`处理hoist state；每批运行对应focused suites。
- [x] 4.3 将`auth/WeComLoginPanel.test.tsx`与`ManagementPage.shell.test.tsx`中的2处`requireActual`迁移为async factory + `vi.importActual`，保持partial mock exports与Management shell行为。
- [x] 4.4 将唯一`jest.isolateModules` owner迁移为局部`vi.resetModules`、dynamic import、必要`vi.doMock`/spy与cleanup，继续验证React 18 createRoot和unmount契约。
- [x] 4.5 审计71个`require`与37个`__dirname` owner：静态依赖改import，重新加载改dynamic import，必要Node fixture局部使用`createRequire`/`fileURLToPath`；不得新增全局shim。
- [x] 4.6 迁移5个fake-timer owners，验证启用时点、async timer/microtask、`act`、`setSystemTime`与real timer恢复；禁止全局timer cleanup、sleep或timeout放宽。
- [x] 4.7 迁移局部warning guards与mock reset/restore owner，保持原始console输出、React act/FakeTimers/native timer/AntD/runtime分类可见且无跨suite污染。
- [x] 4.8 每批复核测试文件数、路径、test count、skip/only、mock范围和warning，不得用删测、合并关键断言、suppression或扩大mock换取GREEN。

## 5. 退役 Jest 与依赖 owner 收敛

- [x] 5.1 在Vitest全量聚焦GREEN后删除 `jest.config.cjs`、`config/jest/**`、Jest临时对照命令与最终不再使用的support config。
- [x] 5.2 从package移除Jest 27、`@jest/globals`、`babel-jest`、`jest-environment-jsdom`、`jest-watch-typeahead`与`babel-preset-react-app`。
- [x] 5.3 在最终base复核Babel/asset owner：保留`.eslintrc`/plugin-react所需的`@babel/core`、eslint parser、React/TypeScript presets；删除无owner的env preset、private-property plugin、`babel.config.json`、`identity-obj-proxy`并记录依据。
- [x] 5.4 使用标准Bun入口更新唯一`bun.lock`，验证lock/direct/resolution/React/ReactDOM/Vitest/coverage/Vite/Playwright/`rc-virtual-list`与CLI shim完整，确认无Jest有效依赖路径。
- [x] 5.5 在Windows未设置`BUN_INSTALL_CACHE_DIR`的默认持久cache路径验证标准安装；在Linux/CI等价环境验证同一lock的frozen入口，均不得手工补包、切换package manager或忽略lifecycle。

## 6. CI、文档与 OpenSpec 真值同步

- [x] 6.1 将最终 `bun run test`和`bun run test:ci`收敛为Vitest-only入口，移除`BABEL_ENV`/Jest参数和`--silent`，保持single-worker/file-serial与失败语义。
- [x] 6.2 最小更新 `.github/workflows/build.yml`：保留`frontend-checks` job id和`Front-end checks`名称，只将unit step名称/契约从Jest改为Vitest；保持Go/backend/integration/linter/E2E/release段和Vite build依赖边界不变。
- [x] 6.3 更新 `web-admin/AGENTS.md` 与必要README，将focused/full test、warning、coverage和Bun入口改为Vitest；不写60部署流程或临时状态。
- [x] 6.4 修正 `docs/admin-technical-debt-baseline-2026-07-14.md` 的活动真值：Bun 1.3.14 + `bun.lock`已采用，Jest迁移完成后由Vitest单一runner接管；保留旧NO-GO archive作为历史证据。
- [x] 6.5 完成新Vitest capability、旧Jest requirements退役，以及测试基线、Bun、Vite、warning、增量TypeScript和Playwright delta specs；审计其它主规格，仅迁移仍规定当前执行命令/runner的normative clause，不追溯改写archive历史。
- [x] 6.6 预演sync-specs结果，确认未来archive后旧Jest capability不再声明活动runner；若archive会保留空主规格，记录closeout时删除空spec的明确步骤。

## 7. 完整验证矩阵

- [x] 7.1 规范化对比Jest与Vitest discovery，必须157/157无缺失；最终仓库只保留Vitest discovery命令与证据。
- [x] 7.2 运行全量non-silent、non-watch、single-worker/file-serial Vitest，必须执行不少于1503 tests且0 failure、0 timeout、0 unhandled error。
- [x] 7.3 对React act、FakeTimers/native timer、AntD/runtime和其它warning分类；owner warning不得回退，非owner warning不得因新增filter消失。
- [x] 7.4 运行V8 coverage，验证production JS/JSX/TS/TSX include、d.ts/test排除和text/json/lcov/clover输出及既有消费者；无法等价时阻止RC并先修订OpenSpec设计。
- [x] 7.5 运行 `bun run typecheck`、`bun run typecheck:build-tooling`、`bun run typecheck:e2e`、增量TypeScript gate、`bun run lint`、public scripts check/build/smoke与`bun run build`。
- [x] 7.6 运行 `bun run test:e2e:list`，确认Playwright保持19 files / 22 tests且config/spec/worker/retry无行为修改；不执行60部署。
- [x] 7.7 在同硬件、同single-worker/file-serial模式记录Jest/Vitest全量耗时与资源观察，只作为迁移后基准，不把未经实测性能收益写入采用结论。
- [x] 7.8 全仓审计无活动Jest package/config/import/API/CI/runner真值、无alias/global兼容层、无skip/only/passWithNoTests/silent和迁移新增warning suppression；历史archive术语允许保留，主规格中的旧命令必须由delta迁移或由当前Bun+Vitest单一真值条款明确覆盖。
- [x] 7.9 运行 `openspec validate migrate-web-admin-jest-to-vitest --strict`、`openspec validate --changes --strict`、`git diff --check`、Markdown乱码/placeholder/脱敏与planned write set检查。
- [x] 7.10 将命令、路径对照、test count、warning、coverage、安装、typecheck/lint/build/Playwright、性能基准和剩余风险写入中文 `verification.md`，production implementation coverage记录为N/A。

## 8. Pre-archive review 与 release candidate 收口

- [x] 8.1 完成OpenSpec pre-archive review，迭代修复artifacts、代码、tests、依赖owner、coverage、CI、文档、主规格同步预期与验证证据，直到READY或真实Decision Needed。
- [x] 8.2 最终fetch/rebase最新 `origin/hfl-test-base`；若package/lock/tests/CI/specs受base变化影响，按触达面重跑discovery、全量Vitest、warning、coverage、install与前端门禁。
- [x] 8.3 将本change收敛为latest base上的单个Conventional Commit，确认工作区clean、`<base>..HEAD`正好1个提交并普通push `hfl-test/migrate-web-admin-jest-to-vitest`。
- [x] 8.4 以 `RC_READY` 回传controller，附changed files、157/1503基线、warning/coverage/install/quality matrix、pre-archive review、branch/HEAD/base与remaining risk；保持`archive=false`、`push_test=false`、`lease_release=false`、`needs_master_decision=true`。
