# 验证记录

## 当前结论与边界

- 当前结论：Windows 默认持久 cache 标准路径、Bun 单一 lock、完整前端质量门禁、本地 production preview，以及60环境的 production Docker no-cache build 与隔离 candidate smoke 均已通过。
- 生命周期：`ACTIVE`。60运行态锁已在定向清理后释放；本记录仍不表示已归档、已合入 `hfl-test-base` 或已推送 `test`，需完成最新base收敛后才回传 `RC_READY`。
- 候选实现固定于 `ed721ccf54a2e4bd8fba993291aadb5f2e0c072e`执行Windows矩阵；tracked `bun.lock` SHA-256 为 `C984607E09CC245CB68CAFBDCCF34138964DF86BE332331ABF78EE3B1643ABBF`。
- package manager：`bun@1.3.14`；Jest仍是Jest 27，不迁移到 `bun test`。

## 用户手工证据

以下是用户在旧候选 `8ad40f4c`与同一tracked `bun.lock`上的脱敏手工结果，只作为产品决策输入，不冒充本worker自动样本：

1. 已有 `node_modules`上普通 `bun install`首次成功，lock不变且72/72 direct、1/1 resolution、8/8 critical完整。
2. 删除 `node_modules`并使用Windows默认持久cache后，普通install首次成功；随后相同cache的frozen install也首次成功。
3. 显式全新空 `BUN_INSTALL_CACHE_DIR`时，普通install因Windows cache move `EPERM`及后续extract/`ENOENT`失败。
4. 取消custom cache并恢复默认持久cache后，普通install补齐tree并保持lock不变。
5. 既有Linux双源冷frozen样本为6/6成功；本change仍要求以真实production Dockerfile在60复核最终Linux交付路径。

## 旧候选复用审计

### A：直接复用

- `web-admin/bun.lock`：逐字节复用，避免重生成或依赖版本漂移。
- `web-admin/package.json`：复用Bun精确pin、单一lock/guard、`deps:install`、Husky trust与lint glob quoting；dependencies、devDependencies和resolution相对base无版本变化。
- `.github/workflows/build.yml`、`deploy/Dockerfile`、`Makefile`、`web-admin/playwright.config.ts`：复用Bun setup、统一安装入口、quality runner、lock cache key和原有Node/Jest/Vite职责。
- 两条 `local-dev` PowerShell入口、活动说明、完整性检查主体与大部分直接测试：复用原候选的已验证结构。

### B：修改复用

- `web-admin/scripts/install-with-retry.cjs`：Windows改为普通 `bun install`与默认持久cache；Linux保持 `--frozen-lockfile`；Windows显式custom cache在首次spawn前fail-closed，并输出实际平台命令。
- `web-admin/src/PackageManagerInstall.test.ts`：保留版本、lock、tree、Husky、错误可见和重试测试，新增Windows/Linux分派、custom cache sentinel与同cache恢复契约。
- 活动说明与入口测试：补充Windows不设置/清空 `BUN_INSTALL_CACHE_DIR`、Linux frozen及已知空cache恢复边界。

### C：明确废弃

- 未恢复旧active OpenSpec artifacts；旧NO-GO archive保持历史原文。
- 未恢复Windows空/隔离cache 3/3作为标准支持门禁，也未增加相同重试次数、切backend或手工补包。
- RC阶段未修改技术债路线文档；只在未来closeout明确授权后更新最终采用状态。

## TDD与安装器覆盖率

- RED：仅恢复/修改安装与owner测试时，`PackageManagerInstall` 27/27因base缺安装器/Bun lock/平台策略而失败；owner聚焦中6个断言准确命中Yarn CI、Docker、Makefile、Playwright与local-dev入口。
- GREEN：安装器27/27、owner聚焦19/19、组合聚焦46/46通过。
- Pre-archive review额外发现E2E browser安装仍使用可临时下载的 `bun x playwright`。先把直接契约收紧为 `bun x --no-install playwright`并得到1个预期RED，再只修改workflow对应命令；最终组合聚焦4 suites、46/46重新通过，避免CLI缺失时绕过tracked tree。
- changed implementation coverage命令：`bun x --no-install cross-env BABEL_ENV=test NODE_ENV=test PUBLIC_URL= CI=true jest src/PackageManagerInstall.test.ts --runInBand --coverage --collectCoverageFrom=scripts/install-with-retry.cjs --coverageReporters=text`。
- `install-with-retry.cjs`：statements 88.20%、lines 88.95%、functions 85.18%、branches 70.50%；statements/lines达到85%目标，测试覆盖真实失败/恢复/耗尽/漂移/残缺tree和Husky边界。

## Windows默认持久cache自动矩阵

三个detached短路径worktree均来自 `ed721ccf`，初始无 `node_modules`，明确取消 `BUN_INSTALL_CACHE_DIR`，共享现实默认持久cache并严格串行执行最终 `bun run deps:install`。

