## Context

当前 `web-admin` 使用 Bun 1.3.14、Vite 8.1.4、React/ReactDOM 18.2 和 TypeScript 5.7.3，应用 dev/build 已不依赖 CRA，但单元测试仍由 Jest 27.5.1、`babel-jest`、`jest-environment-jsdom`、`babel-preset-react-app`、`identity-obj-proxy` 与四个 Jest support mock 驱动。`bun run test:ci` 仍包含 `--runInBand --silent`，CI unit step标签和 `FrontendCiGates.test.ts` 也把 Jest 作为活动真值。

最新 base 的静态审计和 Jest `--listTests` 均发现 157 个测试文件；Jest 全量基线为 1503 tests。迁移面包含 153 个 `@jest/globals` owner、116 个 `jest.*` owner、77 个 module mock owner、48 个 mock factory 内 `require("@jest/globals")` owner（148 处）、71 个 CommonJS `require` owner、37 个 `__dirname` owner、5 个 fake timer owner，以及 2 处 `requireActual`（分布在 2 个 owner）和 1 处 `jest.isolateModules`。实施前重新执行的静态命令纠正了 dispatch 中“1处 requireActual”的初始统计，不改变既定 partial mock 迁移策略。这些不是简单的包名替换：Vitest 的 hoist、ESM module graph、module cache、mock factory、timer 与 reset 行为需要逐类验证。

注册表在设计时点的可复核结果为：`vitest@4.1.10` 支持 Node `^20 || ^22 || >=24`、Vite `^6 || ^7 || ^8`；`jsdom@29.1.1` 要求 Node `^20.19 || ^22.13 || >=24`，与仓库 22.12.0 下界冲突；`jsdom@28.1.0` 精确支持 `^20.19 || ^22.12 || >=24`。仓库当前 `^20.19.0 || >=22.12.0` 还会错误接纳Vitest不支持的Node 23，因此活动Node engines必须收窄为三者交集 `^20.19.0 || ^22.12.0 || >=24.0.0`，版本选择不能依赖latest漂移。

本 change 是纯测试工具链迁移。它不改变 production truth owner：生产页面、路由、API、认证/provider、Go runtime、数据库和 Vite build 输出均保持不变。验证也不依赖 60 环境。

## Goals / Non-Goals

**Goals:**

- 将开发与 CI 单元测试原子迁移到 Vitest 4.1.10，并在最终候选中只保留一个 runner 真值。
- 保留 157/157 规范化测试路径，测试数不少于 1503，全部 0 failure，且不降低断言、mock、timeout、warning 或 coverage 契约。
- 用显式 Vitest/jsdom/setup/asset/coverage 配置替代 Jest+Babel 专属测试链，并保持初始单 worker、文件串行语义。
- 对 hoist、ESM/CJS、module cache、fake timer、resetMocks、React act 与 runtime warning 建立可归因迁移路径和直接契约测试。
- 更新 package、lock、CI、文档和 OpenSpec 主规格，使活动真值只指向 Bun + Vitest + Vite + Playwright。

**Non-Goals:**

- 不升级 React、ReactDOM、React Router、Vite、TypeScript、Playwright、Ant Design、Bun、Node runtime或生产依赖；Node engines只收窄为已选工具链共同支持范围。
- 不修改 production 组件、业务行为、路由、API、后端、schema、认证/provider、Docker、Makefile、Playwright 实现或 60 环境。
- 不在本 change 做 Vitest 并行化、sharding、browser mode、性能调优或测试架构重写；性能只记录同硬件、同模式基准，不作为采用理由。
- 不保留永久双跑、`@jest/globals` alias、global `jest = vi`、warning suppression、`passWithNoTests`、skip/only 或扩大 mock。
- 不清理仍有活动owner的production Babel/browser compatibility、历史OpenSpec archive或普通业务测试设计债；删除经审计无owner的Babel config/dependency属于本次测试工具链收敛。

## Decisions

### 1. 采用原子迁移，双跑只作为工作分支中的短期证据

实施先在同一 base/依赖状态记录 Jest discovery、test count 和 non-silent warning 分类，再引入 Vitest 并按测试簇迁移。中间提交可以同时保留 Jest 与 Vitest 以定位差异，但 `test`、`test:ci`、CI、主规格和最终依赖在候选提交中必须只调用 Vitest，Jest config/support/dependencies 必须全部退役。

