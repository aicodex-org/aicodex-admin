# Admin Vitest ESM optimizer 与长尾稳定化实施计划

> 执行结果：第二次默认完整轮在批准写集之外的 `ApplicationEditPageUiCustomization.test.tsx` 触发默认timeout，已按Task 5 fail-closed。候选配置与直接契约回退，shuffle/coverage为N/A，最终以NO-GO收口。

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. 本 change 由当前 worker 内联执行，调度明确禁止 subagent。

**Goal:** 在保留 single-worker、file-serial、`isolate=true` 与默认 5 秒 timeout 的前提下，让 Admin Vitest 全量稳定收敛到 20 分钟内，并保持 React renderer、mock、singleton、warning 与 coverage 契约完整。

**Architecture:** 只修改测试专用 `vitest.config.ts` 的 module graph：把 `antd` 与 `@ant-design/icons` 精确根导入指向 ESM 入口，通过 `test.deps.optimizer.client` 预构建这两个入口，并把 `react-dom` 作为唯一 exclude，使预构建产物复用外部单一 ReactDOM renderer。先用 `FrontendCiGates.test.ts` 建立源码级 RED/GREEN 契约，再运行 metadata/bundle、专项、重复全量、coverage 与非单测门禁；只有正式候选真实复现默认 timeout 时，才进入 4 个条件式 owner 的 TDD 分支。

**Tech Stack:** React 18、Ant Design 5.29.3、Vitest 4.1.10、Vite 8.1.4、jsdom 28.1.0、Bun 1.3.14、TypeScript 5.7.3、PowerShell 资源采样。

**实施环境基线:** 12 逻辑 CPU、约 32GiB 内存、Node v24.14.0；开工时无竞争 Vitest/Jest 进程。`package.json`、`bun.lock`、`config/vitest/testConfig.ts`、workflow、Docker、Makefile、Playwright 实现与 production 源码保持只读。

---

### Task 1: 完成开工门禁与只读基线

**Files:**
- Modify: `openspec/changes/adopt-web-admin-vitest-esm-optimizer-with-long-tail-stabilization/tasks.md`
- Create: `openspec/changes/adopt-web-admin-vitest-esm-optimizer-with-long-tail-stabilization/verification.md`
- Read only: `web-admin/package.json`
- Read only: `web-admin/bun.lock`
- Read only: `web-admin/config/vitest/testConfig.ts`
- Read only: `.github/workflows/build.yml`
- Read only: `deploy/Dockerfile`
- Read only: `Makefile`
- Read only: `web-admin/playwright.config.ts`

- [ ] **Step 1: 核对远端与change状态**

Run:

```powershell
git fetch origin --prune
git rev-parse HEAD
git rev-parse origin/hfl-test-base
git rev-parse origin/test
git rev-parse origin/hfl-test/adopt-web-admin-vitest-esm-optimizer-with-long-tail-stabilization
git status --short --branch
openspec status --change adopt-web-admin-vitest-esm-optimizer-with-long-tail-stabilization --json
```

Expected: local/remote work branch均为design HEAD，base为授权提交，workspace clean，唯一active change为目标change。

- [ ] **Step 2: 记录只读文件hash**

Run:

```powershell
git hash-object web-admin/package.json web-admin/bun.lock web-admin/config/vitest/testConfig.ts .github/workflows/build.yml deploy/Dockerfile Makefile web-admin/playwright.config.ts
```

Expected: 保存7个hash到最终 `verification.md`；RC前重新计算并逐项相同。

- [ ] **Step 3: 标记OpenSpec任务1.1–1.5完成**

Edit `tasks.md`，只把1.1–1.5从 `- [ ]` 改为 `- [x]`。运行：

```powershell
openspec status --change adopt-web-admin-vitest-esm-optimizer-with-long-tail-stabilization --json
git diff --check
```

Expected: 5/48 tasks complete，只有change artifacts产生diff。

### Task 2: 用源码契约建立有效 RED

**Files:**
- Modify: `web-admin/src/FrontendCiGates.test.ts`
- Test: `web-admin/src/FrontendCiGates.test.ts`

- [ ] **Step 1: 读取Vitest配置源码供直接契约断言**

在现有 `vitestConfigPath` 后增加：

```ts
const vitestConfig = fs.readFileSync(vitestConfigPath, "utf8");
```

- [ ] **Step 2: 新增exact ESM alias与optimizer契约测试**

在 `describe("web-admin CI gates")` 中增加：

