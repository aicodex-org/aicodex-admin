## Context

Admin当前以Yarn Classic、`yarn.lock`和Yarn-only `preinstall`作为唯一package manager真值。旧候选 `8ad40f4c4161c68b6761b8c2e89fcc6e3fd63d66` 已实现Bun 1.3.14单一lock、安装完整性检查、CI/Docker/Makefile/local-dev切换和直接测试，但它把Windows与Linux都绑定到空/隔离cache下的frozen install，最终因Windows样本连续5次失败而按当时门禁NO-GO归档。旧archive是有效历史证据，本change不改写它。

用户随后在同一候选和同一tracked `bun.lock`上完成单变量复核：已有tree的普通install成功；删除 `node_modules`后，Windows默认持久cache的普通install首次成功，随后相同cache的frozen install首次成功；显式全新空 `BUN_INSTALL_CACHE_DIR`的普通install失败；取消该变量、恢复默认持久cache后快速补齐并通过72/72 direct、1/1 resolution、8/8 critical，lock保持 `C984607E09CC245CB68CAFBDCCF34138964DF86BE332331ABF78EE3B1643ABBF`。结合既有Linux双源6/6冷frozen成功，当前证据把失败边界收窄为Bun 1.3.14 Windows空/隔离cache首次物化路径，而不是frozen参数、lock或依赖集合本身。

当前fixed workspace已由用户退出手工介入，无Bun安装进程；用户完整 `node_modules`、默认全局cache和 `C:\btv-empty-normal-20260717`证据cache均不得删除。旧reference branch继续本地保留且不push。新change从 `origin/hfl-test-base@51359c78`独立建立，release-candidate-only阶段不得archive、push base/test、删除新工作分支或释放lease。

## Goals / Non-Goals

**Goals:**

- 以精确 `bun@1.3.14`和唯一tracked `bun.lock`替代Yarn真值，同时保持Node、Jest 27、Vite和Playwright职责不变。
- 用一个跨平台安装器实现Windows普通install+默认持久cache、Linux frozen install；两端共享Bun版本、lock hash、direct/resolution/关键入口完整性和最多5次透明重试。
- Windows标准入口不设置、清空或使用显式 `BUN_INSTALL_CACHE_DIR`；Linux CI/Docker不继承Windows custom-cache策略。
- 选择性复用旧候选产出，不机械重写等价lock、owner迁移、完整性检查、Husky兼容或测试。
- 在默认持久cache的真实Windows路径完成3次fresh `node_modules`重建、完整前端质量门禁和浏览器/build smoke。
- 仅在controller时点授权后，从同一RC branch/lock完成60环境production Dockerfile no-cache build和隔离candidate运行态smoke。

**Non-Goals:**

- 不再次执行Windows空/隔离cache压力矩阵，不把该非标准路径的失败当作标准支持路径否决项。
- 不迁移到 `bun test`，不升级Bun或React、Router、Jest、Vite、Playwright、Ant Design及其它业务依赖。
- 不保留Yarn fallback、双lock、`--ignore-scripts`、手工补包、无界重试或不完整tree放行。
- 不修改业务页面、Go业务代码、数据库schema、认证/Provider契约、旧NO-GO archive或 `origin/test`。
- RC阶段不更新技术债基线；只有后续closeout明确授权后才把最终采用状态写入路线文档。

## Decisions

### 1. 使用单一平台分派安装器

仓库保留一个只依赖Node标准库的 `web-admin/scripts/install-with-retry.cjs`。CLI根据 `process.platform`选择安装参数：Windows执行 `bun install`，其它受支持交付平台执行 `bun install --frozen-lockfile`。所有CI、Docker、Makefile和安装说明调用同一 `bun run deps:install`，避免为平台复制版本、重试和完整性逻辑。

替代方案一是CI/Docker/Windows分别维护命令，直观但容易漂移；替代方案二是不重试，只做一次install和post-check，无法利用已验证的同cache恢复能力。统一分派在YAGNI范围内复用旧候选主体，并保持失败语义一致。

### 2. Windows标准路径使用默认持久cache

Windows入口执行普通install，最多5次复用同一workspace、`node_modules`和默认全局cache。入口本身不得设置、清空或重定向 `BUN_INSTALL_CACHE_DIR`；若进程环境显式提供该变量，入口在首次install前fail-fast，提示取消变量后重新运行标准入口。这样不会把已知不可靠的空隔离cache意外包装成受支持路径，也不会静默删除用户cache。

每次失败保留完整stdout/stderr并有界退避；若用户在非标准手工诊断中遇到空cache物化失败，恢复方式是保留同一cache/tree重试，或取消 `BUN_INSTALL_CACHE_DIR`回到默认持久cache。文档不得建议手工补包、忽略lifecycle或增加无界重试。

