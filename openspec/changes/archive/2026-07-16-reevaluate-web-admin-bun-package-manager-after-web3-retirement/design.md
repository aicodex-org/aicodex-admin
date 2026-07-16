## Context

Admin 当前仍以 Yarn Classic 1.22.22 与 `yarn.lock` 为唯一依赖真值。前三轮 Bun 1.3.14 Windows 评估分别在原始 Cypress 12、Cypress 15 候选和 `copyfile` backend 下复现 cache/extraction 或物化阶段缺文件；降低 lifecycle 并发也没有解阻。此后 Cypress 已由 Playwright 1.61.1 替代，Web3 钱包认证删除 13 个直接依赖和 291 个专属 lock 条目，Vite 构建的 transformed modules 从 8246 降至 5445；RTL 又升级到 16.3.2/DOM 10.4.1。当前 Jest 基线为 145 suites/1371 tests，Playwright discovery 为 19 files/22 tests。

截至 2026-07-16，Bun 官方 stable 仍为 1.3.14，与本机现有版本一致。Windows tarball extraction 缺文件 issue #32458 仍 open；hardlink 串行化 PR #33113 仍 open、未合并且不等同于 #32458 的修复。因而本次重评触发因素是 Admin 依赖树缩小，不是 Bun stable 已修复。官方状态只帮助解释结果，不能代替本机隔离样本。

本 change 是纯评估且保持 release-candidate-only。tracked workspace 只保存 OpenSpec artifacts；安装、cache、lock、日志和 `node_modules` 全部位于仓库外短路径。registry endpoint、认证参数和完整日志不写入仓库或回传。

初版 RC 后，用户提供 API 项目在多个本地 Git workspace 中长期使用 Bun 的成功经验，主控要求增加只读对照。补证必须区分“已有或经重试修复的开发 tree 可运行”与“新 clone 能从固定 lock 一次性、可重复重建完整 tree”；不能因为 API 能 build 就否定 Admin 冷安装矩阵，也不能因为严格冷样本失败就声称 API 的日常路径不可用。

## Goals / Non-Goals

**Goals:**

- 在最新 tracked 输入上得到至少 3 个相互隔离、真实执行 lifecycle 的 Bun frozen install 主样本。
- 同时验证 exit code、ENOENT、lock 可复现性、依赖树 shape 和关键 package manifest/CLI binary，而不是把 install exit 0 单独视为成功。
- 只有 3/3 主样本完整成功后，才比较 Yarn 冷安装、执行完整质量门禁并审计 CI/Docker/Makefile/local-dev 迁移边界。
- 用预先固定的 20% 安装收益、10% Jest/Vite 回退、Docker 可构建和完整质量门禁裁决 `GO`/`NO-GO`。
- 保留脱敏、可复核且与证据层级一致的 verification，并清理所有临时残留。

**Non-Goals:**

- 不修改或迁移 tracked `package.json`、`yarn.lock`、workflow、Docker、Makefile、local-dev、业务代码或测试。
- 不迁移 `bun test`、Vitest，不升级 React、Router、Jest、Vite、Playwright、RTL 或业务依赖。
- 不复测 Cypress/Web3 已删除依赖，不把历史失败次数当作当前样本，也不唯一归因依赖树缩小的效果。
- 不触碰 60、共享数据库、真实 Provider/认证链路或破坏性 E2E。
- 即使结论为 `GO`，也不在本 change 实施 package manager 迁移；迁移必须另立 change。

## Decisions

### 1. 固定 Bun 1.3.14 stable，不替换全局工具

官方 latest 与本机 Bun 都是 1.3.14，因此直接使用现有 binary并记录可执行文件版本，不升级全局、不安装 canary或未发布PR构建。若执行期间官方 stable发生变化，本 change不混跑版本；应停止、更新设计并从头生成全部主样本。

替代方案是使用 #33113 的PR构建或canary，但它会把未发布实现与依赖树缩小两个变量混在一起，也不能证明 stable可采用，因此拒绝。

