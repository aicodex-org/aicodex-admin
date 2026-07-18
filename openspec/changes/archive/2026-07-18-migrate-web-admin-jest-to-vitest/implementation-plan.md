# Admin Web Vitest 原子迁移 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不改变 Admin 生产行为的前提下，把 `web-admin` 的 157 个单元测试从 Jest 27 原子迁移到 Vitest 4.1.10，并保持 discovery、测试数、warning、coverage、CI 与 Bun 安装契约可审计等价。

**Architecture:** 使用独立 typed `vitest.config.ts` 复用 Vite/React 转换链，测试侧以显式 `vitest` imports、局部 `vi.hoisted`/dynamic import 和 typed asset support 处理 Jest 与 Vitest 的模块语义差异。迁移先记录旧 Jest 基线，再以工具链契约测试制造 RED，最后分批迁移 157 个测试、退役 Jest，并用单 worker/file-serial 全量门禁收口。

**Tech Stack:** Bun 1.3.14、Vite 8.1.4、Vitest 4.1.10、`@vitest/coverage-v8` 4.1.10、jsdom 28.1.0、React 18.2、TypeScript 5.7.3、Playwright 1.61.1、OpenSpec。

---

## 文件职责图

- `web-admin/vitest.config.ts`：唯一 Vitest runner、discovery、串行、jsdom、coverage 与 test-only alias 真值。
- `web-admin/config/vitest/styleModuleProxy.ts`：CSS/Less Modules 稳定 class-name proxy。
- `web-admin/config/vitest/styleMock.ts`：普通 style 空模块替身。
- `web-admin/config/vitest/fileMock.ts`：普通资产稳定 default export。
- `web-admin/config/vitest/svgMock.tsx`：SVG default export 与 `ReactComponent` named export。
- `web-admin/src/setupTests.ts`：jest-dom Vitest matcher 与已有 DOM support，不承载 Jest 兼容层。
- `web-admin/src/FrontendCiGates.test.ts`：runner/config/CI/coverage/单真值契约。
- `web-admin/src/PackageManagerInstall.test.ts`：Bun direct/resolution/critical package 与 CLI 完整性契约。
- `web-admin/scripts/install-with-retry.cjs`：安装后 fail-closed 完整性检查。
- `web-admin/package.json`、`web-admin/bun.lock`：精确依赖、Node engines 与公共脚本真值。
- `web-admin/src/**/*.{test,spec}.{js,jsx,ts,tsx}`：仅迁移测试工具链 API，不改变业务断言。
- `.github/workflows/build.yml`：保留 `frontend-checks` 身份，仅迁移 unit runner 标签与入口。
- `web-admin/AGENTS.md`、`docs/admin-technical-debt-baseline-2026-07-14.md`：稳定工具链与技术债现状。
- `openspec/changes/migrate-web-admin-jest-to-vitest/tasks.md`、`verification.md`：逐项完成状态与脱敏验证证据。

### Task 1: 固化迁移前基线

**Files:**
- Modify: `openspec/changes/migrate-web-admin-jest-to-vitest/tasks.md`
- Create: `openspec/changes/migrate-web-admin-jest-to-vitest/verification.md`

- [x] **Step 1: 核对分支、base 与活动 change**

Run: `git fetch origin --prune; git status --short --branch; git rev-parse HEAD; git rev-parse origin/hfl-test-base; git rev-parse origin/test; openspec list --json`

Expected: 工作区 clean；HEAD 包含已授权设计提交；`origin/hfl-test-base` 为 `89032a5f6a4687b97fa5cbb2427504280881bf3c` 或无冲突的新 base；仅本 change active。

- [x] **Step 2: 保存规范化 Jest discovery 与迁移面统计**

Run: `Set-Location web-admin; bun run test:ci -- --listTests | Sort-Object | Set-Content -Encoding utf8 ..\openspec\changes\migrate-web-admin-jest-to-vitest\jest-test-paths.txt; (Get-Content ..\openspec\changes\migrate-web-admin-jest-to-vitest\jest-test-paths.txt | Where-Object { $_ -match '\.(test|spec)\.[jt]sx?$' }).Count`

