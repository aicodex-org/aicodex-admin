## 1. 开工复核与中文执行计划

- [x] 1.1 `git fetch origin --prune`，核对最新 `origin/hfl-test-base`、`origin/test`、工作分支远端、active changes与tracked工作区；base前进或远端工作分支漂移时按调度门禁停止猜测。
- [x] 1.2 运行 `openspec status --change adopt-web-admin-vitest-esm-optimizer-with-long-tail-stabilization --json` 与 `openspec instructions apply --change ... --json`，完整读取全部contextFiles、proposal、design、tasks、delta specs与profiling证据。
- [x] 1.3 在change目录编写简体中文 `implementation-plan.md`，把TDD、module graph、条件式owner、重复全量、coverage、工具链与回退拆成可执行检查点。
- [x] 1.4 记录脱敏Bun/Node/Vitest/Vite/jsdom版本、CPU/内存档位、竞争测试进程与optimizer cache身份；不记录hostname、用户名或完整临时路径。
- [x] 1.5 确认 `package.json`、`bun.lock`、`config/vitest/testConfig.ts`、CI、Docker、Makefile、Playwright实现与production源码为只读；依赖或production需求立即回传主控。

## 2. Toolchain契约 RED

- [x] 2.1 在 `FrontendCiGates.test.ts` 增加 `/^antd$/` 与 `/^@ant-design\/icons$/` 精确根alias契约，要求绝对目标为各自安装包 `es/index.js`，并证明 `antd/es/*`、locale、style与其它subpath不匹配。
- [x] 2.2 增加 `test.deps.optimizer.client` 契约：`enabled=true`、include精确为 `antd`与icons、exclude精确为 `react-dom`，禁止额外exclude/external/dedupe或CJS alias。
- [x] 2.3 保持 `maxWorkers=1`、`fileParallelism=false`、`sequence.concurrent=false`、`isolate=true`、`mockReset=true`、`globals=false`与默认5秒timeout的直接契约。
- [x] 2.4 增加production Vite隔离、optimizer cache不tracked、coverage reporters与唯一 `bun run test:ci` 入口契约；不得修改workflow或package scripts。
- [x] 2.5 运行聚焦 `FrontendCiGates.test.ts`，保存因缺少exact alias/optimizer/exclude而失败的有效RED；测试装载方式自身错误不得冒充RED。

## 3. Exact ESM optimizer最小实现

- [x] 3.1 在 `vitest.config.ts` 基于现有 `rootDir` 增加安装包ESM入口绝对路径helper，不读取浮动registry或硬编码机器路径。
- [x] 3.2 仅增加两个exact root alias，保留CSS Modules、普通style、SVG与asset alias原有顺序和语义。
- [x] 3.3 仅在jsdom对应 `test.deps.optimizer.client` 启用include两个根包与exclude `react-dom`；不修改production `vite.config.ts`。
- [x] 3.4 审计 `config/vitest/testConfig.ts` diff为0；若现有顶层配置可以表达契约，不触碰该条件文件。
- [x] 3.5 运行聚焦契约测试与 `bun run typecheck:build-tooling` 取得GREEN，并静态审计无timeout提升、多worker、threads、`isolate=false`、CJS alias或warning suppression。
- [x] 3.6 审计optimizer metadata与产物：两个入口均为 `es/index.js`、`needsInterop=false`，`react-dom`为外部import，`react-dom/client`与`react-dom/test-utils`引用为0，cache ignored且可重建。

## 4. Module graph、mock与singleton专项

- [x] 4.1 以正式候选运行 `ApplicationEditPageUiCustomization` + `RolePermissionEditPages` 默认顺序独立进程，要求2 files / 29 tests、multiple renderers/act/unhandled为0。
- [x] 4.2 同一renderer组合以反序或等价file-only重排再运行一次，要求29/29与renderer warning为0。
- [x] 4.3 运行4个 `vi.mock("antd") + vi.importActual("antd")` owner，确认根mock/export语义、76个既有test与warning不回退。
- [x] 4.4 运行6个 `antd/es/*` subpath mock owner，确认153个既有test通过且exact根alias未改写subpath。
- [x] 4.5 运行App、Antd5ModalOpen、WorkspaceTabs、WeComLoginPanel默认与file-only shuffle/反序，确认41个test和message/modal/ConfigProvider/cssinjs状态稳定。
- [x] 4.6 使用ignored临时sentinel或等价直接契约运行icons `setTwoToneColor` A→B与B→A，证明跨文件singleton不泄漏；sentinel不得提交。
- [x] 4.7 任一missing export、invalid element、mock截获失败、interop差异、singleton泄漏、multiple renderers、act、FakeTimers/native timer或unhandled触发配置回退和NO-GO，不改测试掩盖module graph问题。

## 5. 有界长尾owner治理

