# Admin Vitest ESM optimizer 实施验证记录

## 0. 最终结论

- 最终结果：`NO-GO`。候选没有进入公共runner。
- 触发条件：第二次默认顺序完整候选中，范围外owner `ApplicationEditPageUiCustomization.test.tsx` 的既有用例耗时5349ms并触发默认5秒timeout。
- fail-closed处置：不修改该owner、不扩大写集、不提高timeout；停止shuffle与coverage，回退 `vitest.config.ts`、新增直接契约与全部条件式owner修改。
- 最终runtime/test/production/package/lock/CI diff为0；只保留OpenSpec、AGENTS与技术债基线决策证据。
- 验收层级为本地runner、配置、静态/构建与Playwright discovery；没有访问60、共享DB、真实账号/provider或生产认证链路。

## 1. 开工状态

| 项目 | 结果 |
| --- | --- |
| change | `adopt-web-admin-vitest-esm-optimizer-with-long-tail-stabilization` |
| schema / apply | `spec-driven` / `ready` |
| design HEAD | `28c390ea7218ca4db4ee81f1d9b48c4de9c02198` |
| base | `91b7f8b4a46c116a59a99b51dbc29faac18ab650` |
| origin/test只读快照 | `4c6e606d32472007725b5a95dd42dace2b2535a6` |
| workspace | 固定Admin workspace；tracked clean；local/remote工作分支一致 |
| active changes | 仅目标change；48项实施任务 |

开工时执行了 `git fetch origin --prune`。最新base、只读test快照、远端工作分支与实施授权均无漂移，没有执行merge/rebase/reset/push到base或test。

## 2. 脱敏环境

| 项目 | 结果 |
| --- | --- |
| CPU / 内存档位 | 12逻辑CPU / 约32GiB |
| Bun / Node | 1.3.14 / v24.14.0 |
| Vitest / Vite / jsdom | 4.1.10 / 8.1.4 / 28.1.0 |
| 开工竞争测试进程 | 0 |
| cache身份 | 正式实现前没有本change自有optimizer cache；候选warmup后记录实际metadata |

不记录hostname、用户名、完整临时目录、凭据、私有URL或环境连接信息。

## 3. 只读边界基线

以下为开工时 `git hash-object` 结果，RC前必须保持一致：

| 文件 | Git blob hash |
| --- | --- |
| `web-admin/package.json` | `a2545c1885ce073a70e265fe326458c834354a45` |
| `web-admin/bun.lock` | `a311a5e0a4c248e788bb790731e40ac0541bc044` |
| `web-admin/config/vitest/testConfig.ts` | `13c9608c046025c54ecbdd6cc6161170574e3407` |
| `.github/workflows/build.yml` | `a9f587d12da698b061e55d8949f932a84363bcb0` |
| `deploy/Dockerfile` | `439df6fe578b2520bc627a5cc0af4f84ea959988` |
| `Makefile` | `bdd21eed5ca08ccdefb3ba97c1469cc03b4a79ce` |
| `web-admin/playwright.config.ts` | `2e11f5c6747ba5fb898a9c72af643b5758b9ce9d` |

Production frontend源码、Admin backend/schema/auth/provider、Docker、Makefile、Playwright实现与 `openspec/specs/**` 同样保持禁止写入。

## 4. 后续证据

### 4.1 Toolchain契约RED

- 命令：`bun x vitest run src/FrontendCiGates.test.ts`
- 结果：1 file；13 tests中12通过、1失败；Vitest Duration `2.15s`。
- 有效失败：新增 `keeps the AntD ESM optimizer exact, isolated and test-only` 断言要求 `dependencyEsmEntry("antd")`，当前 `vitest.config.ts` 尚无helper、exact alias与optimizer配置。
- 证据有效性：失败发生在目标配置缺失断言，不是 `import.meta.url` scheme、module loading、语法、环境或0-test错误。

GREEN、optimizer metadata/bundle、renderer、mock/subpath/singleton、重复全量、coverage、非单测工具链、API对照与remaining risk将在对应任务完成后按证据追加。

### 4.2 Toolchain契约GREEN