| 样本 | 结果 | attempts | 耗时 | direct / resolution / critical | lock | manifest tree shape |
| --- | --- | ---: | ---: | --- | --- | --- |
| W1 | exit 0 | 1/5 | 40.82s | 72/72 / 1/1 / 8/8 | 未漂移 | 1751 files；`9555C8A3…E908` |
| W2 | exit 0 | 1/5 | 42.08s | 72/72 / 1/1 / 8/8 | 未漂移 | 1751 files；`9555C8A3…E908` |
| W3 | exit 0 | 1/5 | 56.71s | 72/72 / 1/1 / 8/8 | 未漂移 | 1751 files；`9555C8A3…E908` |

Tree shape按排序后的相对 `package.json`路径、文件长度和内容SHA-256计算。递归JSON解析最初报告6个异常，systematic-debugging确认它们全部是 `resolve/test/resolver/malformed_package_json`的2字节故意损坏fixture，不是Bun截断；因此改用不解释内容的文件shape算法，三轮结果一致。三个样本、其 `node_modules`及本任务Yarn对照worktree均已定向删除；fixed workspace用户tree、默认全局cache与用户证据cache未删除。

## 完整质量门禁

| 验证 | 结果 |
| --- | --- |
| `bun run test:ci`（W3完整tree） | 157/157 suites、1503/1503 tests，0 failure，434.118s |
| 非静默Node/Jest（fixed candidate完整Bun tree） | 157/157 suites、1503/1503 tests，0 failure，524.541s；默认5s timeout未放宽 |
| app / build-tooling / E2E typecheck | 全部exit 0 |
| incremental TypeScript gate（base=`51359c78`） | exit 0 |
| `bun run lint` | exit 0；仅保留既有Browserslist过期提示 |
| public scripts check / build / smoke | 全部exit 0；smoke输出 `public auth scripts smoke passed` |
| `bun run test:e2e:list` | 19 files / 22 tests |

非静默诊断说明：在fresh W3上额外使用非标准 `bun x … jest`入口时，Feishu handoff用例两次超过默认5s；同一用例focused 3/3通过，标准 `bun run test:ci`全量通过，父提交Node/Jest基线中的Feishu suite通过，最终fixed candidate的Node/Jest非静默全量也通过。该现象伴随fresh worktree首个重suite显著变慢，归类为Windows新物化tree/Defender负载诊断信号；未修改Feishu owner、未提高timeout、未添加skip或warning suppression。candidate与父提交非静默输出都保留同一条 `ModelPages` React `act` warning，本change未新增或隐藏它。

## Vite bundle同口径对照

候选以 `bun run build`完成Vite 8.1.4 production build，6325 modules transformed。父提交Yarn单真值worktree复用同一完整依赖tree执行 `yarn build`作为runner-only对照；候选中的Yarn命令因 `packageManager=bun@1.3.14`被正确拒绝，因此没有在候选保留双入口。

| 指标 | Bun候选 | 父提交Yarn runner | 差异 |
| --- | ---: | ---: | ---: |
| JS files | 140 | 140 | 0 |
| CSS files | 3 | 3 | 0 |
| JS+CSS raw | 9,260,950 bytes | 9,260,950 bytes | 0 |
| JS+CSS gzip | 2,697,754 bytes | 2,697,754 bytes | 0 |
| 入口raw / gzip | 485,124 / 137,587 bytes | 485,124 / 137,587 bytes | 0 |
| build tree SHA-256 | `43B24E44…D71E` | `43B24E44…D71E` | 完全一致 |

构建保留既有browser externalize与大chunk提示；本change不升级依赖、不修改production业务源码，未出现bundle回退。

## Chromium production preview

- 使用本地production build、真实Chrome与脱敏只读route fixture；未连接60、共享数据库、真实账号、Provider或凭据。
- `/login`与 `/signup`均真实渲染，静态资源和fixture请求全部200；最终有效会话console为0 error / 0 warning，无page error或requestfailed。
- 1440×900与390×844下 `documentElement.scrollWidth == clientWidth`；登录form和输入框边界均位于视口内，截图目视无重叠、裁切或操作遮挡。
- fixture调试阶段曾因通用route抢占精确application响应产生无效会话；该会话已丢弃并关闭，不作为通过证据。有效会话使用精确query route且单独核对response body。
- 浏览器、preview server与任务截图/report已关闭并随W3 worktree定向清理；本机7417端口无监听。

## 60环境隔离运行态门禁

