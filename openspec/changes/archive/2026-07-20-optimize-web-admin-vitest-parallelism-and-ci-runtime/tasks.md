## 1. 开工复核与执行计划

- [x] 1.1 `git fetch origin --prune`，复核最新 `origin/hfl-test-base`、`origin/test`、工作分支、active changes和写集；base前进时只在无交集/无设计影响下rebase。
- [x] 1.2 读取根目录与 `web-admin/AGENTS.md`、本change artifacts、当前Vitest主规格与上一迁移verification，确认实施仅限测试专用optimizer、5个owner和文档。
- [x] 1.3 在change目录编写 `implementation-plan.md`，把exact alias、optimizer、owner RED/GREEN、完整门禁与回退拆成可执行步骤，不引入subagent或60环境。
- [x] 1.4 记录Bun/Node/Vitest/Vite/jsdom版本、CPU/内存档位和竞争测试进程为0；确认依赖版本与 `bun.lock` 不需要变化。

## 2. Toolchain契约 RED

- [x] 2.1 更新Vitest直接配置契约测试，要求 `/^antd$/` 与 `/^@ant-design\/icons$/` 精确根alias分别指向安装包 `es/index.js`，并确认 `antd/es/*`、locale、style与其它subpath不匹配。
- [x] 2.2 要求 `test.deps.optimizer.client.enabled=true` 且include精确为 `antd`、`@ant-design/icons`；禁止CJS `lib/index.js` alias、`server.deps.external`替代、全局interop shim或第二runner配置。
- [x] 2.3 更新 `web-admin/src/FrontendCiGates.test.ts`，要求 `bun run test:ci` 继续non-watch/non-silent并调用唯一Vitest配置；保持 `maxWorkers=1`、`fileParallelism=false`、`sequence.concurrent=false`、`isolate=true`、`mockReset=true`。
- [x] 2.4 补充production Vite隔离、coverage reporters、optimizer cache不tracked与串行fail-closed契约；以当前配置运行聚焦测试并保存预期RED。

## 3. 完整候选owner门禁与NO-GO

- [x] 3.1 以ESM optimizer正式候选运行默认顺序完整轮；没有继续假设只会复现既有5个owner，而是捕获到批准范围外的 `OrganizationTreeOperationsPage.test.tsx` 默认timeout并记录RED边界。
- [x] 3.2 `ApplicationAccessMenuPages.test.tsx`稳定化为N/A：第6个owner先触发NO-GO，未修改该文件。
- [x] 3.3 `AuditOperationsListPages.test.tsx`稳定化为N/A：第6个owner先触发NO-GO，未修改该文件。
- [x] 3.4 `EntryListPage.test.tsx`稳定化为N/A：第6个owner先触发NO-GO，未修改该文件。
- [x] 3.5 `InvitationListPage.test.tsx`稳定化为N/A：第6个owner先触发NO-GO，未修改该文件。
- [x] 3.6 `common/ListPageIdentityCell.test.tsx`稳定化为N/A：第6个owner先触发NO-GO，未修改该文件。
- [x] 3.7 5个owner实施后矩阵为N/A：候选在任何owner修改前已NO-GO；保留设计阶段52/52聚焦证据但不冒充实施GREEN。
- [x] 3.8 审计owner diff为0；没有新增sleep、提高timeout、删测/删断言、扩大mock、过滤warning或production修改，并已在第6个owner处立即停止。

## 4. ESM exact-root optimizer 实施

- [x] 4.1 在 `web-admin/vitest.config.ts` 使用 `rootDir` 生成绝对 `antd/es/index.js` 与icons `es/index.js`路径，并以精确根正则加入测试module graph alias。
- [x] 4.2 在jsdom对应 `test.deps.optimizer.client` 显式启用optimizer并include两个根包；保持既有CSS module/style/file/SVG aliases及production Vite配置不变。
- [x] 4.3 保持 `web-admin/config/vitest/testConfig.ts` 的forks、1 worker、file-serial、单文件内串行、isolate、mockReset与coverage契约；若无需修改则只读审计。
- [x] 4.4 运行toolchain契约测试确认RED转GREEN，并静态审计无CJS alias、external替代、isolate=false、2/4/8 workers、自动CPU比例或全局timeout。
- [x] 4.5 检查optimizer metadata：两个入口均来自 `es/index.js`、`needsInterop=false`，cache位于ignored目录且删除后可由当前lock/config重建。