- 最小实现：`vitest.config.ts`增加ESM入口helper、两个exact root alias，以及仅包含 `enabled/include/exclude` 的client optimizer；`react-dom`是唯一exclude。
- `bun x vitest run src/FrontendCiGates.test.ts`：1 file / 13 tests通过，Vitest Duration `2.41s`。
- `bun run typecheck:build-tooling`：通过。
- 边界审计：`testConfig.ts`、package、lock、workflow、production `vite.config.ts`、Docker、Makefile与Playwright配置hash均未变化；没有 `isolate=false`、threads、timeout、silent或console filter配置。

### 4.3 Optimizer metadata与bundle

- warmup：`App.test.tsx` 1 file / 3 tests通过，Duration `5.71s`。
- metadata：`configHash=b3156f37`、`lockfileHash=c431c5f5`；`antd`与icons均解析到各自 `es/index.js`，`needsInterop=false`。
- bundle：`antd.js`保留2条外部 `react-dom` import；`react-dom/client`与`react-dom/test-utils`引用均为0。
- cache：位于ignored `node_modules/.vite/vitest/**`，未进入git状态；由当前config与lock自动生成。

### 4.4 Renderer、mock、subpath与singleton专项

以下全部使用正式“exact ESM roots + client optimizer include + `react-dom` exclude”配置：

| 专项 | 结果 | Duration | 诊断 |
| --- | --- | ---: | --- |
| renderer默认 | 2 files / 29 tests | 19.23s | renderer/act/unhandled=0 |
| renderer shuffle seed `20260720` | 2 files / 29 tests | 19.11s | renderer/act/unhandled=0 |
| root `vi.mock("antd")` / partial mock | 4 files / 76 tests | 16.87s | missing export/invalid element/renderer/act/unhandled=0 |
| `antd/es/*` subpath mock | 6 files / 153 tests | 77.49s | missing export/invalid element/renderer/act/unhandled=0 |
| App/Modal/WorkspaceTabs/WeCom默认 | 4 files / 41 tests | 20.78s | renderer/act/unhandled=0 |
| 同组合shuffle seed `20260720` | 4 files / 41 tests | 17.18s | renderer/act/unhandled=0 |
| icons `setTwoToneColor` A→B | 2 files / 2 tests | 4.13s | 无singleton泄漏 |
| icons B→A自定义sequencer | 2 files / 2 tests | 4.24s | 无singleton泄漏 |

没有触发missing export、interop、root/subpath mock、singleton、multiple renderer、act/timer或unhandled fail-closed条件。icons sentinel、sequencer与专用cache位于任务自有ignored目录，不提交。

## 5. 正式完整候选

### 5.1 第一次默认顺序

| 项目 | 结果 |
| --- | --- |
| 命令 | `bun x vitest run`；non-watch、non-silent、无bail/timeout/worker覆盖 |
| paths / tests | 157/157 / 1511/1511 |
| failure / timeout / unhandled | 0 / 0 / 0 |
| wall / Vitest | 823.598s / 821.31s |
| 分项 | transform 8.50s；setup 59.19s；import 111.01s；tests 388.51s；environment 203.61s |
| 平均CPU / peak / 进程数 | 0.936核 / 942.2MiB / 6 |
| warning | pseudo 289；CSS parse 10；navigation 1；renderer/act/FakeTimers/native timer/unhandled均0 |

该轮没有默认5秒timeout，4个条件式owner全部保持diff=0，稳定化任务记为N/A。标准default reporter在重定向日志中未输出逐test慢用例行；本change不据此宣称长尾消失，继续保留design profiling中的 `>=4s` owner inventory并以timeout作为条件写权限门槛。

### 5.2 第二次默认顺序与fail-closed

| 项目 | 结果 |
| --- | --- |
| 命令 | `bun x vitest run`；与首轮相同公开命令和默认顺序 |
| paths / tests | 157 files；156通过、1失败；1510 tests通过、1失败，共1511 |
| 明确失败 | `ApplicationEditPageUiCustomization.test.tsx` / `renders runtime-shaped UI customization tab without a white screen` |
| case耗时 / timeout | 5349ms / 默认5000ms |
| wall / Vitest | 805.595s / 803.41s |
| 分项 | transform 8.72s；setup 58.40s；import 110.24s；tests 378.09s；environment 197.77s |
| 平均CPU / peak / 进程数 | 0.966核 / 987.3MiB / 9 |
| warning | pseudo 289；CSS parse 10；navigation 1；renderer/act/FakeTimers/native timer/unhandled均0 |