- 授权后从固定候选 `4e4749abd2e658a875ef2840fb2896848dfeb943`生成可校验Git bundle，并在任务专属临时clone核对HEAD、tracked clean和同一 `bun.lock` SHA-256；未push或改写共享base/test。
- 真实production `deploy/Dockerfile`以 `--no-cache`和 `standard` target构建成功。构建日志证明确切Bun 1.3.14、Linux attempt 1/5执行 `bun install --frozen-lockfile`、72/72 direct、1/1 resolution、8/8 critical完整，以及Vite production build成功。
- 使用唯一Compose project、loopback独立端口、独立PostgreSQL service/network/临时volume启动candidate；candidate与DB均running且restart=0，DB health为healthy，应用 `/api/health`返回HTTP 200。production镜像沿用既有没有Docker `HEALTHCHECK`的契约，因此应用health以真实endpoint、容器state和restart count共同判定。
- `/`、`/login`、受保护静态路由文档及首个前端JS资源均HTTP 200；候选日志中fatal/panic/error计数均为0。真实Chromium在1440×900与390×844下均无横向溢出，登录控件可见；受保护路由正确回到 `/login`，console error、pageerror、requestfailed及HTTP >=400计数均为0。
- 未登录真实账号、未连接Provider、未创建持久业务fixture。既有Admin服务前后保持同一脱敏ID hash、running/healthy和restart=0，未被替换、重启、重建或连接其数据库。
- 清理后本任务container/image/network/volume、远端端口监听和临时目录均为0/不存在；远端clone/bundle/log、本地SSH隧道、Playwright会话/产物与临时bundle均已定向删除。`shared-env:60-admin-deploy`随后立即释放，并已通过 `send_message_to_thread`回传 `RUNTIME_GATE_COMPLETE`。

## 剩余风险

- Windows显式空/隔离cache首次物化仍是Bun 1.3.14已知限制；标准入口会拒绝非空 `BUN_INSTALL_CACHE_DIR`，但不能承诺用户主动清空默认cache后的首次物化可靠。
- 60环境只验证任务专属临时PostgreSQL、真实server health和未登录静态前端链路，不等同真实Provider、认证账号、共享数据库或生产流量E2E。
- 本地fixed workspace中存在7月1日遗留的ignored `.playwright-cli`文件，早于本任务且未清理；本任务新产物均已定向删除。

## OpenSpec、写集与卫生审计

- `openspec validate adopt-web-admin-bun-with-platform-cache-policy --strict`：通过。
- `openspec validate --changes --strict`：1/1 active change通过；未接管其它active change。
- `openspec validate --specs --strict`：57/57主规格通过；RC阶段 `openspec/specs`无diff，等待未来sync-specs归档。
- `git diff --check`：通过；proposal/design/specs/verification无TBD、TODO、FIXME或模板占位，artifact均以LF结尾。
- tracked lock审计只返回 `web-admin/bun.lock`；活动CI、Docker、Makefile、Playwright、local-dev、package和开发说明未发现Yarn/npm fallback。历史archive和归档前主规格不追溯改写。
- 相对 `origin/hfl-test-base@51359c78`，dependencies、devDependencies、resolutions逐字段一致；Go、schema、业务页面、技术债路线和主规格均无diff。
- 运行态后重新fetch确认最新 `origin/hfl-test-base`仍为 `51359c78`且是候选祖先；最终实现相对已部署 `4e4749ab`只新增本change的tasks/verification/pre-archive脱敏证据，package/lock/CI/Docker/local-dev字节未变化，因此不重复Windows三矩阵或60部署。
- 单提交收敛后重新执行4个package manager/CI/Playwright owner聚焦suite，4/4 suites、46/46 tests通过；OpenSpec target/changes/specs strict、单lock/hash、禁止写集、EOF/脱敏和 `git diff --check`均重新通过。
- `origin/hfl-test-base..HEAD`已收敛为1个本change逻辑commit，base为HEAD祖先；工作分支仅普通push，未push或merge base/test。
- 本地旧reference branch仍固定于 `8ad40f4c`且无远端分支；新工作分支、resource locks与lease继续保留。

## Archive 后规格同步

- change已以sync-specs模式归档到 `openspec/changes/archive/2026-07-17-adopt-web-admin-bun-with-platform-cache-policy`，active change列表为空；未使用 `--skip-specs`。
- 归档新增 `web-admin-bun-package-manager`主规格，并同步 `admin-local-dev-workflow`、增量TypeScript、Jest、Playwright、CI gates与Vite六个既有主规格；新主规格 `Purpose`已改为中文正式说明，无自动生成TBD。
- archive delta与本change新增/修改的主规格正文以中文说明为主；`Requirement`、`Scenario`、MUST/SHALL、命令、字段与技术术语保留英文。`admin-local-dev-workflow`沿用既有英文requirement/scenario标识以保持MODIFIED requirement匹配，不属于本change新增英文业务文案。
- archive后 `openspec validate --changes --strict`确认无active change，`openspec validate --specs --strict`为58/58通过；Purpose/TBD、私有地址、双空行EOF与 `git diff --check`审计均通过。
- archive只移动change artifacts并同步主规格，未改变RC已验证的运行时代码、package、lock、CI、Docker或local-dev实现；closeout按规则复用RC长门禁，并重新执行聚焦owner测试与OpenSpec final gate。
