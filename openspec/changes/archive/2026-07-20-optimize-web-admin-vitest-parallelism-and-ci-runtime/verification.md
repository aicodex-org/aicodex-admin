# Admin Vitest 运行时优化验证记录

## 1. 验证结论

- 最终结论：`NO-GO`。测试专用 exact ESM root alias + `test.deps.optimizer.client` 候选没有进入公共runner。
- 触发原因：首个正式默认顺序完整候选在批准的5个owner之外出现 `OrganizationTreeOperationsPage.test.tsx` 默认5秒timeout，满足设计中的“第6个owner立即fail-closed”条件。
- 最终运行时状态：`web-admin/vitest.config.ts`、`web-admin/src/FrontendCiGates.test.ts`与5个条件式owner均已恢复到实施前状态；production source changed=0，依赖、`bun.lock`、CI与Playwright实现无修改。
- 验收层级仅为本地依赖、runner、测试配置与静态/构建门禁；没有访问60、共享DB、真实账号/provider或生产认证链路。

## 2. 工作区、版本与资源

| 项目 | 结果 |
| --- | --- |
| workspace / branch | 固定Admin workspace；`hfl-test/optimize-web-admin-vitest-parallelism-and-ci-runtime` |
| dispatch HEAD | `6287e14198ac97c17f6f06ed633fadf97006cebe` |
| base / dispatch时origin test | `4c6e606d32472007725b5a95dd42dace2b2535a6` / `89032a5f6a4687b97fa5cbb2427504280881bf3c` |
| RC收敛时origin test | `4c6e606d32472007725b5a95dd42dace2b2535a6`；外部fast-forward，本worker未操作该分支 |
| CPU / 内存 | 12逻辑CPU；约32GiB内存 |
| Bun / Node | 1.3.14 / v24.14.0 |
| Vitest / Vite / jsdom | 4.1.10 / 8.1.4 / 28.1.0 |
| AntD / icons | 5.29.3 / 5.6.1解析版本 |
| `bun.lock` SHA256 | `C431C5F5B2AA408DC2CCB2347B060E7DA7FFC4F75B8786A2341424995E0CD912` |

正式完整候选开跑前竞争Vitest/Jest进程为0。候选使用已存在的可重建warm optimizer cache；metadata为 `configHash=a25eacc1`、`lockfileHash=c431c5f5`，两个优化入口均来自 `es/index.js` 且 `needsInterop=false`。没有清空owner不明的既有cache。

## 3. TDD：Toolchain 契约 RED → GREEN → 回退

1. 首次尝试直接在测试中import顶层 `vitest.config.ts`，Vitest把该模块的 `import.meta.url`置于非`file:`上下文，suite在断言前报 `The URL must be of scheme file`；该轮是无效测试装载方式，不作为RED证据。
2. 按现有 `FrontendCiGates.test.ts` 的配置源码审计模式改写契约。有效RED结果为12个既有test通过、1个新增test失败，失败原因精确为缺少 `find: /^antd$/` 与optimizer配置。
3. 最小实现只在测试专用 `vitest.config.ts` 增加两个exact root ESM alias与 `test.deps.optimizer.client`，保留 `testConfig` 的 `globals=false`、`maxWorkers=1`、`fileParallelism=false`、`sequence.concurrent=false`、`isolate=true`、`mockReset=true`。
4. GREEN：`FrontendCiGates.test.ts` 13/13通过；`typecheck:build-tooling`通过；`App.test.tsx` 3/3通过。实际metadata确认 `antd`与icons均为ESM入口、`needsInterop=false`。
5. 正式完整门禁触发NO-GO后，配置与新增契约测试均回退。回退后 `FrontendCiGates.test.ts` 恢复12/12通过，`typecheck:build-tooling`通过。

## 4. ESM optimizer候选专项证据

以下结果全部明确使用“ESM exact-root alias + client dependency optimizer”的候选配置，不是当前回退后的公共runner证据：

| 专项 | 结果 | Vitest Duration |
| --- | --- | ---: |
| `vi.mock("antd") + vi.importActual("antd")` 4个owner | 4 files / 76 tests通过 | 18.93s |
| `antd/es/*` subpath局部mock 6个owner | 6 files / 153 tests通过 | 70.67s |
| App/Modal/WorkspaceTabs/WeComLoginPanel默认顺序 | 4 files / 41 tests通过 | 17.41s |
| 同一组合file-only shuffle seed 1 | 4 files / 41 tests通过 | 17.46s |
| icons `setTwoToneColor` singleton默认顺序sentinel | 2 files / 2 tests通过 | 3.89s |
| icons singleton反序seed 1 | 2 files / 2 tests通过 | 4.81s |

专项没有出现missing export、invalid element、partial mock、subpath mock、CJS/ESM interop或singleton跨文件泄漏。第一次sentinel专用配置错误使用 `mergeConfig` 拼接了include数组，误启动正式全量；该进程被立即终止，配置改为显式覆盖include后重跑，只有后两次2/2结果作为有效sentinel证据。临时sentinel文件已删除。

## 5. 正式完整候选与fail-closed证据

- 命令身份：任务自有profiler封装的non-silent `bun x vitest run`，使用正式候选配置、1 worker、file-serial、`isolate=true`、默认5秒timeout。
- 运行到 `416.332s` 时按门禁终止；平均CPU约1.04核，进程树峰值`966.8MiB`，峰值5个进程。
- 明确失败：`src/OrganizationTreeOperationsPage.test.tsx` 中“renders organization tree operations diagnostics without treating display data as authority”耗时`5032ms`并timeout；文件总耗时`24902ms`。
- 该文件不属于设计批准的 `ApplicationAccessMenuPages`、`AuditOperationsListPages`、`EntryListPage`、`InvitationListPage`、`common/ListPageIdentityCell` 五owner，且不在正式write_set中。没有修改它，也没有继续扩大owner范围。
- 终止前可见warning：pseudo-element 268、CSS parse 7、navigation 1、React act 0、FakeTimers/native timer 0、unhandled 0。由于运行按fail-closed提前停止，这些是部分计数，不能与完整基线总数直接比较。
- 本轮没有形成有效的157路径/1510 tests完整结果，因此不宣称candidate correctness通过，也不运行后续重复全量、shuffle或coverage。

