# Admin Web Jest 至 Vitest 迁移验证记录

## 1. 验证边界

- 验证日期：2026-07-18（Asia/Shanghai）。
- 工作分支：`hfl-test/migrate-web-admin-jest-to-vitest`。
- 授权设计 HEAD：`85df52268fda5c41500cee9633f31a64b442da54`。
- 基线：`origin/hfl-test-base@89032a5f6a4687b97fa5cbb2427504280881bf3c`；实施开工时未前进，无需rebase。
- 实施授权时 `origin/test` 观察点：`5420c8c386de7daee84b7df41de65ba1c404bf2a`；最终RC收口前另行fetch记录最新值。
- 环境层级：Windows 本地标准工作区；未设置自定义 Bun cache；未使用60环境、共享数据库、真实账号或provider。
- 运行前 tracked 工作区clean；基线命令只生成被Git忽略的 `web-admin/coverage/**` 与系统临时日志。当前change新增的 `implementation-plan.md` 属于授权写集。

## 2. 精确版本与兼容性

| 项目 | 复核结果 | 兼容依据 |
| --- | --- | --- |
| Bun | `1.3.14` | `bun --version` |
| Vite | `8.1.4` | registry engines为 `^20.19.0 || >=22.12.0` |
| Vitest | `4.1.10` | registry engines为 `^20.0.0 || ^22.0.0 || >=24.0.0`；Vite peer为 `^6 || ^7 || ^8` |
| coverage provider | `@vitest/coverage-v8@4.1.10` | peer精确要求 `vitest@4.1.10` |
| jsdom | `28.1.0` | registry engines为 `^20.19.0 || ^22.12.0 || >=24.0.0` |
| jest-dom | `6.9.1` | registry Node下界 `>=14`，不收紧共同下界 |

因此最终 `package.json#engines.node` 必须收窄为 `^20.19.0 || ^22.12.0 || >=24.0.0`，排除Node 23并保持Node 20.19/22.12兼容。

## 3. 迁移前静态面

| 指标 | 实测 |
| --- | ---: |
| 测试文件 | 157 |
| 导入 `@jest/globals` 的文件 | 153 |
| 使用 `jest.*` 的文件 | 116 |
| module mock owner | 77 |
| factory动态require owner / 调用 | 48 / 148 |
| 含 CommonJS `require` 的文件 | 71 |
| 含 `__dirname` 的文件 | 37 |
| fake timer owner | 5 |
| `requireActual` 调用 / owner | 2 / 2 |
| `isolateModules` 调用 | 1 |

实施前精确命令发现 `requireActual` 实际为2处：`auth/WeComLoginPanel.test.tsx` 与 `ManagementPage.shell.test.tsx`。这纠正了dispatch和初稿中的“1处”统计；两者都按已批准的 async `vi.importActual` 设计迁移，不构成方案变化。

## 4. Jest discovery、全量与 warning 基线

- Discovery：`bun x jest --listTests --runInBand`，规范化去重后 `157` 条路径。
- 全量：`bun x jest --watchAll=false --runInBand`。
  - 结果：157/157 suites、1503/1503 tests、0 failure、0 snapshot。
  - Jest报告耗时：543.836秒；外层同硬件计时：546.537秒。
  - non-silent warning：1次 `ModelPages.test.tsx` 经 `rc-tabs`/AntD触发的 React `act(...)` warning。
  - FakeTimers/native timer warning：0。
- Coverage：`bun x jest --watchAll=false --runInBand --coverage`。
  - 结果：157/157 suites、1503/1503 tests、0 failure。
  - Jest报告耗时：583.498秒；外层同硬件计时：585.942秒。
  - 全仓旧基线：statements 68.3%、branches 60.6%、functions 68.06%、lines 68.29%。
  - warning：与普通全量相同，1次 `ModelPages.test.tsx` React act warning。
  - reporter产物：`coverage-final.json`、`lcov.info`、`clover.xml` 均实际生成，终端输出提供text reporter。

