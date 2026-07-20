# Admin Vitest 依赖优化器实施计划

> **Agent worker 执行约束：** 必须使用 `superpowers:executing-plans` 逐项执行本计划。主控明确禁止 subagent，因此由当前 worker 内联完成。

**目标：** 在不改变单 worker、强隔离、默认 5 秒 timeout 和 production Vite 行为的前提下，为 Admin Vitest 测试 module graph 启用 AntD/icons 精确根 ESM dependency optimizer，并以 fail-closed 全量门禁决定采用或 NO-GO。

**架构：** `web-admin/vitest.config.ts` 继续作为唯一测试配置真值：精确根 alias 只匹配 `antd` 与 `@ant-design/icons`，并在 `test.deps.optimizer.client` 中显式预构建两个 ESM 根入口。`web-admin/config/vitest/testConfig.ts` 保持现有串行与 coverage 契约。若完整候选复现默认 timeout，只允许在批准的 5 个测试 owner 内缩短重型测试路径；出现第 6 个 owner 或任何 interop/report 回退立即撤销候选。

**技术栈：** Bun 1.3.14、Node 24.14、Vitest 4.1.10、Vite 8.1.4、jsdom 28.1.0、React 18、Ant Design 5.29.3、TypeScript 5.7.3。

---

### 任务 1：开工状态、参考边界与证据目录

**文件：**
- 修改：`openspec/changes/optimize-web-admin-vitest-parallelism-and-ci-runtime/tasks.md`
- 后续创建：`openspec/changes/optimize-web-admin-vitest-parallelism-and-ci-runtime/verification.md`
- 只读：`D:/CodeRepo/LeagProject/aicodex-1/aicodex-api/webui/vite.config.ts`
- 只读：`D:/CodeRepo/LeagProject/aicodex-1/aicodex-api/webui/package.json`
- 只读：`D:/CodeRepo/LeagProject/aicodex-1/aicodex-api/webui/src/test/setup.ts`

- [x] **步骤1：Fetch并确认工作分支、base、test与active change**

命令：

```powershell
git fetch origin --prune
git status --short --branch
git rev-parse HEAD
git rev-parse origin/hfl-test-base
git rev-parse origin/test
openspec status --change optimize-web-admin-vitest-parallelism-and-ci-runtime --json
```

预期：workspace clean；HEAD/远端工作分支为dispatch HEAD；base=`4c6e606...`、test=`89032a5...`；apply state=`ready`。

- [x] **步骤2：记录版本、资源与锁文件hash**

命令：

```powershell
bun --version
node --version
node -e "const p=require('./web-admin/package.json'); console.log(p.devDependencies.vitest,p.devDependencies.vite,p.devDependencies.jsdom,p.dependencies.antd,p.dependencies['@ant-design/icons'])"
Get-FileHash web-admin/bun.lock -Algorithm SHA256
```

预期：Bun 1.3.14、Vitest 4.1.10、Vite 8.1.4、jsdom 28.1.0、AntD 5.29.3；lock SHA256=`C431C5F5...CD912`；竞争测试进程为0。

- [x] **步骤3：记录API只读对照边界**

`verification.md` 预期结论：API可复用Bun单一入口、显式Vitest API、typed config/setup思想；其Vitest 4.1.5/Vite 7.3.2/jsdom 26、`globals=true`、15s/60s timeout、默认并行、production `optimizeDeps` 与coverage排除均不适用于Admin，不复制配置。

### 任务 2：FrontendCiGates 契约 RED

**文件：**
- 修改：`web-admin/src/FrontendCiGates.test.ts`
- 测试：`web-admin/src/FrontendCiGates.test.ts`

- [ ] **步骤1：导入并规范化实际顶层Vitest配置**

新增带类型的局部检查边界：

```ts
import vitestConfig from "../vitest.config";

type TestAlias = {find: string | RegExp; replacement: string};
type InspectedVitestConfig = {
  resolve?: {alias?: TestAlias[]};
  test?: {
    deps?: {optimizer?: {client?: {enabled?: boolean; include?: string[]}}};
    maxWorkers?: number;
    fileParallelism?: boolean;
    sequence?: {concurrent?: boolean};
    isolate?: boolean;
    mockReset?: boolean;
    globals?: boolean;
  };
};

const inspectedVitestConfig = vitestConfig as unknown as InspectedVitestConfig;
```