### 2. 每个主样本从同一 tracked 输入独立构造

每轮从固定 HEAD 的 `web-admin` tracked内容创建仓库外短路径副本。样本保留原始 dependency/devDependency/resolution/script声明与 `yarn.lock`，只在临时 `package.json` 做两类 Bun运行必需调整并逐项记录：

- 把拒绝非Yarn安装的 `preinstall` guard改为只允许当前 Bun executable；
- 对确有 install lifecycle owner 的包增加最小 `trustedDependencies`，当前候选只包含保留的 Husky owner，不加入已删除的 Cypress/Web3包。

三轮使用字节相同的候选 `package.json` 和 tracked `yarn.lock`。不修改依赖范围、`resolutions`、scripts或源文件，不手工补包。Yarn lock只用于 Bun首次生成候选 `bun.lock` 时导入当前解析真值；同一轮随后仍保留相同输入并以新生成的 `bun.lock`执行 frozen install。正式迁移若获GO，必须删除Yarn lock形成单真值，但本评估不通过改 tracked 文件预演迁移。

### 3. lock生成与frozen install分别使用空cache

每个样本拥有独立的 workspace、lock-generation cache、frozen-install cache和日志目录。先在空 `node_modules` 下执行 `bun install --lockfile-only`，记录 package/yarn输入hash、`bun.lock` hash和entry/tree metadata；然后清空确认 `node_modules` 不存在，切换到该样本自己的另一个空cache，执行 `bun install --frozen-lockfile --backend=hardlink`。三轮严格串行，不使用 `--ignore-scripts`、`--no-save`、Yarn `node_modules`、共享Bun cache或手工复制缺失文件。

显式使用 stable默认的Windows `hardlink` backend，避免不同轮次由环境选择不同物化路径。前一轮已经证明 `copyfile` 和 `--concurrent-scripts=1` 不能解除旧树的cache/extraction失败，本次不在主样本失败后用这些已否定workaround覆盖结果。

### 4. 完整性与可复现性共同定义有效样本

每轮记录 lock/frozen阶段exit与耗时、脱敏ENOENT计数、`bun.lock` SHA-256/entry数、`node_modules` 相对路径+文件大小的tree shape hash、文件数和逻辑字节。关键检查至少包含：

- React/ReactDOM、Jest、Vite、RTL/DOM、Playwright、`rc-virtual-list` 的manifest和可解析入口；
- `playwright` CLI shim与版本命令；
- 当前Vite Windows原生binding的manifest、入口和可加载性；
- Husky等实际lifecycle owner的执行/阻断状态；
- Bun解析的direct dependencies与tracked Yarn基线无未批准漂移。

三轮都必须exit 0、无缺文件/残缺入口、lock hash/entry集合一致、tree shape一致。任一条件失败即该样本无效并固定最终 `NO-GO`；继续跑完余下主样本只用于判断可复现性，不进入性能或质量结论。

### 5. 只有3/3成功才进入Yarn、性能与质量门禁

若主样本3/3有效，使用原始 `package.json + yarn.lock`、三个独立短路径workspace和空Yarn cache串行运行3个 `yarn install --frozen-lockfile --non-interactive` cold control。以三次Bun与三次Yarn有效样本的中位数计算 `(Yarn median - Bun median) / Yarn median * 100%`，改善不足20%即 `NO-GO`；失败/下载异常样本不选择性剔除，需按预先规则说明是否整组不可复现。

随后只在完整Bun tree上通过 `bun run`执行现有Jest而不是 `bun test`：完整 `test:ci`必须保持至少145 suites/1371 tests；运行app/build-tooling/E2E typecheck、增量TypeScript gate、production lint、public scripts check/build/smoke和Playwright 19/22 discovery。Vite production build使用已显式完成的 `bun run public-scripts:build` 后执行 `bun run vite build`，避免修改临时scripts或借现有 `prebuild`中的Yarn调用形成混合样本。完整Jest与Vite各记录可比较耗时，均不得相对Yarn基线无依据回退超过10%。