### 3. Linux CI与Docker保持frozen install

Linux入口执行 `bun install --frozen-lockfile`，最多5次复用同一workspace/cache。GitHub Actions通过 `oven-sh/setup-bun@v2`精确安装1.3.14，不保留Yarn依赖cache；production Docker从精确Bun镜像注入binary到现有Node 24 frontend builder，并在只复制package、lock和安装器的依赖层执行统一入口。

Linux重试仍不能修改lock或掩盖失败。60最终必须使用production Dockerfile no-cache build，证明镜像内真实Linux路径，而不是以本机Windowstree或静态Docker审计替代。

### 4. Lock与依赖树完整性是成功的一部分

入口在首次attempt前校验实际Bun版本等于 `packageManager` pin并计算 `bun.lock` SHA-256。每次attempt后都复核hash；任何漂移立即停止，不进入下一次重试。install exit 0后动态枚举 `dependencies + devDependencies`的全部manifest并校验名称，验证全部 `resolutions`精确版本、React/ReactDOM/Jest/Vite/Playwright/`rc-virtual-list`可解析入口及当前平台CLI shim。

只有命令exit 0且完整性检查通过才成功；exit 0但tree不完整继续占用当前5次上限，最终耗尽返回非零。错误只输出公开package名、计数和相对类别，不读取或打印registry、credential、token、Cookie、DSN或raw config。

### 5. 逐文件复用矩阵

矩阵已以 `git diff origin/hfl-test-base..8ad40f4c`、`git show 8ad40f4c:<path>`和当前base owner核实。实施先恢复测试形成RED，再选择性恢复候选production文件并做最小策略修改。

| 类别 | 文件/边界 | 处理与理由 |
| --- | --- | --- |
| A 直接复用 | `web-admin/bun.lock` | 精确复用candidate bytes；用户手工证据与旧候选均绑定SHA-256 `C984…BBF`，不得重新生成造成无关依赖漂移。 |
| A 直接复用 | `web-admin/package.json`除平台实现外的单真值改动 | 复用 `packageManager=bun@1.3.14`、`deps:install`、Bun guard/prebuild、`trustedDependencies=[husky]`和lint glob quoting；dependencies/devDependencies/resolution保持base版本。 |
| A 直接复用 | `.github/workflows/build.yml`、`deploy/Dockerfile`、`Makefile`、`web-admin/playwright.config.ts` | 复用setup Bun、统一安装入口、Bun quality runner、`bun.lock` cache key、Node职责和build目录；统一安装器会在Linux自动选择frozen。 |
| A 直接复用 | `local-dev/start-frontend-remote-backend.ps1`、`local-dev/start-windows-local-dev.ps1` | 复用Bun-only启动和无Yarn/npm fallback；不在脚本内设置或清理Bun cache变量。 |
| A 直接复用 | `install-with-retry.cjs`的版本/lock hash、`runProcess`、direct/resolution/critical验证、CLI候选、guard和Husky v4兼容 | 这些行为与新平台策略正交，保留现有测试价值；关键自由说明注释在最终review时统一为中文。 |
| A 直接复用 | `FrontendCiGates.test.ts`、`PackageManagerEntrypoints.test.ts`、`PlaywrightE2eToolchain.test.ts`及大部分 `PackageManagerInstall.test.ts` | 复用单Bun真值、owner切换、错误可见、版本、lock漂移、tree完整性和Husky契约测试。 |
| A/最小文案复用 | README、quickstart、local-dev README、web-admin AGENTS、增量TS skill与两份设计维护说明 | 复用活动Yarn入口到Bun的机械迁移，再补平台cache限制与恢复说明；不复制完整日志。 |
| B 修改复用 | `web-admin/scripts/install-with-retry.cjs` | 将固定frozen参数改为平台策略：Windows普通install且拒绝显式custom cache，Linux frozen；日志报告实际命令与cache policy，其余主体不重写。 |
| B 修改复用 | `web-admin/src/PackageManagerInstall.test.ts` | 先恢复旧测试形成RED；保留原25项高价值行为，修改跨平台命令断言并新增Windows custom-cache fail-fast、Windows同cache普通install、Linux frozen测试。 |
| B 修改复用 | 直接入口/文档测试 | 增加“Windows入口不设置/清理 `BUN_INSTALL_CACHE_DIR`、Linux统一入口frozen”的可观察契约，不用静态字符串测试替代真实安装器行为。 |
| C 废弃 | `openspec/changes/adopt-web-admin-bun-with-bounded-install-retry/**` | 旧active artifacts已由base按NO-GO历史归档；新change独立建档，绝不恢复或改写旧archive。 |
| C 废弃 | 旧Windows空/隔离cache frozen 3/3门禁与相应断言 | 与新支持边界冲突；保留在历史archive，不进入新spec/tasks/quality结论。 |
| C 废弃 | 旧candidate对 `docs/admin-technical-debt-baseline-2026-07-14.md`的改动 | RC阶段禁止修改路线文档；只在未来closeout授权后依据最终状态更新。 |