考虑过三种方案：

1. **原子切换（采用）**：临时双跑对照，最终单 Vitest 真值。优点是可以逐类定位兼容问题，同时最终状态清晰；代价是迁移分支中期需要维护两套短期命令。
2. **永久双 runner（拒绝）**：回滚容易，但会让 CI、依赖、主规格和 warning/coverage 形成双真值，持续成本最高。
3. **长期按文件分批（拒绝）**：单批风险较小，但 157 文件的 discovery、module graph 和跨 suite timer/warning 泄漏无法形成一次完整等价证明。

### 2. 精确版本与 Node 下界共同决定依赖集合

直接开发依赖固定为 `vitest@4.1.10`、`@vitest/coverage-v8@4.1.10`、`jsdom@28.1.0`、`@testing-library/jest-dom@6.9.1`。保持 Vite 8.1.4与Bun 1.3.14不变，将Node engines收窄为 `^20.19.0 || ^22.12.0 || >=24.0.0`；这与Vite、Vitest和jsdom共同兼容但不要求升级当前CI Node 20.19.0。`@testing-library/jest-dom` setup 从已退役的 `extend-expect` 入口迁移到 `@testing-library/jest-dom/vitest`。

选择 V8 coverage 而非 Istanbul provider：Vitest 4 的 V8 provider直接使用 Vite 转换后的代码并支持 Istanbul reporter 输出，可移除测试专属 Babel instrumentation；本 change 不把 coverage 数值与 Jest provider逐点相等作为成功标准，但必须保持 production source 收集范围、报告格式和可审计性。若实现验证发现现有消费者依赖Babel/Istanbul特有字段且V8无法提供等价输出，则阻止RC并先修订OpenSpec设计；不得在未更新设计的情况下自动切换provider或恢复Jest。

### 3. 独立 typed Vitest 配置复用 Vite 转换生态，不修改 production Vite 配置

新增 `web-admin/vitest.config.ts`，由 `vitest/config` 与 `@vitejs/plugin-react` 提供 TS/TSX/JS/JSX、automatic JSX runtime、dynamic import 和 Vite module graph。配置纳入 `tsconfig.build-tooling.json`，但不改 `vite.config.ts` 的 production dev/build 行为。

测试配置固定：

- `environment: "jsdom"`，URL 为 `http://localhost`；setup 使用 `src/setupTests.ts`。
- `globals: false`，所有测试显式从 `vitest` 导入 `describe/test/expect/vi` 等 API，避免隐式全局和兼容 alias。
- `maxWorkers: 1`、`fileParallelism: false`、`sequence.concurrent: false`，初始保持与 `--runInBand` 相当的单 worker、文件串行行为；测试 case 仍默认非 concurrent。
- `isolate: true`、`mockReset: true`，对应当前每文件隔离与 `resetMocks: true`；通过直接契约测试确认 spy/mock implementation 的实际 reset 差异。
- discovery 仅覆盖 `src/**/__tests__/**/*.{js,jsx,ts,tsx}` 与 `src/**/*.{spec,test}.{js,jsx,ts,tsx}`，不配置排除测试路径、不允许 0-test success。
- coverage include 为 `src/**/*.{js,jsx,ts,tsx}`，排除 `*.d.ts`、测试文件、`__tests__` 与既有非 production 类型；目录保持 `coverage`，reporters 保持 `text/json/lcov/clover`。

`bun run test` 使用 Vitest watch 入口；`bun run test:ci` 使用 `vitest run`。两个脚本只调用 Vitest，不使用 `bun test`，不包含 `--silent` 或 `--passWithNoTests`。单 worker/file-serial 优先固化在 config，并由脚本契约测试防止 CLI 覆盖回退。

### 4. 样式、CSS Modules、SVG 与普通资产使用 test-only 明确替身

Vitest config 只在测试边界为以下扩展建立有序 alias/support：

- CSS/Less Modules 返回稳定 class-name proxy；
- 普通 CSS/Less/Sass/Scss 返回空 style module；
- SVG 同时提供确定性 default filename 与可渲染 `ReactComponent` named export；
- 图片、字体、音视频等普通资产返回确定性 file stub。

这些 support 文件使用TS/TSX并有直接契约测试，不复用production Vite alias，不影响build。CSS Modules固定使用仓库自有typed proxy，最终移除 `identity-obj-proxy`，不把Jest mapper依赖带入Vitest真值。