```ts
test("keeps the AntD ESM optimizer exact, isolated and test-only", () => {
  expect(vitestConfig).toContain(
    '{find: /^antd$/, replacement: dependencyEsmEntry("antd")}'
  );
  expect(vitestConfig).toContain("find: /^@ant-design\\/icons$/");
  expect(vitestConfig).toContain(
    'replacement: dependencyEsmEntry("@ant-design/icons")'
  );
  expect(vitestConfig).toContain('include: ["antd", "@ant-design/icons"]');
  expect(vitestConfig).toContain('exclude: ["react-dom"]');
  expect(vitestConfig).not.toMatch(/lib[\\/]index\.js/);
  expect(vitestConfig).not.toMatch(/isolate:\s*false|pool:\s*["']threads["']/);
  expect(viteConfig).not.toContain("test.deps.optimizer");
  expect(viteConfig).not.toContain("dependencyEsmEntry");
});
```

现有 `owns the typed Vitest environment...` 测试继续直接验证 `testConfig` 的 `maxWorkers=1`、`fileParallelism=false`、`sequence.concurrent=false`、`isolate=true`、`mockReset=true`、`globals=false` 与四类 coverage reporter，不新增timeout字段。

- [ ] **Step 3: 运行RED并确认失败原因正确**

Run:

```powershell
Set-Location web-admin
bun x vitest run src/FrontendCiGates.test.ts
```

Expected: 既有测试通过；新测试因 `vitest.config.ts` 尚无 `dependencyEsmEntry` / exact alias / optimizer而失败。不得出现 `import.meta.url` scheme、module loading或0-test错误。

- [ ] **Step 4: 保存RED摘要并标记2.1–2.5完成**

把失败断言、test count和命令写入 `verification.md`；将tasks 2.1–2.5标记完成。

### Task 3: 最小实现exact ESM optimizer并取得GREEN

**Files:**
- Modify: `web-admin/vitest.config.ts`
- Test: `web-admin/src/FrontendCiGates.test.ts`
- Read only: `web-admin/config/vitest/testConfig.ts`

- [ ] **Step 1: 增加ESM入口helper**

在 `supportPath` 后增加：

```ts
const dependencyEsmEntry = (packageName: string): string =>
  path.resolve(rootDir, "node_modules", packageName, "es/index.js");
```

- [ ] **Step 2: 在现有资产alias之前增加两个精确根alias**

```ts
{find: /^antd$/, replacement: dependencyEsmEntry("antd")},
{
  find: /^@ant-design\/icons$/,
  replacement: dependencyEsmEntry("@ant-design/icons"),
},
```

不得增加 `antd/es/*`、locale、style或CJS `lib/index.js` alias。

- [ ] **Step 3: 以spread保留testConfig并增加唯一optimizer配置**

把 `test: testConfig` 改为：

```ts
test: {
  ...testConfig,
  deps: {
    optimizer: {
      client: {
        enabled: true,
        include: ["antd", "@ant-design/icons"],
        exclude: ["react-dom"],
      },
    },
  },
},
```

- [ ] **Step 4: 运行GREEN与build-tooling typecheck**

Run:

```powershell
Set-Location web-admin
bun x vitest run src/FrontendCiGates.test.ts
bun run typecheck:build-tooling
```

Expected: `FrontendCiGates.test.ts` 全部通过，build-tooling typecheck通过，无新增warning。

- [ ] **Step 5: 审计只读testConfig和实现边界**

Run:

```powershell
git diff -- web-admin/config/vitest/testConfig.ts web-admin/package.json web-admin/bun.lock .github/workflows/build.yml web-admin/vite.config.ts
rg -n "isolate:\s*false|threads|testTimeout|hookTimeout|silent|console.*filter" web-admin/vitest.config.ts web-admin/src/FrontendCiGates.test.ts
```

Expected: 只读文件diff为空；禁止模式无命中。

- [ ] **Step 6: 标记3.1–3.5完成并创建进度commit**

```powershell
git add web-admin/vitest.config.ts web-admin/src/FrontendCiGates.test.ts openspec/changes/adopt-web-admin-vitest-esm-optimizer-with-long-tail-stabilization
git diff --cached --check
git commit -m "test(admin): 启用 AntD ESM optimizer 契约"
git push
```

该进度commit将在RC收敛时与设计commit squash为一个逻辑commit。

### Task 4: 审计metadata、renderer、mock与singleton

**Files:**
- Modify: `openspec/changes/adopt-web-admin-vitest-esm-optimizer-with-long-tail-stabilization/verification.md`
- Temporary ignored: `web-admin/node_modules/.aicodex-profile/adopt-web-admin-vitest-esm-optimizer-with-long-tail-stabilization/**`

- [ ] **Step 1: 运行最小warmup并定位optimizer metadata**

Run:

```powershell
Set-Location web-admin
bun x vitest run src/App.test.tsx
Get-ChildItem -Recurse node_modules/.vite -Filter _metadata.json
```

Expected: metadata中 `antd`与icons源为 `es/index.js`、`needsInterop=false`；cache路径被gitignore。