Expected: 规范化后恰好 157 个测试路径；同时用 `rg` 复核 153/116/77/48/148/71/37/5/1/1 的迁移面并写入 `verification.md`。

- [x] **Step 3: 运行迁移前 non-silent Jest 与 coverage**

Run: `Set-Location web-admin; Measure-Command { bun x jest --watchAll=false --runInBand 2>&1 | Tee-Object ..\openspec\changes\migrate-web-admin-jest-to-vitest\jest-baseline.log }; bun x jest --watchAll=false --runInBand --coverage 2>&1 | Tee-Object ..\openspec\changes\migrate-web-admin-jest-to-vitest\jest-coverage-baseline.log`

Expected: 157 suites、至少 1503 tests、0 failure；warning 分类与 `coverage/{coverage-final.json,lcov.info,clover.xml}` 形态被记录，日志中的环境细节在提交前脱敏或不纳入 Git。

- [x] **Step 4: 运行迁移前静态与 Playwright discovery 基线**

Run: `Set-Location web-admin; bun run typecheck; bun run typecheck:build-tooling; bun run typecheck:e2e; bun run test:e2e:list`

Expected: 三项 typecheck 通过；Playwright 保持 19 files / 22 tests。

- [ ] **Step 5: 更新基线证据与任务状态**

在 `verification.md` 写入命令、时间、157/1503、warning 分类、coverage reporter、19/22 与 Git 状态；仅在证据成立后勾选 `tasks.md` 1.1–1.5。

### Task 2: 用工具链契约建立 RED

**Files:**
- Modify: `web-admin/src/FrontendCiGates.test.ts`
- Modify: `web-admin/src/PackageManagerInstall.test.ts`
- Modify: `web-admin/src/PackageManagerEntrypoints.test.ts`

- [x] **Step 1: 保持当前 Jest import，仅把直接契约改为最终 Vitest 真值**

RED阶段继续用当前Jest执行这些契约，避免因Vitest依赖尚不存在而产生无意义的module-load error；断言改为：

```ts
expect(packageJson.scripts.test).toBe("vitest");
expect(packageJson.scripts["test:ci"]).toBe("vitest run");
expect(packageJson.scripts["test:ci"]).not.toMatch(/jest|--silent|--passWithNoTests|bun test/);
```

- [ ] **Step 2: 表达 typed Vitest config 与 support 契约**

测试必须读取 `vitest.config.ts` 暴露的配置并断言 `globals: false`、`maxWorkers: 1`、`fileParallelism: false`、`sequence.concurrent: false`、`isolate: true`、`mockReset: true`、jsdom URL、setup、discovery、coverage include/exclude/reporters，以及四类 support 的 ESM export。

- [ ] **Step 3: 表达依赖和安装完整性契约**

断言 package 精确包含 `vitest: "4.1.10"`、`@vitest/coverage-v8: "4.1.10"`、`jsdom: "28.1.0"`、`@testing-library/jest-dom: "6.9.1"`，且不含 Jest runner/Babel-Jest/identity proxy；critical CLI 为 `vitest`、`vite`、`playwright`。

- [ ] **Step 4: 在旧工具链状态验证预期 RED**

Run: `Set-Location web-admin; bun x jest src/FrontendCiGates.test.ts src/PackageManagerInstall.test.ts src/PackageManagerEntrypoints.test.ts --runInBand`

Expected: 因 `vitest.config.ts`、Vitest scripts/support/dependencies 尚不存在而失败；失败不能来自语法拼写或无法加载测试文件。

- [ ] **Step 5: 记录 RED 证据**

把失败命令和代表性预期差异写入 `verification.md`，再勾选 `tasks.md` 2.1–2.5；不得为了让旧 Jest 执行 Vitest import 而添加 alias。

- [ ] **Step 6: 安装 Vitest 后迁移直接契约测试 imports**