- [ ] **步骤2：添加精确根 alias 与 optimizer 契约测试**

新增一个聚焦测试：

```ts
const aliases = inspectedVitestConfig.resolve?.alias ?? [];
const antdAlias = aliases.find(alias => `${alias.find}` === "/^antd$/");
const iconsAlias = aliases.find(alias => `${alias.find}` === "/^@ant-design\\/icons$/");

expect(antdAlias?.replacement.replaceAll("\\", "/")).toMatch(/\/node_modules\/antd\/es\/index\.js$/);
expect(iconsAlias?.replacement.replaceAll("\\", "/")).toMatch(/\/node_modules\/@ant-design\/icons\/es\/index\.js$/);
expect((antdAlias?.find as RegExp).test("antd/es/layout/layout")).toBe(false);
expect((iconsAlias?.find as RegExp).test("@ant-design/icons/es/icons/HomeOutlined")).toBe(false);
expect(inspectedVitestConfig.test?.deps?.optimizer?.client).toEqual({
  enabled: true,
  include: ["antd", "@ant-design/icons"],
});
```

同一测试必须断言顶层测试契约仍为 `maxWorkers=1`、`fileParallelism=false`、`sequence.concurrent=false`、`isolate=true`、`mockReset=true`、`globals=false`，且原始配置不包含 `server.deps.external`、`lib/index.js`、`isolate: false` 或 timeout 覆盖。

- [ ] **步骤3：运行 RED**

命令：

```powershell
cd web-admin
bun x vitest run src/FrontendCiGates.test.ts
```

预期：仅因缺少精确 ESM alias 与 `test.deps.optimizer.client` 而失败；既有串行、coverage 与 CI 断言保持通过。

### 任务 3：最小 Vitest optimizer GREEN

**文件：**
- 修改：`web-admin/vitest.config.ts`
- 只读审计：`web-admin/config/vitest/testConfig.ts`
- 测试：`web-admin/src/FrontendCiGates.test.ts`

- [ ] **步骤1：新增精确根 ESM alias**

新增小型辅助函数，并把依赖 alias 放在既有资产 alias 之前：

```ts
const dependencyEsmEntry = (packageName: string): string =>
  path.resolve(rootDir, "node_modules", packageName, "es/index.js");

{
  find: /^antd$/,
  replacement: dependencyEsmEntry("antd"),
},
{
  find: /^@ant-design\/icons$/,
  replacement: dependencyEsmEntry("@ant-design/icons"),
},
```

- [ ] **步骤2：新增client optimizer且不改变串行真值**

将 `test: testConfig` 替换为：

```ts
test: {
  ...testConfig,
  deps: {
    optimizer: {
      client: {
        enabled: true,
        include: ["antd", "@ant-design/icons"],
      },
    },
  },
},
```

除非 RED 测试证明顶层展开无法保持已批准契约，否则不得修改 `config/vitest/testConfig.ts`。

- [ ] **步骤3：运行 GREEN 与 build-tooling typecheck**

命令：

```powershell
bun x vitest run src/FrontendCiGates.test.ts
bun run typecheck:build-tooling
```

预期：`FrontendCiGates` 与 build-tooling typecheck 均通过。

- [ ] **步骤4：检查optimizer metadata**

用真实候选运行一个小型 AntD owner，再定位 Vitest ignored cache 下的 `_metadata.json`。预期：优化后的 `antd` 与 `@ant-design/icons` source 均以 `es/index.js` 结尾，且 `needsInterop=false`；没有 cache 文件被跟踪。

### 任务 4：候选专用 mock、subpath 与 singleton 门禁

**文件：**
- 预期无 tracked 修改
- 仅临时文件：`web-admin/node_modules/.aicodex-profile/` 或系统临时证据目录中的本任务 owner 文件

- [ ] **步骤1：在ESM optimizer候选下运行根partial mock owners**