失败文件不是 `OrganizationDirectoryQualityPage`、`ApplicationUsageAccessPage`、`SyncerEditPage` 或 `OrganizationTreeOperationsPage` 四个条件式owner之一，命中“范围外测试文件”硬门禁。没有运行聚焦修复、没有修改该文件，也没有通过第三次重试覆盖失败；候选立即NO-GO。

### 5.3 回退与未执行门禁

- `vitest.config.ts`恢复为既有资产alias + `test: testConfig`；exact AntD/icons alias与client optimizer不存在。
- `FrontendCiGates.test.ts`删除候选直接契约；回退后1 file / 12 tests通过，Duration `2.22s`。
- 4个条件式owner与范围外失败owner相对design HEAD diff均为0。
- 回退后 `bun run typecheck:build-tooling` 通过。
- file-only shuffle：N/A；第二次默认correctness已失败，继续运行不能改变NO-GO。
- 候选coverage：N/A；没有生成或审计最终候选四类reporter/382 production entries，不使用旧证据冒充。
- production source changed=0，changed-production coverage=N/A。

## 6. 回退后非单测工具链

| 门禁 | 结果 |
| --- | --- |
| `bun run typecheck` | 通过 |
| `bun run typecheck:build-tooling` | 通过 |
| `bun run typecheck:e2e` | 通过 |
| incremental TypeScript gate | 通过 |
| `bun run lint` | 通过；仅既有Browserslist数据库陈旧提示 |
| `bun run public-scripts:check` | 通过 |
| `bun run public-scripts:build` | 通过 |
| `bun run public-scripts:smoke` | 通过 |
| `bun run build` | 通过；保留既有browser external与chunk size提示 |
| `bun run test:e2e:list` | 19 files / 22 tests |

`.github/workflows/build.yml`保持只读；`frontend-checks`继续调用唯一 `bun run test:ci`，没有matrix、sharding或worker覆盖。本change未观察外部CI wall，也不为此等待CI。

## 7. API只读对照

API参考workspace保持 `bd9531aaa2cf01ca465d023a6fa5a5119ff9376d`，未修改、提交或清理任何文件。

- 可复用：Bun单一入口、显式Vitest API、typed config/setup与配置契约组织方式。
- 不适用：API使用Vitest 4.1.5、Vite 7.3.2、jsdom 26、`globals=true`、默认并行、普通/coverage timeout 15s/60s与全局ReactDOM mock。
- API顶层 `optimizeDeps` 属于production dev/build配置，不是Admin `test.deps.optimizer.client` 性能证据。

## 8. 剩余风险

- 当前公共runner仍约一小时，明显慢于历史Jest；本change记录但没有解决该技术债。
- exact ESM optimizer与唯一 `react-dom` exclude的module graph路径已有正向证据，但长尾owner边界仍不完整，不能采用。
- 未来独立change至少需要纳入 `ApplicationEditPageUiCustomization.test.tsx`，并重新运行两次默认、固定shuffle、coverage与全部专项；本次cache和单次绿灯不能复用为采用证据。

## 9. 临时残留与归档前审查

- 已确认无任务Vitest/Jest进程。
- 已删除本任务自有ignored profiler/sentinel/cache、`%TEMP%`原始日志、候选Vitest cache与本次Vite build产物。
- coverage目录不存在；没有清理更早或owner不明的ignored residue。
- `openspec-pre-archive-review` 结论：`READY`。本次审查范围内未发现阻断问题。
- 单测覆盖率门槛：N/A，最终实施代码、runtime config与测试owner diff均为0；候选coverage因correctness失败而明确N/A。
- 注释review：最终没有新增/实质修改函数、类型、字段或公共config surface，无阻断级注释缺口。
- OpenSpec与验证文档以简体中文说明为主；保留英文均为固定标题、命令、路径、代码标识、规范关键字或专有技术词。
- 验证记录只保留脱敏版本、资源档位、hash、时长与分类，不含真实地址、凭据或完整临时路径。
- `openspec/specs/**` diff为0；本NO-GO已按主控closeout授权使用 `skip-specs`，失败候选未同步到主规格。
- 运行态口径仅为本地runner、构建与discovery验证，不声明60、业务E2E或production可用性。