不在60或共享数据库运行Playwright。只有存在仓库认可的一次性SQLite边界时才允许完整22/22，否则本评估只要求discovery；临时数据库、report、trace和browser产物必须清理。

### 6. CI/Docker迁移可行性是GO硬门禁

官方 `setup-bun@v2` 只缓存Bun executable，不识别 `bun.lock`作为依赖cache，也不替代frozen install。后续迁移方案必须精确pin Bun、提交唯一 `bun.lock`、显式运行 `bun ci`/`bun install --frozen-lockfile`，并为依赖cache设计独立且以lock hash为key的策略；不得保留 `yarn.lock`伪装action兼容。

项目CI还必须继续真实执行Jest与Playwright，而不是只安装Bun。Docker候选必须用可审查的Bun image/Node runtime边界复制 `package.json + bun.lock`并完成真实frozen install和Vite build；官方Docker示例只能证明通用模式，不能替代本项目build。当前本机没有Docker CLI；若成功路径可达但没有真实Docker构建证据，则不得判定 `GO`。

Makefile、Windows local-dev、package guard/prebuild与维护文档的活动Yarn调用均需在未来迁移change一次性切换，不能长期双入口。本 change只记录迁移写集，不修改这些文件。

### 7. RC只提交结论与脱敏证据

`verification.md`记录版本、官方公开URL、样本摘要、hash/entry/tree指标、条件门禁状态、清理结果和剩余风险；不保存raw安装日志、registry URL、credential、token、Cookie或完整私有endpoint。结论只允许：全部硬门禁通过时为 `GO`，其它兼容失败、收益未达标或必要证据不可取得时均为本轮采用决策的 `NO-GO`。必要证据不可取得的原因必须单列，不能伪造通过，也不能通过扩大写集绕过。

RC完成后保持active/unarchived，收敛为latest base之上一个逻辑评估commit并只push工作分支；不push base/test、不删除分支、不释放lease。

若主控后续接受本次 `NO-GO` 并授权历史归档，archive MUST 使用 `--skip-specs`：`web-admin-bun-package-manager-reevaluation` 是一次性评估门禁，不应生成“已采用Bun”或长期重复执行本轮样本的主规格。archive前后主规格tree必须保持不变。

### 8. API成功基线按“安装可复现性”和“tree可运行性”分层对照

API 与 Admin 在本机使用同一 Bun 1.3.14，都是单 package、无 `bunfig.toml`、无 workspace/monorepo；因此不能把 Admin 失败归因于 symlink 或 monorepo。API 的差异主要是原生 tracked `bun.lock`、71个直接依赖、Vite 7/Vitest 4工具链，以及不含 Admin 的 Jest 27、legacy Babel/stylelint/Husky组合。API 本地 Makefile执行裸 `bun install`，Ubuntu CI执行一次 `bun install --frozen-lockfile`；Linux Docker固定Bun 1.3.11并以最多5次退避重试处理安装失败。API仓库只读，本 change不修改其package、lock、cache或现有 `node_modules`。

API固定tree在Windows短路径、独立空cache、显式hardlink frozen条件下同样0/3，三轮lock一致而tree/缺失依赖不一致。这只证明该严格Windows冷重建口径不稳定，不能外推成API现有workspace不可运行。默认backend与本机常规cache的API frozen样本也因 `ts-morph` 相关cache move失败；裸 `bun install`仍以非零退出，但71/71 direct已物化且Vite build成功，说明“install命令成功”和“已有tree足以运行部分质量门禁”是不同证据层级。

用户建议的 `linker=hoisted` 也按单变量验证：Admin保持相同lock、空cache、hardlink frozen，只增加hoisted linker，仍在156.315秒后exit 1，出现142条ENOENT且只有61/73 direct。它把症状从大量cache move变成嵌套 `node_modules`打开失败，没有形成有效tree，因此不作为修复方案。