在添加Vitest依赖和最小config/support后，将三份直接契约测试改为显式 `vitest` imports并用聚焦Vitest命令验证GREEN；这一步不得保留Jest import兼容层。

### Task 3: 建立 Vitest runner、setup 与 typed support

**Files:**
- Create: `web-admin/vitest.config.ts`
- Create: `web-admin/config/vitest/styleModuleProxy.ts`
- Create: `web-admin/config/vitest/styleMock.ts`
- Create: `web-admin/config/vitest/fileMock.ts`
- Create: `web-admin/config/vitest/svgMock.tsx`
- Modify: `web-admin/src/setupTests.ts`
- Modify: `web-admin/tsconfig.build-tooling.json`
- Modify: `web-admin/package.json`
- Modify: `web-admin/bun.lock`

- [ ] **Step 1: 添加精确依赖与临时聚焦入口**

Run: `Set-Location web-admin; bun add -d --exact vitest@4.1.10 @vitest/coverage-v8@4.1.10 jsdom@28.1.0 @testing-library/jest-dom@6.9.1`

Expected: 只更新 `package.json` 与唯一 `bun.lock`；React/Vite/TypeScript/Playwright 和生产依赖版本不变；Node engines 随后收窄为 `^20.19.0 || ^22.12.0 || >=24.0.0`。

- [ ] **Step 2: 写入最小 typed config**

配置使用 `defineConfig`、React plugin、绝对路径 alias，并固定：

```ts
test: {
  environment: "jsdom",
  environmentOptions: {jsdom: {url: "http://localhost"}},
  setupFiles: [resolve(__dirname, "src/setupTests.ts")],
  globals: false,
  maxWorkers: 1,
  fileParallelism: false,
  sequence: {concurrent: false},
  isolate: true,
  mockReset: true,
  coverage: {
    provider: "v8",
    include: ["src/**/*.{js,jsx,ts,tsx}"],
    exclude: ["src/**/*.d.ts", "src/**/*.{test,spec}.{js,jsx,ts,tsx}", "src/**/__tests__/**"],
    reporter: ["text", "json", "lcov", "clover"],
  },
}
```

- [ ] **Step 3: 写入四类 test-only support**

`styleModuleProxy.ts` 以 Proxy 返回属性名；`styleMock.ts` default export 空对象；`fileMock.ts` default export `"test-file-stub"`；`svgMock.tsx` default export `"test-file-stub"` 并导出渲染 `<svg>` 的 `ReactComponent`。

- [ ] **Step 4: 迁移 setup 并纳入 build-tooling typecheck**

将 matcher 入口改为 `@testing-library/jest-dom/vitest`，保留已有 `matchMedia` 支持；`tsconfig.build-tooling.json` include `vitest.config.ts` 与 `config/vitest/**/*`，不改 production `vite.config.ts`。

- [ ] **Step 5: 运行最小 GREEN**

Run: `Set-Location web-admin; bun x vitest run src/FrontendCiGates.test.ts src/PackageManagerInstall.test.ts src/PackageManagerEntrypoints.test.ts; bun run typecheck:build-tooling`

Expected: toolchain contract tests 和 typed config/support 均通过，无全局 Jest 兼容层。

### Task 4: 分批迁移 157 个测试文件

**Files:**
- Modify: `web-admin/src/**/*.{test,spec}.{js,jsx,ts,tsx}`

- [ ] **Step 1: 迁移显式 imports 与普通 API**

将 `@jest/globals` 改为 `vitest`，将 import 中的 `jest` 改为 `vi`，再将普通 `jest.` 调用改为 `vi.`；每个文件显式导入实际使用的 `describe/test/it/expect/beforeEach/afterEach/beforeAll/afterAll/vi`，删除 `eslint-env jest`。

Run: `Set-Location web-admin; rg -l '@jest/globals|eslint-env jest|\bjest\.' src -g '*.{test,spec}.{js,jsx,ts,tsx}'`

