## 1. 启动门禁、证据与OpenSpec

- [x] 1.1 只读确认用户手工命令已结束、无Bun安装进程、tracked workspace clean，保留完整 `node_modules`、默认全局cache与 `C:\btv-empty-normal-20260717`证据cache。
- [x] 1.2 保留本地reference branch `hfl-test/adopt-web-admin-bun-with-bounded-install-retry@8ad40f4c`且不push，从 `origin/hfl-test-base@51359c78`创建新工作分支并确认active changes为空。
- [x] 1.3 读取仓库/web-admin规则、旧Bun NO-GO archives、相关主规格、当前package/CI/Docker/Makefile/Playwright/local-dev owner与用户最新手工证据。
- [x] 1.4 以 `git diff/show`建立旧候选逐文件A直接复用/B修改复用/C废弃矩阵，明确不恢复旧active OpenSpec、空隔离cache门禁或技术债路线候选修改。
- [x] 1.5 创建完整中文proposal/design/7个delta specs/tasks，固定Windows默认持久cache、Linux frozen、5次上限、lock/tree fail-closed、60隔离门禁、整体Yarn回滚和RC-only边界。
- [x] 1.6 运行OpenSpec target/all changes strict与 `git diff --check`，完成pre-implementation review循环至READY并提交OpenSpec里程碑。

## 2. TDD建立平台安装策略

- [x] 2.1 从reference commit只恢复 `PackageManagerInstall.test.ts`测试面，不恢复production安装器；新增/调整RED证明Windows应使用普通install、Linux应使用frozen、实际命令日志应随平台变化。
- [x] 2.2 运行聚焦Jest并确认RED因base缺少Bun安装器/平台策略而失败，不因import、fixture或Jest配置错误失败。
- [x] 2.3 新增RED证明Windows显式 `BUN_INSTALL_CACHE_DIR`在首次spawn前fail-fast且不删除cache，Windows未设置变量时同workspace普通install可在后续attempt恢复。
- [x] 2.4 新增RED证明Linux最多5次复用同workspace执行frozen install；两平台lock漂移立即停止、exit 0但tree残缺继续占用上限、失败stdout/stderr保持可见。
- [x] 2.5 选择性恢复reference安装器，最小修改平台参数、custom-cache guard和命令日志，使平台策略RED转GREEN；保留版本、lock/direct/resolution/critical、CLI、guard与Husky主体。
- [x] 2.6 运行安装器聚焦Jest与changed executable coverage，要求statements/lines均>=85%；把关键策略注释收敛为中文且不添加低价值测试。

## 3. Bun单一真值与依赖锁

- [x] 3.1 先恢复/调整package manager契约测试形成RED，证明base仍为Yarn、无 `bun.lock`且Bun guard/runner未建立。
- [x] 3.2 从reference精确恢复 `web-admin/bun.lock` bytes，并核对SHA-256为 `C984607E09CC245CB68CAFBDCCF34138964DF86BE332331ABF78EE3B1643ABBF`；不得重新生成或引入依赖版本漂移。
- [x] 3.3 选择性恢复 `package.json`的 `packageManager=bun@1.3.14`、`deps:install`、Bun guard/prebuild、Husky trust与lint glob quoting，删除 `yarn.lock`；dependencies/devDependencies/resolutions与base一致。
- [x] 3.4 运行package/lock直接测试、Bun版本/lock hash审计和实际tree完整性检查，确认72/72 direct、1/1 resolution、8/8 critical及当前平台CLI成立。
- [x] 3.5 在真实Git workspace执行pre-commit证明Husky v4通过 `bun x --no-install`运行；无Git环境no-op、未知/残缺hook结构fail-closed且不使用 `--no-verify`。

## 4. CI、Docker、开发入口和活动说明复用

- [x] 4.1 先恢复 `FrontendCiGates.test.ts`、`PackageManagerEntrypoints.test.ts`、`PlaywrightE2eToolchain.test.ts`及必要直接测试，运行RED证明base仍引用Yarn owner。
- [x] 4.2 选择性恢复reference的 `.github/workflows/build.yml`、`deploy/Dockerfile`、`Makefile`和 `web-admin/playwright.config.ts`；确认Linux调用统一入口后实际选择frozen、Bun版本精确且Node/Jest/Vite/build目录不变。
- [x] 4.3 选择性恢复两条Windows local-dev脚本的Bun-only启动；补直接测试/静态审计证明脚本不设置、清空或重定向 `BUN_INSTALL_CACHE_DIR`，不存在Yarn/npm fallback。
- [x] 4.4 选择性恢复README、quickstart、local-dev README、web-admin AGENTS、增量TS skill与两份设计维护说明的Bun命令，再补Windows默认持久cache、空custom cache诊断/恢复与Linux frozen说明。
- [x] 4.5 运行owner聚焦Jest、PowerShell语法、workflow/Docker静态契约和活动Yarn入口审计；历史archive中的Yarn术语不计活动入口。