系统临时日志未纳入仓库；上述汇总来自保留到迁移结束的本机临时证据，最终提交不包含绝对用户目录或敏感环境信息。

## 5. 迁移前静态质量与E2E隔离基线

| 命令 | 结果 |
| --- | --- |
| `bun run typecheck` | PASS |
| `bun run typecheck:build-tooling` | PASS |
| `bun run typecheck:e2e` | PASS |
| `bun run test:e2e:list` | PASS，19 files / 22 tests |

本change不修改Playwright config、spec或worker/retry行为，也不执行60部署。

## 6. TDD 与迁移后证据

### 6.1 Toolchain 契约 RED → GREEN

- 先更新 `FrontendCiGates.test.ts`、Package Manager契约与typed config/support契约，在旧Jest状态确认以下目标为RED：公共脚本只调用Vitest、`globals=false`、单worker/file-serial、V8 coverage reporters、test-only asset aliases、critical package/CLI完整性与Jest退役。
- 随后实现精确依赖、`vitest.config.ts`、`setupTests.ts`和typed CSS Modules/style/file/SVG support；聚焦契约测试转为GREEN。
- 157个既有测试文件分批迁移为显式Vitest API。module hoist使用`vi`/`vi.hoisted`，partial mock使用async `vi.importActual`，唯一isolation owner使用`vi.resetModules`与dynamic import；没有引入`@jest/globals` alias、global `jest = vi`或全局timer/console兼容层。
- 普通CommonJS `require()`只保留3处真实CJS fixture，以及`ManagementPage.shell.test.tsx`对`history`/`react-router-dom`两个无完整类型声明的测试运行时入口；另1处`createRequire`仅用于`require.resolve`。这些调用都通过文件局部`createRequire(import.meta.url)`隔离，没有全局shim。

### 6.2 全量coverage首次RED与根因修复

第一次最终配置下的全量coverage执行了全部157个路径，结果为4 files失败、5 tests失败、1501 tests通过。失败均为Jest到Vitest后暴露的测试所有者时序/边界问题，而非production行为回归：

- `ApplicationAccessMenuPages.test.tsx`：完整AntD table渲染超时；改为验证真实table props/列renderer，只渲染动作单元格。
- `GroupTreePage.test.tsx`：根节点出现后同步读取异步子节点；改为`findByText`等待子节点。
- `OrganizationDirectoryQualityPage.test.tsx`：重复前序正文扫描的mega-flow超时；下游流程只等待下一动作，同时保留最终状态、error和fail-closed断言。
- `PlatformApiMappingPage.test.tsx`：永久pending请求叠加巨型诊断面板超时；按production renderer边界拆分readiness、cleanup policy、audit/table和user table测试，并用真实class render tree的Tabs `onChange`驱动harness。

修复没有提高timeout、删除测试、扩大业务mock或增加warning suppression；测试数由1506增加到1510。相关聚焦套件通过后再执行最终全量coverage。

## 7. 最终Vitest全量、warning与性能记录

| 执行 | 结果 | 同硬件耗时 |
| --- | --- | ---: |
| 普通全量中间门禁 `bun run test:ci` | 157/157 files，1506/1506 tests，0 failure | 3579.75秒 |
| 最终全量 `bun x vitest run --coverage` | 157/157 files，1510/1510 tests，0 failure/timeout/unhandled | 3824.30秒 |

- 规范化path集合与Jest基线对比为157/157，missing 0、extra 0。
- 最终运行保持non-silent、single-worker、file-serial；配置为`maxWorkers=1`、`fileParallelism=false`、`sequence.concurrent=false`、`isolate=true`、`mockReset=true`。
- 最终日志warning分类：jsdom pseudo-element `getComputedStyle` 289次、CSS parse 10次、navigation 1次、React act 0次、FakeTimers/native timer 0次、unhandled 0次。
- 配置、setup与测试中没有console filter或`--silent`。Jest基线唯一的React act warning在Vitest最终运行中未重现；这不是由全局warning suppression实现，Vitest/jsdom的300条runtime warning仍完整可见。
- Vitest在当前同硬件、同串行模式下明显慢于Jest基线；本change只记录结果，不把性能作为采用理由，也不混入并行化或性能调优。