Expected: 普通 owner 清零，特殊 `requireActual`/`isolateModules`/factory owner 留给后续步骤处理。

- [ ] **Step 2: 迁移 hoisted module factories**

删除 factory 内 `require("@jest/globals")`；factory 只需 mock API 时直接使用静态 `vi`，引用声明期外部状态时改为：

```ts
const mocks = vi.hoisted(() => ({request: vi.fn()}));
vi.mock("./module", () => ({request: mocks.request}));
```

按 `src/auth`、`src/backend`、`src/common`、`src/account src/basic src/config src/organizationSync src/provider src/table`、`src` 根目录测试五批运行，确认失败归因于当前 owner 而非扩大 mock。

- [ ] **Step 3: 迁移 partial mock 与 module isolation**

将 `auth/WeComLoginPanel.test.tsx` 与 `ManagementPage.shell.test.tsx` 的 antd partial mock 改为 async factory + `await vi.importActual<typeof import("antd")>("antd")`；将 `ReactTestingLibraryCompatibility.test.tsx` 的唯一 `isolateModules` 改为 `vi.resetModules()` 后 dynamic `import("@testing-library/react")`，并保留 createRoot/unmount cleanup 断言。

- [ ] **Step 4: 迁移 CommonJS 与路径 owner**

静态 `require` 改静态 import，重新加载改 dynamic import；仅 Node fixture 局部使用 `createRequire(import.meta.url)`。将 `__dirname` 改为 `dirname(fileURLToPath(import.meta.url))` 或有断言约束的 `process.cwd()`。

- [ ] **Step 5: 迁移 fake timers 与 warning guards**

逐个 owner 验证 `vi.useFakeTimers()`、async timer/microtask、`act`、`vi.setSystemTime()` 与 `vi.useRealTimers()`；console spy 只维持既有局部断言，不新增全局 warning filter/restore/clear timers。

- [ ] **Step 6: 每批验证路径与禁用模式**

Run: `Set-Location web-admin; bun x vitest run src/auth; bun x vitest run src/backend; bun x vitest run src/common; bun x vitest run src/account src/basic src/config src/organizationSync src/provider src/table; $rootTests = Get-ChildItem src -File | Where-Object { $_.Name -match '\.(test|spec)\.(js|jsx|ts|tsx)$' } | ForEach-Object FullName; bun x vitest run $rootTests; rg -n '@jest/globals|\bjest\.|require\(["'']@jest/globals["'']\)|\.only\(|\bskip\(' src -g '*.{test,spec}.{js,jsx,ts,tsx}'`

Expected: 聚焦测试 GREEN；无 Jest API、无新增 skip/only、无删测或 warning suppression。

### Task 5: 退役 Jest 并收敛 Bun 安装真值

**Files:**
- Delete: `web-admin/jest.config.cjs`
- Delete: `web-admin/config/jest/babelTransform.cjs`
- Delete: `web-admin/config/jest/fileMock.cjs`
- Delete: `web-admin/config/jest/styleMock.cjs`
- Delete: `web-admin/config/jest/svgMock.cjs`
- Delete: `web-admin/babel.config.json`
- Modify: `web-admin/package.json`
- Modify: `web-admin/bun.lock`
- Modify: `web-admin/scripts/install-with-retry.cjs`
- Modify: `web-admin/src/PackageManagerInstall.test.ts`

- [ ] **Step 1: 审计 Babel 与 asset owner**

Run: `rg -n 'babel-jest|babel-preset-react-app|@babel/preset-env|plugin-proposal-private-property-in-object|identity-obj-proxy|babel\.config|config/jest' web-admin -g '!bun.lock'`

Expected: `.eslintrc` 仍拥有 `@babel/core`、eslint parser、React/TypeScript presets；待删除项除测试专属声明/config 外无 owner。

- [ ] **Step 2: 删除 Jest 专属配置与无 owner 依赖**