### 5. mock/hoist 迁移按语义分类，不做全局文本替换

153 个 import owner 将 `@jest/globals` 改为 `vitest`，116 个 API owner将 `jest.*` 改为等价 `vi.*`，但以下类别采用专门规则：

- **hoisted factory**：factory 使用 `vi` 的静态 import；依赖外层可变值时使用 `vi.hoisted`。删除 48 个 factory 内动态 `require("@jest/globals")`，不以 alias 绕过 hoist。
- **partial mock**：`auth/WeComLoginPanel.test.tsx` 与 `ManagementPage.shell.test.tsx` 的 2 个 antd partial mock owner改为 async factory + `await vi.importActual<typeof import("antd")>("antd")`，保留原模块 exports 后只覆盖目标 owner。
- **module isolation**：Vitest 4.1.10 无 `vi.isolateModules`。唯一 owner改为 `vi.resetModules()`、动态 `import()`、必要的 `vi.doMock`/spy 与显式 cleanup，验证 createRoot/cleanup 行为而不依赖同步 CommonJS cache 沙箱。
- **CommonJS require**：静态 require 改为 import；需要按测试步骤重新加载模块时改为动态 `import()`；确有 Node CJS fixture 需求时使用 `createRequire(import.meta.url)` 并记录 owner，不能保留无解释的 require 批量兼容。
- **`__dirname`**：改为 `fileURLToPath(import.meta.url)` + `path.dirname`，或在只需要 workspace 根时使用可验证的 `process.cwd()`；不得注入全局 `__dirname` shim。
- **module cache**：每个依赖 cache reset 的 suite 显式调用 `vi.resetModules` 并重新 dynamic import；不得在全局 setup 每 test 清空所有模块。

### 6. fake timer、mock reset 与 warning 可见性是一级验收风险

5 个 fake timer owner逐个验证启用时点、`advanceTimersByTime`/pending timers、microtask 提交、`setSystemTime` 与 real timer恢复。异步 timer优先使用 Vitest async timer API，且推进操作继续包在 React `act` 中。不得用全局 `clearAllTimers`、提高 timeout 或 warning filter隐藏 native timer/act 问题。

迁移前后都执行固定环境、non-silent、非 watch、单 worker全量命令，对 React act、FakeTimers/native timer、AntD/runtime 和其它 console warning 分类。owner warning 不得新增；既有第三方 warning必须继续可见并记录脱敏计数。`test:ci` 去掉 `--silent`，CI 日志成为活动诊断证据。

### 7. 依赖删除以 owner 审计为准

最终必须移除 `jest@27.5.1`、`@jest/globals@27.5.1`、`babel-jest@27.5.1`、`jest-environment-jsdom@27.5.1`、`jest-watch-typeahead`、`babel-preset-react-app`、`jest.config.cjs` 与 `config/jest/**`。

Babel 与 asset 依赖逐项分类：

- `@babel/eslint-parser`、`@babel/preset-react`、`@babel/preset-typescript`目前由`.eslintrc`直接使用，`@babel/core`是parser/plugin-react基础依赖；最新base审计确认这四项有活动owner，设计选择保留并在实施时复核。
- `@babel/preset-env`、`@babel/plugin-proposal-private-property-in-object`与`babel.config.json`在最新base除自身声明外无活动脚本/config owner；设计选择删除，并在最终base再次审计后执行。
- `identity-obj-proxy`与Jest file/style/SVG mocks由自有typed Vitest support替代并删除。

更新 `bun.lock` 后，统一安装完整性检查动态枚举 direct dependencies，并把 critical entry 从 Jest CLI 改为 Vitest、Vite、Playwright、React/ReactDOM 与 coverage provider；不得通过硬编码旧 direct/critical 数量掩盖依赖变化。

### 8. OpenSpec 与技术债文档收敛为单真值

新增 `web-admin-vitest-toolchain` 主能力；`web-admin-jest-toolchain` delta 删除全部活动 requirements。sync-specs 归档后必须确认旧 capability不再声明可执行 Jest runner：若 archive 工具保留空 spec 文件，则在同一 archive/sync-specs 操作中删除该空主规格，不能留下 Jest/Vitest 双 runner真值。