### 6. Husky与工具职责保持原边界

Husky 4不认识Bun package manager。安装器在完整tree后只规范化当前Git workspace生成hook为 `bun x --no-install`；无Git环境安全no-op，未知/残缺hook结构fail-closed。Jest继续由Jest 27执行，Vite继续生成 `web-admin/build`，Playwright保持typed config、19 files/22 tests和一次性数据库边界。

### 7. Windows、质量与60验收分层

固定candidate commit后，从同一commit建立3个独立短路径worktree；每个初始无 `node_modules`，均不设置 `BUN_INSTALL_CACHE_DIR`，串行调用最终 `bun run deps:install`并共享现实默认持久cache。记录attempt、耗时、lock hash、72/72 direct、1/1 resolution、8/8 critical和tree shape；3次都必须成功、lock不变且tree一致。该矩阵不删除fixed workspace中用户保留的完整 `node_modules`或全局cache。

完整质量门禁在上述完整Buntree执行全量Jest、三类typecheck、增量TypeScript、production lint、public scripts、Vite build和Playwright discovery，并做脱敏浏览器/build smoke。只有本地pre-archive review READY后才跨线程发送 `RUNTIME_GATE_READY`；controller即时授权前禁止访问60。

60使用同一RC branch/lock执行production Dockerfile no-cache build，以独立Compose project、端口和临时数据库volume启动candidate，验证server health、登录页、关键静态路由、资源、console/page/request；不得替换现有服务或连接现有DB，结束后仅清理本任务资源。

### 8. 调试与停止边界

安装、脚本、质量或60门禁失败时，先按systematic-debugging读取完整错误链、稳定复现、比较工作路径、提出单一假设并做可逆单变量修复；修复前补RED并重验。空隔离cache失败属于已知非标准压力场景，不触发迁移撤销。只有标准Windows默认cache路径持续失败且无可控修复、lock漂移/tree不一致无法收口、需要触碰现有60服务，或出现真实产品/安全/数据取舍时才回传controller决策。

## Risks / Trade-offs

- [Windows默认cache可能被用户清空或损坏] → 标准入口仍透明失败并有界复用同cache；文档提供恢复默认cache/保留同tree重试，不承诺空cache首次成功。
- [普通Windows install理论上可更新lock] → attempt前后hash不变是硬门禁，漂移立即停止；tracked diff必须clean。
- [平台分支可能被CI模拟测试覆盖而未真实执行] → 本地行为测试覆盖分派，Linux最终由真实Docker no-cache build验证，Windows由3个现实默认cache worktree验证。
- [同一默认cache使3轮不是冷性能样本] → 本change验证日常可靠性而非冷cache性能，不声称速度收益，也不把结果与历史空cache耗时混算。
- [Husky生成hook是未跟踪状态] → 安装器仅在识别Husky v4结构时定向修改并有测试；最终卫生检查恢复/确认当前分支期望状态。
- [RC期间base前进] → push RC前fetch/rebase；package/lock/CI/Docker/local-dev受影响时重跑Windows矩阵和相关质量/60门禁。

## Migration Plan

1. 完成新OpenSpec和实施前review，固定平台策略、复用矩阵、验证与回滚边界。
2. 先从reference commit恢复候选tests并新增平台策略RED，确认base/旧安装器因预期缺失行为失败。
3. 选择性恢复A类文件，修改B类安装器/tests，明确排除C类旧OpenSpec和空cache门禁。
4. 在固定候选上完成3个Windows默认持久cache fresh `node_modules`样本和完整本地质量/浏览器门禁。
5. 完成本地pre-archive review并向controller发送 `RUNTIME_GATE_READY`；获时点授权后才进入60。
6. 完成60 no-cache production Docker与隔离candidate smoke，清理本任务资源并完成最终pre-archive review。
7. 收敛为latest base + 1逻辑commit并普通push新工作分支，发送 `RC_READY`；不archive、不push base/test、不删分支或释放lease。
8. 后续若获closeout授权，sync-specs归档并整体合入；回滚以revert整个逻辑commit一次恢复Yarn package、lock、CI、Docker和本地入口。

## Open Questions

无。平台cache边界、最多5次重试、单lock、Windows现实样本、Linux frozen、60隔离门禁、复用优先、RC-only和回滚均已由用户/controller明确。