运行4个已批准文件，要求4 files / 76 tests通过，且没有missing/default export错误。

- [ ] **步骤2：在ESM optimizer候选下运行subpath mock owners**

运行 `ApplicationEditPage.test.tsx`、`ApplicationEditPageUiCustomization.test.tsx`、`LargeEditFormLayout.test.ts`、`ManagementPage.shell.test.tsx`、`UserEditPage.test.tsx` 与 `common/modal/Antd5ModalOpen.test.tsx`；要求6 files / 153 tests通过，并明确把证据标记为候选配置证据。

- [ ] **步骤3：以默认和shuffle顺序运行真实singleton owner组合**

以默认顺序和 `--sequence.shuffle.files --sequence.seed=1` 运行 `App.test.tsx`、`common/modal/Antd5ModalOpen.test.tsx`、`common/WorkspaceTabs.test.tsx`、`auth/WeComLoginPanel.test.tsx`；要求两种顺序均为4 files / 41 tests通过。

- [ ] **步骤4：双向运行轻量icons two-tone sentinel**

创建两个临时测试：一个断言默认值 `#1677ff`，设置 `#123456` 后断言变更；另一个只断言默认值。在真实候选下运行“变更→观察”及shuffle后的“观察→变更”，要求两种顺序均2/2通过，随后删除 sentinel 文件。

### 任务 5：首次正式全量运行与条件式 owner 稳定化

**文件（仅复现后条件式修改）：**
- 修改：`web-admin/src/ApplicationAccessMenuPages.test.tsx`
- 修改：`web-admin/src/AuditOperationsListPages.test.tsx`
- 修改：`web-admin/src/EntryListPage.test.tsx`
- 修改：`web-admin/src/InvitationListPage.test.tsx`
- 修改：`web-admin/src/common/ListPageIdentityCell.test.tsx`

- [ ] **步骤1：记录进程与optimizer cache状态**

运行前记录竞争测试进程为 0、候选 cache 是否存在及其 config/lock hash。使用本任务自有 profiler，在系统临时目录记录 wall time、平均 CPU 核数、进程树峰值 working set、stdout 与 stderr。

- [ ] **步骤2：运行首个non-silent完整候选**

使用profiler运行 `bun run test:ci`。要求157/157 paths、至少1510 tests，并收集全部timeout/unhandled owner。若没有timeout，不修改任何owner文件，并以证据把owner任务标记为N/A。

- [ ] **步骤3：若复现，则在每次修改前建立owner-local RED**

仅针对 5 个已批准 owner，在代表性重型分组或完整候选中运行失败测试，直到观察到相同的默认 timeout。不得仅为让 RED 可重复而添加 timeout 参数。

- [ ] **步骤4：只实施已证实的最小owner修改**

批准的修改形态：

- `ApplicationAccessMenuPages`：检查真实表格列，只渲染 replay action cell，不挂载整个表格。
- `AuditOperationsListPages`：将 session lifecycle/fetch 断言与 table/drawer 渲染拆开，使每个测试只持有一棵 render tree。
- `EntryListPage`：分离 backend fetch 完成与行渲染；行断言使用 `page.renderTable([entry])`，直接 fetch 断言保留在既有 fetch 测试中。
- `InvitationListPage`：使用既有 class harness 与直接 `renderTable([invitation])` 边界，分离 selected-organization fetch 与行渲染。
- `ListPageIdentityCell`：保留真实组件与 copy 行为；仅当组合测试单独复现 timeout 时，才将 link/icon/identity 渲染与 copy 交互拆开。

每项修改必须保留既有断言，不新增 sleep、timeout 或 suppression；测试数可以增加但不得减少。

- [ ] **步骤5：运行每个owner GREEN与五owner组合**

要求每个聚焦 owner 与 5 文件组合均在默认 timeout 下通过，且 unhandled 为 0。若正式全量运行出现第 6 个 owner，则回退 optimizer/owner 实施改动，并形成有记录的 NO-GO RC。

### 任务 6：完整采用矩阵与 coverage