从 package 移除 Jest 27、`@jest/globals`、`babel-jest`、`jest-environment-jsdom`、watch typeahead、CRA Babel preset、env preset、private-property plugin、identity proxy；删除上述 config/support 文件。

- [ ] **Step 3: 更新公共脚本和完整性检查**

固定 `test: "vitest"`、`test:ci: "vitest run"`；`install-with-retry.cjs` 动态枚举 direct dependencies，critical packages 包含 Vitest/coverage/Vite/Playwright/React/ReactDOM，critical CLIs 为 Vitest/Vite/Playwright。

- [ ] **Step 4: 更新 lock 并验证标准安装入口**

Run: `Set-Location web-admin; bun install; bun install --frozen-lockfile; bun run deps:install -- --frozen-lockfile`

Expected: 使用 Windows 默认 cache，lock 无漂移；direct/resolution/critical package/CLI 检查全部通过，无 Jest 有效依赖路径。

- [ ] **Step 5: 验证最终单 runner 静态真值**

Run: `rg -n 'jest|@jest/globals|babel-jest|jest-environment-jsdom|jest-watch-typeahead|passWithNoTests|--silent' web-admin/package.json web-admin/src web-admin/config web-admin/scripts .github/workflows/build.yml -g '!*.snap'`

Expected: 活动 runner/config/import/API/CLI 真值中无 Jest；业务词或历史文档另行分类。

### Task 6: 同步 CI、文档与 OpenSpec change 真值

**Files:**
- Modify: `.github/workflows/build.yml`
- Modify: `web-admin/AGENTS.md`
- Modify: `docs/admin-technical-debt-baseline-2026-07-14.md`
- Modify: `openspec/changes/migrate-web-admin-jest-to-vitest/tasks.md`
- Modify: `openspec/changes/migrate-web-admin-jest-to-vitest/specs/*/spec.md`

- [ ] **Step 1: 最小迁移 CI unit step**

保留 job id `frontend-checks` 与名称 `Front-end checks`，只把 unit step 的 Jest 名称/契约改成 Vitest 并继续运行 `bun run test:ci`；不得触碰 Go、integration、E2E、release 段。

- [ ] **Step 2: 更新稳定工具链说明**

`web-admin/AGENTS.md` 改为 focused/full Vitest 命令、non-silent warning 与 V8 coverage；技术债基线改为 Bun 1.3.14 + `bun.lock` 已采用、Vitest 已接管唯一单元测试 runner，保留旧 NO-GO archive 的历史性质。

- [ ] **Step 3: 审计 delta specs 与 sync-specs 预演**

Run: `openspec validate migrate-web-admin-jest-to-vitest --strict; openspec validate --changes --strict; openspec validate --specs --strict`

Expected: 新 Vitest capability、旧 Jest requirements 退役、测试基线/Bun/Vite/warning/TypeScript/Playwright deltas 全部 strict 通过；不修改 `openspec/specs/**`。

- [ ] **Step 4: 更新任务证据**

仅在对应实现和验证完成后勾选 `tasks.md` 5.x、6.x；在 `verification.md` 记录 active truth 与 archive history 的区分。

### Task 7: 执行完整 RC 验证矩阵

**Files:**
- Modify: `openspec/changes/migrate-web-admin-jest-to-vitest/verification.md`
- Modify: `openspec/changes/migrate-web-admin-jest-to-vitest/tasks.md`

- [ ] **Step 1: 对比 discovery 并执行全量 Vitest**

Run: `Set-Location web-admin; bun x vitest list | Sort-Object | Set-Content -Encoding utf8 ..\openspec\changes\migrate-web-admin-jest-to-vitest\vitest-test-paths.txt; Measure-Command { bun run test:ci 2>&1 | Tee-Object ..\openspec\changes\migrate-web-admin-jest-to-vitest\vitest-full.log }`

Expected: Jest/Vitest 规范化路径集合 157/157；至少 1503 tests；0 failure、timeout、unhandled error；单 worker/file-serial、non-silent。