同步修改测试基线、Bun、Vite、warning owner、增量 TypeScript 当前入口和 Playwright隔离契约。其它主规格中仅作为历史 change 验证名称出现的 Jest 字样不自动改写；任何仍规定当前可执行命令、当前 runner版本或当前 CI门禁的 normative clause必须迁移为 Vitest/通用单元测试表述。最终通过 scoped 主规格审计区分“活动真值”与 archive历史证据。

`docs/admin-technical-debt-baseline-2026-07-14.md` 更新为当前 Bun 1.3.14 + `bun.lock` 已采用状态，并将 Jest/Vitest迁移列入完成基线；不重写旧 NO-GO archive。

## Risks / Trade-offs

- [Vitest hoist 与 Jest factory 闭包规则不同] → 对 77 个 module mock owner分组迁移，使用 `vi.hoisted` 和 async `vi.importActual`，先跑聚焦 suite再扩大到全量。
- [ESM module graph 不提供 Jest 的同步 `isolateModules` 和默认 `__dirname`] → 使用 `vi.resetModules` + dynamic import、`fileURLToPath`/`createRequire` 的局部替代，并为唯一高风险 owner建立直接回归。
- [Vitest `mockReset` 与 Jest `resetMocks` 在 spy/implementation 恢复上存在细节差异] → `FrontendCiGates` 与代表性 mock suite直接断言 reset/restore行为；发现差异时修测试 owner，不用全局兼容层。
- [V8 coverage 与 Babel coverage 的数值映射可能不同] → 固定include/exclude/reporters和可消费产物，不把数值相等当作迁移成功；任何现有消费者不兼容且无法等价输出时阻止RC并修订设计。
- [CSS/SVG alias 顺序或 ESM export 语义导致隐蔽缺失] → support contract test同时加载 module CSS、普通 style、普通资产和 SVG default/ReactComponent，并跑相关 style topology/组件 suite。
- [去掉 `--silent` 使 CI 日志增加] → 保留 warning 可见性是明确目标；只记录同模式耗时与日志规模，不通过 suppression换取整洁输出。
- [157 文件机械迁移产生审查噪声] → 按 import/API、mock factory、CJS/cache、timer四类提交和验证，最终收敛为单一 change commit；禁止顺手重构业务测试。
- [Bun lock 更新暴露 Windows依赖物化问题] → 复用标准 Windows默认cache入口与 Linux frozen入口，验证 lock hash/direct/critical完整性；不设置 custom cache、不部署 60。

## Migration Plan

1. 在最新 base记录 Jest 157-path列表、1503+ test全量结果、non-silent warning分类、coverage报告形态、Playwright 19/22 discovery和同硬件耗时。
2. 先更新/新增 toolchain contract tests表达 Vitest脚本、配置、support、依赖、CI、warning、coverage和OpenSpec单真值，使用当前Jest状态确认预期 RED。
3. 添加精确 Vitest/jsdom/jest-dom/coverage依赖、typed config/setup/support，建立最小 Vitest smoke；短期保留 Jest命令用于对照。
4. 按 import/API → hoisted mocks/partial mock → CJS/cache/`__dirname` → fake timers/warnings 的顺序迁移157个测试文件，每批运行聚焦 Vitest并复核无删测/skip/only/suppression。
5. 对照 Jest/Vitest规范化path集合157/157，运行全量non-silent Vitest，测试数不得低于1503且0 failure；使用V8 coverage检查text/json/lcov/clover与既有消费者，无法等价时阻止RC并修订设计。
6. 删除Jest配置/support/dependencies与无owner依赖，更新Bun lock/完整性检查、package scripts、CI、FrontendCiGates、AGENTS/README/技术债文档和相关主规格；最终脚本只调用Vitest。
7. 执行Windows标准default-cache安装、Linux frozen入口、app/build-tooling/E2E typecheck、增量TS、lint、public scripts、Vite build、Playwright 19/22 discovery、OpenSpec strict和diff卫生；不部署60。
8. 完成pre-archive review后收敛为latest base上的单一逻辑commit并推送工作分支。回滚以revert整个commit恢复Jest工具链；不得局部恢复Jest依赖或双runner。

## Open Questions

无。runner、版本、jsdom下界、V8 coverage provider、串行语义、兼容层禁令、warning/coverage/discovery门禁、文档/主规格收敛和无60验证均已收口。