- [ ] **Step 2: 审计bundle ReactDOM边界**

由metadata解析实际 `antd.js` 路径并审计：

```powershell
$metadataPath = Get-ChildItem -Recurse node_modules/.vite -Filter _metadata.json |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1 -ExpandProperty FullName
$metadata = Get-Content -Raw -LiteralPath $metadataPath | ConvertFrom-Json
$antdBundle = Join-Path (Split-Path $metadataPath) $metadata.optimized.antd.file
Select-String -LiteralPath $antdBundle -SimpleMatch 'from "react-dom"'
Select-String -LiteralPath $antdBundle -SimpleMatch 'react-dom/client'
Select-String -LiteralPath $antdBundle -SimpleMatch 'react-dom/test-utils'
```

Expected: 外部 `react-dom` import存在；client/test-utils引用为0；路径完全来自当前metadata，不按记忆猜测。

- [ ] **Step 3: 运行renderer两次独立进程**

Run默认与反序/固定shuffle：

```powershell
bun x vitest run src/ApplicationEditPageUiCustomization.test.tsx src/RolePermissionEditPages.test.tsx
bun x vitest run --sequence.shuffle.files --sequence.seed=20260720 src/ApplicationEditPageUiCustomization.test.tsx src/RolePermissionEditPages.test.tsx
```

Expected: 每轮2 files / 29 tests，multiple renderers/act/unhandled均为0。

- [ ] **Step 4: 运行root mock与subpath mock专项**

Run root partial mock集合：

```powershell
bun x vitest run src/account/WeComProfileSyncPanel.test.tsx src/auth/WeComLoginPanel.test.tsx src/common/WorkspaceTabs.test.tsx src/ManagementPage.shell.test.tsx
```

Run subpath mock集合：

```powershell
bun x vitest run src/ApplicationEditPage.test.tsx src/ApplicationEditPageUiCustomization.test.tsx src/common/modal/Antd5ModalOpen.test.tsx src/LargeEditFormLayout.test.ts src/ManagementPage.shell.test.tsx src/UserEditPage.test.tsx
```

Expected: 全部通过，无missing export、invalid element、interop、renderer、act或unhandled回归。

- [ ] **Step 5: 运行现有singleton组合与icons正反序sentinel**

现有组合：`App.test.tsx`、`common/modal/Antd5ModalOpen.test.tsx`、`common/WorkspaceTabs.test.tsx`、`auth/WeComLoginPanel.test.tsx`，运行默认与固定shuffle。icons sentinel放入任务自有ignored目录，分别设置不同two-tone值并以A→B、B→A执行。

Expected: 41 tests两轮通过；icons 2/2正反序通过；无跨文件singleton泄漏。

- [ ] **Step 6: 任一专项失败时执行fail-closed**

若出现设计列出的module graph回归，删除候选配置与契约diff，更新OpenSpec/verification为NO-GO并停止后续完整/coverage；不得修改owner测试或扩大写集。

### Task 5: 运行正式完整门禁并处理条件式owner

**Files:**
- Conditional modify: `web-admin/src/OrganizationDirectoryQualityPage.test.tsx`
- Conditional modify: `web-admin/src/ApplicationUsageAccessPage.test.tsx`
- Conditional modify: `web-admin/src/SyncerEditPage.test.tsx`
- Conditional modify: `web-admin/src/OrganizationTreeOperationsPage.test.tsx`
- Modify: `openspec/changes/adopt-web-admin-vitest-esm-optimizer-with-long-tail-stabilization/verification.md`

- [ ] **Step 1: 创建ignored资源采样脚本**

脚本必须以 `Start-Process -WindowStyle Hidden` 启动 `bun x vitest run`，每500ms枚举进程树，记录wall、平均CPU核、peak working set、进程数，并把stdout/stderr写入任务自有 `%TEMP%`。脚本不修改测试命令语义、不使用bail/silent/timeout覆盖。

- [ ] **Step 2: 运行第一次默认完整轮**

Expected: 157/157 paths、tests `>=1510`、0 failure/timeout/unhandled、wall `<=1200s`、peak `<2GiB`。

- [ ] **Step 3: 按证据处理timeout分支**

- 0 timeout：4个条件式owner全部记录N/A，diff保持0。
- timeout命中4个批准owner之一：先单文件和相邻顺序复现RED，证明为tests-body后才最小修改；每个修改都需聚焦GREEN与完整重跑。
- timeout命中范围外文件、出现第5个owner或需要新依赖/production：立即fail-closed并回退候选。

- [ ] **Step 4: 运行第二次默认完整轮**

Expected: 与第一次相同门禁，独立进程执行。

- [ ] **Step 5: 运行固定shuffle完整轮**

Run参数：

```powershell
--sequence.shuffle.files --sequence.seed=20260720
```