## 5. Windows默认持久cache现实矩阵

- [x] 5.1 将实现候选固定为commit，从该commit创建3个独立短路径worktree；每个初始无 `node_modules`、使用相同package/`bun.lock`且明确取消 `BUN_INSTALL_CACHE_DIR`，不删除fixed workspace用户tree或任何cache。
- [x] 5.2 严格串行执行3次最终 `bun run deps:install`，共享现实默认持久cache；每轮记录attempt、耗时、失败类别、lock hash、72/72 direct、1/1 resolution、8/8 critical和tree shape。
- [x] 5.3 比较3轮lock/tree确定性，要求3/3在<=5次内成功、lock不变且tree shape一致；若标准路径失败，按systematic-debugging完成错误链、单变量假设、RED/可逆修复与重验后再判断是否需要controller决策。
- [x] 5.4 核对并删除3个任务worktree及其 `node_modules`/局部产物；不删除默认全局Bun cache、用户证据cache或未知用户输出。

## 6. 完整本地质量门禁

- [x] 6.1 在Windows矩阵的完整Buntree运行non-silent全量Jest与 `bun run test:ci`，确认discovery不低于最新base、0 failure且没有新增warning suppression。
- [x] 6.2 串行运行app/build-tooling/E2E typecheck、增量TypeScript gate、production lint和public scripts check/build/smoke。
- [x] 6.3 运行Vite production build，记录入口、JS/CSS文件数、raw/gzip合计和主要bundle与Yarn基线同口径差异；不要求性能收益但解释无依据明显回退。
- [x] 6.4 运行Playwright discovery并确认19 files/22 tests；使用脱敏fixture完成本地Chromium build/preview smoke，检查登录页/关键静态路由、console/pageerror/requestfailed和1440/390布局，不连接60或共享DB执行写入E2E。
- [x] 6.5 运行OpenSpec target/all changes/all specs strict、`git diff --check`、中文/Purpose/TBD/脱敏/EOF、单lock、活动Yarn入口和禁止写集审计；核对delta specs要求未来sync后所有现行主规格标准命令使用Bun且不改历史archive；清理coverage/build/report/browser/process残留。

## 7. 本地pre-archive与运行态门禁

- [x] 7.1 将用户manual evidence、A/B/C复用文件、Windows矩阵、局部/完整质量、coverage、bundle和清理结果写入中文脱敏 `verification.md`，明确manual evidence不冒充自动样本。
- [x] 7.2 使用pre-archive review迭代检查代码/spec/tasks/verification/coverage/注释/文档与残留至READY，明确60是真实production路径唯一待完成硬门禁。
- [x] 7.3 通过 `send_message_to_thread`向controller发送结构化 `RUNTIME_GATE_READY`，保持ACTIVE、工作分支、resource locks和lease；发送失败时回报 `RETURN_CHANNEL_BLOCKED`。
- [x] 7.4 在controller即时复核并明确授权 `shared-env:60-admin-deploy`前不访问、不构建或部署60。

## 8. 获授权后的60隔离真实部署

- [x] 8.1 获controller时点授权后读取runtime-smoke规则，从同一RC branch/commit和相同 `bun.lock`建立任务专属临时clone。
- [x] 8.2 使用production Dockerfile真实执行no-cache build，记录脱敏image/lock hash、Linux frozen attempts、完整性和build结果；不得用手工Dockerfile、宿主tree或旧image layer替代。
- [x] 8.3 以独立Compose project、端口和临时数据库volume启动candidate，验证真实server health、登录页、关键静态路由/资源、console/pageerror/requestfailed且不触碰现有Admin服务/DB。
- [x] 8.4 按创建清单删除本任务container/image/network/volume/clone/log并核对无进程残留；不清理未知60资源。

## 9. 最终pre-archive与RC交付

- [x] 9.1 将60证据写入verification，重新完成最终pre-archive review至READY；不把本地fixture、discovery或manual evidence夸大为完整E2E。
- [x] 9.2 fetch/rebase latest `origin/hfl-test-base`；若package/lock/CI/Docker/local-dev受上游影响，重跑Windows矩阵和相关质量/60门禁。
- [x] 9.3 收敛为latest base + 1逻辑commit并普通push新工作分支；保持active、不archive、不push base/test、不删新分支或旧reference branch、不释放lease。
- [x] 9.4 通过 `send_message_to_thread`向controller发送结构化 `RC_READY` envelope，包含HEAD/base、changed files、A/B/C复用、Windows矩阵、质量/coverage、60部署、remaining risk、residue、`push_test=false`、`lease_release=false`和 `needs_master_decision=true`。