- [ ] **Step 2: 运行 V8 coverage 并核对消费者**

Run: `Set-Location web-admin; bun x vitest run --coverage`

Expected: production JS/JSX/TS/TSX 被收集，d.ts/tests 排除，text/json/lcov/clover 都生成；现有消费者可读取，生产实现 coverage 为 N/A（未改 production implementation）。

- [ ] **Step 3: 运行前端质量与构建门禁**

Run: `Set-Location web-admin; bun run typecheck; bun run typecheck:build-tooling; bun run typecheck:e2e; bun run lint; bun run public-scripts:check; bun run public-scripts:build; bun run public-scripts:smoke; bun run build`

Expected: typecheck、lint、public scripts check/build/smoke 与 Vite build 全部通过。

- [ ] **Step 4: 运行 Playwright discovery 和静态审计**

Run: `Set-Location web-admin; bun run test:e2e:list; Set-Location ..; rg -n '\.(only|skip)\(|passWithNoTests|--silent|globalThis\.jest|jest\s*=\s*vi|@jest/globals' web-admin/src web-admin/package.json web-admin/vitest.config.ts`

Expected: 19 files / 22 tests；无 skip/only、compatibility alias/global 或 warning suppression。

- [ ] **Step 5: 运行 OpenSpec 与 diff 卫生**

Run: `openspec validate migrate-web-admin-jest-to-vitest --strict; openspec validate --changes --strict; openspec validate --specs --strict; git diff --check; git status --short`

Expected: 全部 strict 通过；仅授权 write set 有变更；无乱码、placeholder、敏感信息或临时日志进入提交。

- [ ] **Step 6: 写入完整中文验证记录**

记录 discovery、test count、warning 分类、coverage、安装、typecheck/lint/build、Playwright、同硬件耗时、OpenSpec 与剩余风险；证据成立后勾选 `tasks.md` 7.1–7.10。

### Task 8: Pre-archive review 与单提交 RC 收口

**Files:**
- Modify: `openspec/changes/migrate-web-admin-jest-to-vitest/tasks.md`
- Modify: `openspec/changes/migrate-web-admin-jest-to-vitest/verification.md`

- [ ] **Step 1: 使用 pre-archive review 迭代到 READY**

按 `openspec-pre-archive-review` 审查 proposal/design/tasks/specs、代码、测试、依赖 owner、coverage、CI、文档、sync-specs 预期和验证证据；修复明确问题并重跑受影响门禁。

- [ ] **Step 2: fetch 最新 base 并检查交集**

Run: `git fetch origin --prune; git diff --name-only origin/hfl-test-base...HEAD; git merge-base --is-ancestor origin/hfl-test-base HEAD`

Expected: 最新 base 是祖先；若 base 前进，只在无写集/语义冲突时 rebase，并重跑触达面门禁。

- [ ] **Step 3: 收敛为一个逻辑 commit**

Run: `git diff --check; git status --short; git log --oneline origin/hfl-test-base..HEAD`

Expected: 最终相对 latest base 恰好一个 `chore(web-admin): 原子迁移单元测试至 Vitest` 逻辑提交，tracked 工作区 clean。

- [ ] **Step 4: 普通推送工作分支**

Run: `git push origin hfl-test/migrate-web-admin-jest-to-vitest`

Expected: 远端工作分支 HEAD 与本地一致；不 push/merge base/test，不 archive，不释放 lease/locks。

- [ ] **Step 5: 回传 RC_READY**

向 controller task `019f6f42-7733-7820-95c6-8add93481a1b` 发送 route/controller/worker/return/change、`lifecycle_state=RC_READY`、`phase=PRE_ARCHIVE_READY`、workspace/branch/HEAD/remote/latest_base/origin_test、`ahead_commits=1`、48/48、changed files、验证矩阵、coverage、remaining risk、`archive=false`、`merged_push_base=false`、`push_work_branch=true`、`push_test=false`、`lease_release=false`、resource locks、`needs_master_decision=true`、`subagent_used=false`。