Expected: 157/157、tests `>=1510`、0 failure/timeout/unhandled、wall `<=1200s`、peak `<2GiB`。

- [ ] **Step 6: 汇总三轮warning与长尾**

必须分别记录pseudo-element、CSS parse、navigation、multiple renderers、React act、FakeTimers/native timer、unhandled，以及所有单test `>=4s`。后四类为0；前三类保持可见，不新增suppression。

### Task 6: 完成coverage和非单测工具链

**Files:**
- Modify: `openspec/changes/adopt-web-admin-vitest-esm-optimizer-with-long-tail-stabilization/verification.md`
- Modify: `web-admin/AGENTS.md`
- Modify: `docs/admin-technical-debt-baseline-2026-07-14.md`

- [ ] **Step 1: 运行一次最终V8 coverage**

Run:

```powershell
Set-Location web-admin
bun x vitest run --coverage
```

Expected: wall `<=1800s`；`coverage-final.json`、`lcov.info`、`clover.xml`与text输出完整；382 production entries；test/`__tests__`/`.d.ts`/outside-src=0。

- [ ] **Step 2: 运行三组typecheck和增量TS门禁**

```powershell
bun run typecheck
bun run typecheck:build-tooling
bun run typecheck:e2e
node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base
```

Expected: 全部通过。

- [ ] **Step 3: 运行lint、public scripts和Vite build**

```powershell
bun run lint
bun run public-scripts:check
bun run public-scripts:build
bun run public-scripts:smoke
bun run build
```

Expected: 全部通过；仅记录既有Browserslist、browser external或chunk size提示。

- [ ] **Step 4: 运行Playwright discovery**

```powershell
bun run test:e2e:list
```

Expected: 19 files / 22 tests，无skip/only；不访问60。

- [ ] **Step 5: 更新稳定规则与技术债真值**

`web-admin/AGENTS.md` 与技术债基线记录候选第一次默认全量通过、第二次默认全量在范围外owner触发5秒timeout、最终NO-GO并完整回退；保留强隔离、warning、coverage N/A、大版本专项回归和后续独立change重新授权owner边界的要求。

### Task 7: 文档、pre-archive review与RC收敛

**Files:**
- Modify: `openspec/changes/adopt-web-admin-vitest-esm-optimizer-with-long-tail-stabilization/proposal.md`
- Modify: `openspec/changes/adopt-web-admin-vitest-esm-optimizer-with-long-tail-stabilization/design.md`
- Modify: `openspec/changes/adopt-web-admin-vitest-esm-optimizer-with-long-tail-stabilization/tasks.md`
- Modify: `openspec/changes/adopt-web-admin-vitest-esm-optimizer-with-long-tail-stabilization/verification.md`
- Modify: `openspec/changes/adopt-web-admin-vitest-esm-optimizer-with-long-tail-stabilization/specs/**`

- [ ] **Step 1: 完成中文verification与tasks**

记录TDD RED/GREEN、metadata/bundle与专项证据、第一次default通过、第二次default范围外timeout、shuffle/coverage N/A、fail-closed回退、warning、API只读对照、只读hash、条件owner N/A、临时残留和remaining risk。只有有证据的任务改为 `[x]`。

- [ ] **Step 2: 运行OpenSpec和diff门禁**

```powershell
openspec validate adopt-web-admin-vitest-esm-optimizer-with-long-tail-stabilization --strict
openspec validate --changes --strict
openspec validate --specs --strict
git diff --check
git diff --name-only origin/hfl-test-base...HEAD
```

Expected: target/all changes/all 59 specs strict通过；最终写集无越界。

- [ ] **Step 3: 使用pre-archive review迭代到READY**

审查proposal/design/tasks/specs、代码、测试、coverage、文档语言、Purpose/TBD/EOF、敏感信息和禁止集。直接修复可确定问题并重新验证。

- [ ] **Step 4: 清理任务自有临时残留**

停止并确认无任务Vitest进程；验证绝对路径位于任务自有ignored/%TEMP%范围后，仅删除本任务创建的profiler、cache副本、sentinel、原始日志和coverage/build临时证据，不清理未知ignored residue。

- [ ] **Step 5: 收敛为latest base + 1 logical commit并推送工作分支**

fetch后确认base/test/远端工作分支未发生未授权漂移；把设计与实施进度commit收敛为最新base上的一个逻辑commit，普通push工作分支。不得archive、push base/test、删除分支或释放locks。

- [ ] **Step 6: 显式回传RC_READY**

向controller线程回传HEAD/remote/base/test、48/48、changed files、第一次default通过与第二次default范围外timeout、shuffle/coverage N/A、fail-closed回退、warning、API对照、remaining risk、pre-archive READY与locks；`lease_release=false`、`needs_master_decision=true`。