## 8. V8 coverage契约

命令：`bun x vitest run --coverage`。

| 指标 | 结果 |
| --- | ---: |
| Statements | 68.99%（16413/23790） |
| Branches | 61.46%（12263/19952） |
| Functions | 67.94%（5798/8534） |
| Lines | 69.00%（15994/23177） |

- text reporter已输出；`coverage-final.json`、`lcov.info`、`clover.xml`均实际生成且可读取。
- JSON内容审计共382个`src`条目：276 TSX、95 TS、11个production locale JSON；测试/`__tests__`/`.d.ts`命中0，`src`外条目0。
- 本change没有修改production组件、业务逻辑或其它production source，因此“受影响实施代码达到85%”门槛为N/A；全仓coverage仅用于验证迁移前后runner/report契约，没有用全仓平均值替代changed-production coverage。

## 9. 依赖安装与锁文件

- `package.json`精确锁定Vitest/coverage `4.1.10`、jsdom `28.1.0`、jest-dom `6.9.1`，并保持Bun `1.3.14`、Vite `8.1.4`、React/ReactDOM `18.2.0`、TypeScript `5.7.3`和Playwright `1.61.1`。
- Windows在未设置`BUN_INSTALL_CACHE_DIR`的默认持久cache下执行标准`bun run deps:install`通过；依赖tree、direct dependency、resolution、critical package与CLI检查完整。
- Linux/CI frozen入口的契约测试确认使用`bun install --frozen-lockfile`；同一`bun.lock`安装前后hash不变，无package manager fallback或手工补包。
- `bun.lock`中Jest有效依赖路径为0；唯一Jest名称来自获准保留的`@testing-library/jest-dom`包名。

## 10. 质量、构建与E2E矩阵

| 门禁 | 结果 |
| --- | --- |
| `bun run typecheck` | PASS |
| `bun run typecheck:build-tooling` | PASS |
| `bun run typecheck:e2e` | PASS |
| incremental TypeScript gate | PASS，未新增production JS/JSX |
| `bun run lint` | PASS |
| `bun run public-scripts:check` | PASS |
| `bun run public-scripts:build` | PASS |
| `bun run public-scripts:smoke` | PASS |
| `bun run build` | PASS |
| `bun run test:e2e:list` | PASS，19 files / 22 tests |

最终测试文件调整后重跑`bun run typecheck`时，先捕获到`ManagementPage.shell.test.tsx`将无声明`history`与不在项目局部声明中的`Router`改成静态import的类型错误；按真实CJS runtime边界恢复局部`createRequire`后，`bun run typecheck`转为PASS，聚焦`ManagementPage.shell.test.tsx`为1 file / 31 tests全部通过。`typecheck:build-tooling`、`typecheck:e2e`、增量TypeScript gate、lint与三组OpenSpec strict也已在最终测试调整后重跑通过。

首次最终commit的pre-commit `eslint --fix`又暴露旧`unused-imports`规则会删除4个仍被类型位置使用的type-only import；提交后`bun run typecheck`按预期RED并报告13处未定义类型。相关测试改用文件局部`import("...").Type`别名或现有namespace类型，避免扩大production声明面并防止hook再次误删；修复后`bun run typecheck`为PASS，4个owner聚焦Vitest为4 files / 26 tests全部通过。

Playwright只做discovery，不修改config/spec/worker/retry，也不运行60部署。

## 11. OpenSpec、单真值与写集审计