- [x] 5.1 在无竞争测试进程下运行首个正式默认顺序完整候选，不使用bail；记录全部timeout、单test `>=4s`、wall、分项、warning、CPU、peak working set与进程数。
- [x] 5.2 若首轮0 timeout，则4个条件式owner均记录为N/A并保持diff为0；不得因为top suite累计耗时主动批量改写。
- [x] 5.3 若 `OrganizationDirectoryQualityPage.test.tsx` 复现默认timeout，先以聚焦/顺序对照建立RED，再仅用拆分mega-flow、减少重复render、等价轻量harness或明确等待完成GREEN。
- [x] 5.4 若 `ApplicationUsageAccessPage.test.tsx` 复现默认timeout，按同一RED/GREEN与允许手段最小稳定化，保持测试路径、断言强度与业务mock边界。
- [x] 5.5 若 `SyncerEditPage.test.tsx` 复现默认timeout，先证明不是module graph或系统竞争，再按明确promise/DOM/microtask完成条件或等价轻量harness稳定化。
- [x] 5.6 若 `OrganizationTreeOperationsPage.test.tsx` 复现默认timeout，先复核上一5032ms历史case与当前候选差异，再按测试体根因最小稳定化。
- [x] 5.7 出现第5个timeout owner、范围外测试文件、新依赖、production需求或需要提高timeout/扩大mock时立即停止采用，回退公共runner并以NO-GO收口。
- [x] 5.8 任一条件式owner修改后运行聚焦RED/GREEN、正反序相邻suite与断言强度审计，确认无sleep、删测/删断言、skip/only、warning suppression或production diff。

## 6. 完整correctness、性能与coverage门禁

- [x] 6.1 把第5节首轮或owner修复后的首轮计为第一次有效默认顺序完整轮：157/157 paths、tests不少于1510、0 failure/timeout/unhandled、wall `<=1200s`、peak `<2GiB`。
- [x] 6.2 第二次默认顺序完整轮已执行并在范围外owner触发5349ms默认timeout；完整记录correctness、warning、wall与资源后按门禁NO-GO。
- [x] 6.3 file-only shuffle为N/A：第二次默认correctness已失败，按fail-closed停止，不用额外轮次覆盖失败。
- [x] 6.4 两次默认non-silent日志已分类pseudo-element、CSS parse、navigation、multiple renderers、React act、FakeTimers/native timer与unhandled；第三轮因NO-GO为N/A，未新增过滤。
- [x] 6.5 最终候选V8 coverage为N/A：普通correctness先失败，未运行昂贵coverage，也未切换provider或复用旧结果冒充。
- [x] 6.6 候选382 production entries审计为N/A；production source changed=0，changed-production 85%同样记录为N/A。
- [x] 6.7 对照当前3579.75s与历史Jest543.836s记录同机同模式基准，只报告实测改善与剩余差距，不把warm cache数字写成CI SLA。

## 7. 非单测工具链、文档与RC收敛

- [x] 7.1 运行 `bun run typecheck`、`typecheck:build-tooling`、`typecheck:e2e` 与增量TypeScript gate，全部通过。
- [x] 7.2 运行 `bun run lint`、`public-scripts:check`、`public-scripts:build`、`public-scripts:smoke` 与 `bun run build`，记录既有warning但不得新增suppression。
- [x] 7.3 运行 `bun run test:e2e:list`，Playwright discovery保持19 files / 22 tests且无skip/only；不访问或部署60。
- [x] 7.4 只读审计 `.github/workflows/build.yml` 的 `frontend-checks` 继续调用唯一 `bun run test:ci`，不增加matrix/sharding/worker覆盖；若可观察真实CI wall只记录后续基线。
- [x] 7.5 只读审计API参考项目，更新verification中的可复用组织方式与Vitest/Vite/jsdom、globals、timeout、并行、ReactDOM mock、production optimizeDeps差异。
- [x] 7.6 更新 `web-admin/AGENTS.md` 与技术债基线，记录exact ESM optimizer第二次默认范围外timeout的NO-GO、完整回退、强隔离门禁与Vitest大版本回归要求。
- [x] 7.7 编写简体中文 `verification.md`，记录脱敏环境、TDD、metadata/bundle、owner、完整轮、coverage、warning、工具链、API对照、remaining risk与临时残留清理。
- [x] 7.8 更新proposal/design/tasks/delta specs使artifact与最终GO或fail-closed NO-GO结果一致，无TODO、TBD、模板残留、乱码、敏感路径或动态过期状态。
- [x] 7.9 运行目标change、all changes、all specs strict、`git diff --check`、写集/禁止集、package/lock/CI/production diff审计。
- [x] 7.10 使用 `openspec-pre-archive-review` 迭代到READY；fetch最新base/test后把工作分支收敛为latest base + 1 logical commit并普通push，只回传RC_READY，不archive、不push base/test、不释放locks。