Admin随后使用同一个导入后 `bun.lock`、移除临时Yarn lock、默认backend/linker/cache并按API本地入口执行裸 `bun install`。首次仍非零退出且缺少 `moment`、`less`、`vite`；在同一workspace不清tree重跑相同命令后22.781秒退出0并补齐73/73。修复tree通过app/build-tooling/E2E typecheck、public scripts check/build/smoke、Vite build、145 suites/1371 tests与Playwright 19 files/22 tests discovery。原始 `bun run lint`因未加引号的 `**/*.test.*` glob退出5；只给glob加引号后退出0，证明这是Bun script runner兼容变量，不是依赖缺失。

Bun Windows生成的CLI入口是 `.exe`/`.bunx`，不是Yarn的 `.cmd`。因此初版verification把 `playwright.cmd` 当作Bun完整性标志属于检查器错误，修订后以 `playwright.exe`/`.bunx`、manifest和命令退出共同判断；主矩阵仍因install exit 1、direct缺失和tree不一致而失败，不依赖错误的 `.cmd`断言。

本轮仍判 `NO-GO`：预先固定的成功门槛是3/3新tree一次frozen安装成功，不能在事后用人工重试放宽。API对照同时证明下一轮最小可验证变量不是升级Cypress或任一单包，而是“单一原生Bun lock + 同一workspace有界frozen重试 + Bun shell glob兼容调整”。若产品接受CI/Docker显式重试策略，应另立迁移change，在Windows和Linux各验证新clone的重试上限、失败透明性、完整质量门禁与无残缺tree后再决定采用。

## Risks / Trade-offs

- [同一stable的Windows缺文件问题具有非确定性] → 三个独立workspace、两阶段空cache、lock/tree hash和关键入口共同判定；不以一次成功覆盖一次失败。
- [Yarn lock导入掩盖Bun自主解析差异] → 评估目标是迁移当前真值而非顺手升级；记录Bun lock与Yarn direct resolution差异，未来迁移仍以唯一Bun lock frozen reinstall验证。
- [依赖树缩小与环境噪声混淆] → 固定HEAD、版本、短路径、串行运行和独立cache；不把结果唯一归因于Web3删除。
- [lifecycle被Bun默认信任策略跳过] → 只添加有owner的最小trusted list，检查安装输出与lifecycle产物/状态；禁止全局ignore scripts。
- [Playwright browser下载使安装口径不等价] → package install只验证CLI shim；browser安装与E2E属于后续质量/CI门禁，不计入dependency cold install。
- [本机无Docker导致成功路径不能闭环] → Docker是GO硬门禁；缺证据时不降级为静态通过。
- [临时日志泄漏registry信息] → raw日志仅留在仓库外，verification只写计数、公开package名与脱敏错误类别，结束后删除。
- [API已有tree能运行被误写成一次冷安装成功] → 分开记录install exit、direct/关键完整性、build/测试结果和重试次数；不把任一层级替代另一层级。
- [重试掩盖永久缺失或让CI偶发变绿] → 本轮不放宽3/3一次安装门槛；未来若评估重试，必须固定最大次数、每次检查完整性并在耗尽时fail-closed。

## Migration Plan

1. 完成中文proposal/design/spec/tasks及实施前review，固定HEAD、版本、候选输入hash和检查清单。
2. 串行运行3个Bun主样本；任一失败时固定 `NO-GO`并停止性能/质量门禁。
3. 仅3/3成功时运行Yarn controls、收益比较、完整质量门禁和Docker/CI可行性验证。
4. 初版RC后只读比较API真实入口与Windows临时样本，并以Admin API式裸安装/同tree重试和质量门禁验证最小差异。
5. 形成脱敏verification，清理所有临时workspace/cache/lock/log/binary/process/report，并完成pre-archive review。
6. rebase latest base、重跑最终文档/OpenSpec门禁，收敛为单commit并push RC工作分支，等待主控决策。

本 change没有运行时迁移或回滚。临时评估失败只需删除已验证属于本任务的短路径根；不得删除workspace既有依赖或未知用户产物。

## Open Questions

无。版本、输入、样本数、停止点、收益阈值、质量门禁、Docker硬门禁和RC边界均已明确。