## 5. Mock、subpath与singleton隔离门禁

- [x] 5.1 运行4个 `vi.mock("antd") + vi.importActual("antd")` owner，确认根mock/export语义、76个既有test和warning不回退。
- [x] 5.2 运行 `ApplicationEditPage`、UI customization、LargeEditFormLayout、ManagementPage、UserEditPage与Antd5ModalOpen等 `antd/es/*` 局部mock owner，确认subpath未被根alias改写。
- [x] 5.3 使用现有 `App`、Modal、WorkspaceTabs、WeComLoginPanel组合执行默认与file-only shuffle，验证message/modal/ConfigProvider/cssinjs与根mock交互稳定。
- [x] 5.4 以最小临时sentinel或等价直接契约验证icons `setTwoToneColor` 正反文件顺序不泄漏；临时文件与optimizer cache不得提交。
- [x] 5.5 任一missing export、invalid element、mock截获失败、CJS/ESM interop差异或singleton泄漏 SHALL 阻止采用，不得新增兼容层或扩大mock掩盖。

## 6. 完整correctness、性能与coverage门禁

- [x] 6.1 候选157/1510完整核对为N/A：正式轮在范围外timeout处按设计提前终止；verification明确不宣称完整correctness，当前runner既有157/1510真值保持不变。
- [x] 6.2 两次连续默认顺序完整轮为N/A：首轮已触发第6个owner硬门禁，没有浪费资源重复失败候选。
- [x] 6.3 file-only shuffle实施门禁为N/A：首轮默认顺序先失败；设计阶段873.621s证据只保留为候选历史。
- [x] 6.4 候选部分warning已分类为pseudo-element 268、CSS parse 7、navigation 1、act 0、FakeTimers/native timer 0、unhandled 0，并明确不与完整基线直接比较。
- [x] 6.5 V8 coverage实施门禁为N/A：普通correctness未绿，按设计不运行昂贵coverage，也不使用旧report冒充候选通过。
- [x] 6.6 coverage条目审计沿用未修改公共runner的上一迁移契约；本change production source changed=0，changed-production coverage为N/A。
- [x] 6.7 已记录warm cache、正式候选`416.332s`提前终止、平均1.04核、峰值`966.8MiB`及设计阶段873.621s仍慢于Jest543.836s的口径。
- [x] 6.8 第6个owner触发后已回滚正式optimizer、直接契约与全部条件式owner，保留当前single-worker/file-serial真值并以NO-GO收口。

## 7. CI、工具链、文档与交付收敛

- [x] 7.1 复核 `.github/workflows/build.yml` 的 `frontend-checks` 继续调用同一 `bun run test:ci`；job身份、触发、matrix/sharding与coverage merge均未修改。
- [x] 7.2 运行 `bun run typecheck`、`typecheck:build-tooling`、`typecheck:e2e` 与增量TypeScript gate，全部通过。
- [x] 7.3 运行 `bun run lint`、`public-scripts:check`、`public-scripts:build`、`public-scripts:smoke` 和 `bun run build`，全部通过。
- [x] 7.4 运行 `bun run test:e2e:list`，Playwright discovery保持19 files / 22 tests；未运行60部署。
- [x] 7.5 审计 `package.json`、`bun.lock`、direct dependencies和critical CLI完整性；immutable文件无diff，lock hash保持不变。
- [x] 7.6 更新 `web-admin/AGENTS.md` 与 `docs/admin-technical-debt-baseline-2026-07-14.md`，记录optimizer NO-GO、当前串行真值与后续独立change边界。
- [x] 7.7 编写 `verification.md`，以简体中文记录脱敏环境、TDD、候选专项、NO-GO、warning/资源/工具链证据和remaining risk，不提交原始长日志。
- [x] 7.8 更新最终proposal、design、delta specs与tasks，使全部artifact描述同一NO-GO结果，无未决占位符或模板残留。
- [x] 7.9 运行目标change、all changes、all specs strict与 `git diff --check`，审计最终diff只命中授权写集。
- [x] 7.10 执行pre-archive review到READY；最终收敛为最新base上的单一逻辑commit、tracked clean并push工作分支，回传RC_READY且不archive、不push test、不释放locks。