**文件：**
- 创建：`openspec/changes/optimize-web-admin-vitest-parallelism-and-ci-runtime/verification.md`
- 仅临时文件：系统temp日志、profile JSON及ignored coverage/cache

- [ ] **步骤1：连续运行两次默认顺序全量**

每轮要求：157/157 paths、tests>=1510、0 failure/timeout/unhandled、wall<=1200s、进程树峰值<2GiB。

- [ ] **步骤2：运行file-only shuffle**

使用 `--sequence.shuffle.files --sequence.seed=20260720` 运行；要求相同的正确性和资源上限，并保持单文件内case顺序。

- [ ] **步骤3：分类三轮warning**

记录pseudo-element、CSS parse与navigation计数；要求React act、FakeTimers/native timer和unhandled保持0，不得过滤输出。

- [ ] **步骤4：普通correctness全绿后运行一次完整V8 coverage**

要求wall<=1800s，并实际生成 `coverage-final.json`、`lcov.info`、`clover.xml` 与text输出。审计恰好382个production条目，tests、`__tests__`、`.d.ts`、outside-src条目均为0，并记录statement、branch、function、line总值。因production source changed=0，changed production coverage为N/A。

### 任务 7：静态、构建、CI 与文档门禁

**文件：**
- 修改：`web-admin/AGENTS.md`
- 修改：`docs/admin-technical-debt-baseline-2026-07-14.md`
- 修改：`openspec/changes/optimize-web-admin-vitest-parallelism-and-ci-runtime/verification.md`
- 只读审计：`.github/workflows/build.yml`
- 只读审计：`web-admin/package.json`
- 只读审计：`web-admin/bun.lock`
- 只读审计：`web-admin/playwright.config.ts`

- [ ] **步骤1：运行类型与源码门禁**

运行 `typecheck`、`typecheck:build-tooling`、`typecheck:e2e`、incremental TS gate与lint；全部必须通过。

- [ ] **步骤2：运行public scripts、Vite build与Playwright discovery**

运行public-scripts check/build/smoke、`bun run build`与 `bun run test:e2e:list`；要求19 files / 22 tests，且没有Playwright实现修改。

- [ ] **步骤3：审计不可变的package/CI契约**

要求package与bun.lock hash不变，`frontend-checks`仍只调用一个 `bun run test:ci`，且没有新增matrix、sharding或worker覆盖。若已有可观察的实际CI wall，记录为非门禁的后续基线；不得等待CI或修改workflow。

- [ ] **步骤4：更新文档与verification**

记录单worker ESM optimizer真值、ignored且可重建的cache边界、fail-closed回退、延期并行化、API参考差异、mock/subpath/singleton证据的候选配置身份，以及未来Vitest大版本升级必须回归 `vi.mock("antd/es/*")` 的要求。

### 任务 8：OpenSpec/pre-archive/RC 收敛

**文件：**
- 修改：`openspec/changes/optimize-web-admin-vitest-parallelism-and-ci-runtime/tasks.md`
- 修改：`openspec/changes/optimize-web-admin-vitest-parallelism-and-ci-runtime/verification.md`
- 仅在证据改变结论时修改：同一active change中的proposal、design与delta specs

- [ ] **步骤1：只勾选有证据的任务并运行strict校验**

运行目标change、all changes、all specs strict、`git diff --check`、禁止写集审计、skip/only/suppression审计、UTF-8/EOF卫生检查与临时残留审计。

- [ ] **步骤2：运行 `openspec-pre-archive-review` 到 READY**

修复所有可直接解决的问题；不得archive或修改主规格。

- [ ] **步骤3：fetch最新base/test并收敛为一个逻辑提交**

若latest base未变化，只在最终RC阶段把工作分支收敛为 `origin/hfl-test-base + 1`。若base前进，先审计写集交集与语义影响。只push工作分支。

- [ ] **步骤4：向主控发送RC_READY**

回传必须包含HEAD、remote HEAD、latest base、origin test、44/44 tasks、完整performance/resource/warning/coverage证据、API对照、remaining risk、继续持有的locks，以及 `archive=false`、`push_test=false`、`lease_release=false`。