## 6. 性能与coverage口径

- 设计阶段候选曾得到默认顺序`982.253s`但5个timeout，以及file-only shuffle`873.621s`且157/157、1510/1510通过；这些数据证明优化杠杆，但单次shuffle绿灯不能覆盖正式默认顺序的范围外timeout。
- 本次正式采用门禁在第6个owner处提前NO-GO，因此`<=1200s`重复全量与`<=1800s`coverage门禁均为N/A，不以旧数据冒充最终RC证据。
- 当前公共runner未改变，既有V8 coverage契约仍由上一迁移change的157 files / 1510 tests、382 production条目、text/json/lcov/clover证据覆盖。本change production source changed=0，changed-production 85%门槛为N/A。

## 7. API项目只读对照

只读参考workspace为 `aicodex-api@bd9531aaa2cf01ca465d023a6fa5a5119ff9376d`，未修改、提交或清理任何API文件。

- 可复用：Bun单一脚本入口、显式Vitest API、typed config与setup边界。
- 不适用：API使用Vitest 4.1.5、Vite 7.3.2、jsdom 26、`globals=true`、普通/coverage timeout 15s/60s及默认并行；Admin必须保持Vitest 4.1.10、默认5秒timeout、`globals=false`和单worker/file-serial。
- API的顶层 `optimizeDeps` 属于production dev/build配置，不是 `test.deps.optimizer.client`，不能作为Admin候选正确性证据。
- API coverage reporter、include/exclude与85% thresholds服务于另一套源码边界，不复制到Admin。
- 未来Vitest大版本升级必须重新验证 `vi.mock("antd/es/*")` 与optimizer协作，不能沿用本次4.1.10证据。

## 8. CI与剩余风险

- `.github/workflows/build.yml`保持只读；`frontend-checks`继续通过唯一 `bun run test:ci` 调用当前未优化Vitest真值，没有matrix、sharding或worker覆盖。
- 当前没有等待或观察外部CI，因此没有实际CI wall可记录；该项不作为CI性能门禁。
- 剩余风险：强隔离单worker全量仍明显慢于Jest；AntD重型测试的默认timeout长尾owner范围尚未稳定，不能在没有新设计/写集的情况下采用dependency optimizer或增加workers。

## 9. 回退后质量、构建与E2E门禁

| 门禁 | 结果 |
| --- | --- |
| `bun x vitest run src/FrontendCiGates.test.ts` | 1 file / 12 tests通过 |
| `bun run typecheck` | 通过 |
| `bun run typecheck:build-tooling` | 通过 |
| `bun run typecheck:e2e` | 通过 |
| incremental TypeScript gate | 通过 |
| `bun run lint` | 通过；仅输出既有Browserslist数据库陈旧提示 |
| `bun run public-scripts:check` | 通过 |
| `bun run public-scripts:build` | 通过 |
| `bun run public-scripts:smoke` | 通过 |
| `bun run build` | 通过；保留既有browser external与chunk size提示 |
| `bun run test:e2e:list` | 通过，19 files / 22 tests |

`package.json`、`bun.lock`、`.github/workflows/build.yml`与`playwright.config.ts`相对dispatch HEAD均无diff；lock hash保持不变。`frontend-checks`仍只调用一次 `bun run test:ci`，没有matrix/sharding。已验证本地CLI为Vitest 4.1.10、Vite 8.1.4、Playwright 1.61.1。

## 10. 临时证据与残留清理

- 已删除本任务自有 profiler 目录 `web-admin/node_modules/.aicodex-profile/`。
- 已删除系统临时证据目录 `aicodex-vitest-optimizer-impl-20260720`。
- 已删除经 `_metadata.json` 的 `configHash=a25eacc1` 与 `lockfileHash=c431c5f5` 确认为本候选生成的 Vitest optimizer `deps` cache。
- 未清理早于本任务或 owner 不明的 ignored cache、构建产物和其它本地残留；最终 tracked diff 不包含 profiler、sentinel、coverage、optimizer cache 或原始长日志。

## 11. 归档前审查与主规格口径

- `openspec-pre-archive-review` 结论：`READY`。本次审查范围内未发现阻断问题。
- 最终实施代码与测试运行时 diff 为 0，因此受影响 production source coverage 门槛为 N/A；没有用旧 coverage 结果冒充候选通过。
- proposal、design、tasks、implementation plan、verification 与 delta specs 的说明正文以简体中文为主；保留英文均为OpenSpec固定标题、命令、路径、代码标识或专有技术词。
- 本change没有新增或实质修改代码函数、类型、字段或公共配置，因此注释 review 没有阻断级缺口。
- 验证记录只保留脱敏workspace别名、版本、hash与资源档位，不包含真实环境地址、凭据或私有URL。
- 已使用`skip-specs`归档：最终公共runner、CI、package、lock、测试owner与production均不变，两份当前主规格的SHA256与归档前一致且diff为0；delta specs仅作为NO-GO决策证据保留在归档副本中。
- RC收敛前发现`origin/test`由dispatch快照外部fast-forward到当前base提交；主控确认接受新的只读快照。本worker没有merge、push、rebase或reset `test`，该共享ref变化不属于本change diff。