- `openspec validate migrate-web-admin-jest-to-vitest --strict`、`openspec validate --changes --strict`和`openspec validate --specs --strict`均通过；最终收口前重跑。
- 活动执行真值中`jest.*`、动态require `@jest/globals`、global Jest alias、Jest runner/config/CLI与`--silent`均为0。
- `FrontendCiGates.test.ts`中保留的`@jest/globals`、`passWithNoTests`文本是防回退断言，不是执行入口；`React.Children.only`不是测试`.only`。真实`test`/`it`/`describe.skip`与`.only`均为0。
- 157个测试路径保持不变；production `src` changed files为0，backend、Docker、Makefile、Playwright实现与`openspec/specs/**` changed files为0。
- archive已新增`web-admin-vitest-toolchain`主规格并退役`web-admin-jest-toolchain`全部要求；旧Jest主规格因无剩余requirement已删除，活动主规格只保留Vitest runner真值。

## 12. 验收层级与剩余风险

- 本change的验收层级限定为依赖、runner、CI、build和test；没有production业务行为改动，也没有60环境、共享DB、真实账号/provider或部署证据，因此不声明业务运行态或端到端生产可用。
- 已知非阻塞风险：当前单worker/file-serial Vitest耗时高于Jest基线；并行化、warning owner清理与性能调优属于后续独立候选。
- RC阶段已完成新鲜质量门禁、pre-archive review、最新base审计、单提交收敛和工作分支push；closeout只同步OpenSpec与归档，不改变RC运行时代码树。

## 13. Pre-archive review

- 结论：本次审查范围内未发现内容级阻断问题；proposal、design、48项tasks、12份delta specs、最终配置/脚本/测试/CI/文档与验证证据描述同一Vitest单一真值。
- OpenSpec文档语言：proposal、design、tasks、verification与本change新增/修改spec自然语言以简体中文为主；保留的英文是OpenSpec固定标题/规范关键字、命令、路径、API/字段名或标准工具术语。三组strict validate均通过。
- 注释review：检查了typed Vitest config/test config、setup与安装器public/config surface；非显然的production隔离、显式RTL cleanup与安装完整性边界均有中文注释。简单asset stub与机械测试迁移无需补复述代码的低价值注释。
- 覆盖率review：production source changed files为0，changed-production 85%门槛为N/A；全量V8 coverage用于验证runner/report契约，测试与声明文件未进入统计目标。
- 验证文档与脱敏：记录只包含仓库相对命令、版本、计数、hash与环境别名；没有私有URL、IP、凭据、Cookie、token、账号或原始长日志。
- 运行态口径：只声明依赖/runner/CI/build/test证据，没有把源码级验证夸大为60部署、真实provider或生产端到端验收。
- 主规格同步：closeout已新增Vitest capability、同步其余受影响主规格、移除Jest requirements并删除空Jest主规格；archive副本保留完整移除delta供审计。
- 最终fetch结果：`origin/hfl-test-base`仍为`89032a5f6a4687b97fa5cbb2427504280881bf3c`且是当前HEAD祖先，无base变更、写集交集或rebase需要；`origin/test`最新观察点与该base一致。
- 交付单元：RC已在latest base上收敛为1个`chore(web-admin): 原子迁移单元测试至 Vitest`逻辑提交；closeout将在同一逻辑提交中amend归档与主规格，不新增第二个change commit。

## 14. Closeout归档证据

- 归档路径：`openspec/changes/archive/2026-07-18-migrate-web-admin-jest-to-vitest/`；OpenSpec active changes为0。
- `openspec archive`先同步11组可直接应用的delta并创建Vitest主规格。旧Jest capability删除全部requirements时会形成空spec，CLI拒绝空规格；closeout保留完整Jest移除delta到archive副本，并按设计删除空主规格。
- archive后修正新Vitest主规格的工具生成`Purpose TBD`，并同步修正本change触及主规格中仍描述旧Yarn/Jest活动真值的Purpose/当前条款；历史交付场景中的旧命令仍按主规格明确规则保留为历史证据。
- 相对授权RC HEAD的closeout工作区变更全部位于`openspec/**`，production/test/config/package/lock/CI运行时diff为0，因此复用157 files / 1510 tests的长coverage证据；closeout仍重跑OpenSpec strict、diff check、聚焦toolchain owners与三组typecheck证明最终tree。
- 未部署或访问60环境，未push/merge `test`。
