# 验证记录

## 决策摘要

- 结论：**NO-GO**。
- Bun 1.3.14 在Web3退役、Cypress迁出和RTL升级后的最新Admin依赖树上仍未形成有效Windows依赖树。3个独立短路径主样本的candidate `bun.lock`完全一致，但3次真实frozen lifecycle install全部 `exit 1`，分别出现98、112、76条ENOENT和168、172、162次cache移动失败，0/3有效。
- 三轮残缺 `node_modules` 的tree shape hash均不同，direct dependency完整数分别为55、60、59，低于预期73；每轮均缺direct或关键manifest。初版把Yarn风格 `playwright.cmd`误作Bun完整性标志，补证确认Bun Windows入口实际为 `playwright.exe`/`.bunx`并已纠正；主样本失败结论仍由非零exit、direct缺失和tree不一致独立成立。
- 按预先批准的fail-fast规则，Yarn cold controls、20%收益和主样本成功路径质量门禁因0/3有效而停止，未在三棵残缺tree上伪造结果。用户追加API成功基线后，另以API式裸安装在独立Admin临时tree补证：首次 `exit 1`且缺3个direct，同workspace第二次安装 `exit 0`并补齐73/73；恢复tree通过typecheck、public scripts、Vite、145 suites/1371 tests及Playwright 19/22 discovery。
- API式恢复证明Admin不是“完全不能运行Bun”，也解释了已有API workspace为何可用；但一次fresh/frozen安装仍不稳定，且原始 `bun run lint`需给glob加引号才通过。预先固定的3/3一次frozen门槛没有满足，因此本轮采用决策仍为 `NO-GO`，不以事后人工重试放宽。
- tracked workspace只新增当前OpenSpec artifacts；`web-admin/package.json`、`yarn.lock`、workflow、Docker、Makefile、local-dev、业务代码和测试未修改。Yarn 1.22.22与 `yarn.lock`继续作为唯一活动真值。
- RC阶段保持release-candidate-only且未push base/test；主控轻审计通过后已授权历史closeout，本归档使用 `--skip-specs`，共享分支push与工作分支清理状态由最终closeout回传记录。

## 基线与输入

| 项目 | 值 |
| --- | --- |
| 固定评估源码HEAD | `0ab60e60a4270951adcf7991e07c0084126b2a97` |
| RC最新base | `origin/hfl-test-base@4a9056317b4f6c574a3f40d9f220325170025dca` |
| `origin/test` | `5420c8c386de7daee84b7df41de65ba1c404bf2a`（只读，未push/merge） |
| tracked `web-admin` tree | `4cd90cdbeffed07e4c8be0a43b80c43812ba9806` |
| OS / Node.js | Windows x64 / `v24.14.0` |
| Yarn / Bun | `1.22.22` / `1.3.14` |
| React / Jest / Vite | React 18.2 / Jest 27.5.1 / Vite 8.1.4 |
| Playwright | 1.61.1；当前契约19 files/22 tests |
| Testing Library | RTL 16.3.2 / DOM 10.4.1 |
| 当前完整Jest基线 | 145 suites / 1371 tests |
| Docker | 本机无Docker CLI；未声称真实Docker build通过 |

- 当前tracked `package.json`仍包含Yarn-only `preinstall`和Yarn `prebuild`；CI、Docker、Makefile、Windows local-dev与Playwright cache key也仍使用Yarn/`yarn.lock`。
- 最新lock未发现Cypress、Web3 Onboard、`@metamask/eth-sig-util`、`ethers`或`bluebird`活动条目。Web3退役archive记录已删除13个直接依赖、291个专属lock条目，production transformed modules由8246降至5445；该变化只构成重评触发条件，不构成结果归因。
- candidate package SHA-256三轮均为 `62372CA6B5B8CE0C8EAFF957B82AD5CD82B9B85E8C5394AB28DC5450C03070CC`；tracked Yarn lock SHA-256三轮均为 `0F06934B9F6C9C1F06FD49756F1B8E7C07764C81A2A6457583B04DF9A6B64539`。

## API只读对照基线

| 维度 | API webui | Admin web-admin |
| --- | --- | --- |
| 固定源码/tree | API固定HEAD的tracked `webui` tree；仓库只读 | Admin固定评估HEAD/tree |
| Bun / package形态 | Bun 1.3.14；单package；无bunfig/workspace | Bun 1.3.14；单package；无bunfig/workspace |
| Lock来源 | 原生tracked `bun.lock`，1252 entries | tracked `yarn.lock`导入candidate `bun.lock`，1486 entries |
| 直接依赖 | 71 | 73 |
| 生命周期 | 无pre/postinstall；1个tracked trusted owner | 临时替换Yarn-only guard；只trust Husky owner |
| 工具链 | Vite 7.3.2、Vitest 4.1.5、Playwright 1.58.2 | Vite 8.1.4、Jest 27.5.1、Playwright 1.61.1及legacy Babel/stylelint/Husky树 |
| 本地入口 | Makefile裸 `bun install`后build | tracked入口仍为Yarn；本补证临时模拟API裸安装 |
| CI / Docker | Ubuntu CI一次frozen；Linux Docker固定较早Bun并最多5次退避重试 | CI/Docker仍为Yarn，本change不修改 |

- 本机四个API Git workspace在检查时均已有 `node_modules`，但这只能证明当前tree存在；用户说明这些workspace来源于独立Git clone且曾从无依赖状态安装。无法从现有tree反推出当时Bun版本、首次exit或重试次数，因此补证以固定源码临时副本重新采样。
- Admin主样本显式hardlink且cache/workspace同盘；API补证同时覆盖默认backend与本机常规cache。结果不支持“symlink、monorepo、跨盘或旧Cypress单包”作为已证实唯一根因。

## 官方资料审计

访问日期：2026-07-16。公网结论只用于版本和归因背景，GO/NO-GO来自本机隔离样本。

| 官方资料 | 当前状态 | 评估含义 |
| --- | --- | --- |
| [Bun v1.3.14 release](https://github.com/oven-sh/bun/releases/tag/bun-v1.3.14) | GitHub官方latest stable仍为1.3.14，发布于2026-05-13 | 本机与stable一致，不升级全局、不使用canary或未发布构建。 |
| [Bun issue #32458](https://github.com/oven-sh/bun/issues/32458) | open；报告Windows 1.3.14 tarball extraction/深层文件缺失；无已发布修复 | 症状相关但没有maintainer确认的唯一根因，只作中等强度线索。 |
| [Bun PR #33113](https://github.com/oven-sh/bun/pull/33113) | open、未合并、未发布 | 处理Windows hardlink串行化，不等同于#32458的cache/tar extraction修复，不能写成stable已解阻。 |
| [setup-bun v2.2.0](https://github.com/oven-sh/setup-bun/releases/tag/v2.2.0) | 当前v2 release；action只缓存Bun executable | 后续CI仍需显式 `bun ci`/frozen install和独立依赖cache；只安装Bun不等于执行质量门禁。 |
| [Bun lockfile](https://bun.com/docs/pm/lockfile) / [install](https://bun.com/docs/pm/cli/install) | 当前文本lock为 `bun.lock`；`bun ci`等价frozen install；dependency lifecycle需可信owner | 后续迁移不得长期保留 `yarn.lock`双真值，也不得用ignore scripts制造成功。 |
| [Bun Docker guide](https://bun.com/docs/guides/ecosystem/docker) | 提供通用Bun image与lock layering示例 | 不能替代现有Admin Docker真实frozen install/build。 |

BrowserAct core指南已按要求完整加载；本机未配置其可选API key，官方状态改由只读官方GitHub/API/raw/docs审计。主worker的额外匿名REST/HTML交叉检查随后遇到GitHub rate limit与网络连接失败，因此没有把失败请求当作新证据，也没有使用账号或token绕过。

## 隔离方法

- 任务专属临时根为仓库外短路径；三个主样本从固定HEAD的 `git archive HEAD:web-admin`独立解出，严格串行运行。
- 每轮初始均无 `node_modules`/`bun.lock`，拥有自己的空lock-generation cache、空frozen-install cache和日志目录。
- 临时 `package.json`只做两项必要调整：把Yarn-only `preinstall`改为Bun guard；增加 `trustedDependencies=["husky"]`。dependency/devDependency、`resolutions`、scripts、源码和tracked `yarn.lock`保持不变。
- 每轮先执行 `bun install --lockfile-only`；确认没有生成 `node_modules`后切换到另一空cache，执行 `bun install --frozen-lockfile --backend=hardlink`。未使用 `--ignore-scripts`、copyfile workaround、单lifecycle并发、手工补包、Yarn `node_modules`或共享Bun cache。
- 完整性检查覆盖React/ReactDOM、Jest、Vite、RTL/DOM、`@playwright/test`/Playwright/Core、`rc-virtual-list`、Rolldown/Lightning CSS Windows binding和Playwright CLI shim。
- raw日志仅保存在任务临时根，矩阵只记录计数、公开package名、hash与耗时；不读取或写入registry credential、token、Cookie、账号密码或完整私有endpoint。

首次非矩阵试跑的安装已结束，但汇总harness因PowerShell method参数与format operator优先级丢失exit/耗时对象。最小复现确认根因后只给format表达式加括号并验证；旧目录不计入样本。逻辑主样本1在新的独立物理目录重新执行，保证三轮矩阵都有完整计量证据。该harness问题没有触碰tracked workspace，也没有被包装为Bun失败。

## 三个主样本矩阵

三轮lock阶段均生成同一 `bun.lock`：SHA-256 `9C6214576552038E297F81895508910D13871247034F986F5AB0D7944BBA9CEF`，370549 bytes，1486 entries，package-key集合hash `5112A43B6B1E7C479F815A56B6AA95F46208166408E737662098EF44CBC8EEBC`。

| 样本 | Lock generation | Frozen lifecycle install | 残缺tree | Direct / 关键缺失 | 有效 |
| --- | --- | --- | --- | --- | --- |
| `m1` | 8.050s，exit 0 | 150.520s，exit 1；98条ENOENT；168次cache移动失败 | 38079 files / 262155689 bytes；shape `78BD7890D293EBCC42FA3DC9E88E54AFC0A819B15AE8AA9B8948DBB81A8076A1` | 55/73；缺18个direct；关键缺ReactDOM、RTL、Playwright Core、`rc-virtual-list` | 否 |
| `m2` | 7.135s，exit 0 | 154.766s，exit 1；112条ENOENT；172次cache移动失败 | 47144 files / 349707502 bytes；shape `464CA29517D06148D303A82AAE34346DA5BBD5D489015EEC7F5F7DEB155A3A58` | 60/73；缺13个direct；关键缺`rc-virtual-list` | 否 |
| `m3` | 9.863s，exit 0 | 163.692s，exit 1；76条ENOENT；162次cache移动失败 | 47142 files / 336582908 bytes；shape `9C40ADAB6B2D6A16559B8A0008415CE218ECB45B2373F1FCF2D453DC6F1D247B` | 59/73；缺14个direct；关键缺React、Vite | 否 |

- 3/3 install均在cache移动阶段记录大量失败；脱敏计数没有命中preinstall/postinstall脚本错误，说明没有形成可进入真实lifecycle质量验证的完整tree。
- candidate package、tracked Yarn输入、Bun lock hash/entries/package-key集合全部可复现；tree文件数、逻辑字节、shape和缺失direct/关键包均不一致。结论是“解析lock稳定，但Windows安装tree仍失败且不确定”。
- 失败耗时不是有效安装耗时，严禁与Yarn或历史copyfile样本计算性能收益。不同backend和依赖输入也使历史ENOENT数量不能与本次做因果性能比较。

## API与API式Admin补证矩阵

API三个严格样本使用相同tracked package与原生 `bun.lock`；lock SHA-256三轮均为 `CF75180CFDA6781DFFE00256D342FEC00E182F19947FB4236559854C5DA3C1EC`。每轮均为独立短路径、空 `node_modules`、独立空cache、hardlink frozen。

| API样本 | Frozen install | Tree / direct | 代表性缺失 | 有效 |
| --- | --- | --- | --- | --- |
| `api-s1` | 154.268s，exit 1；16条ENOENT；89次cache移动失败 | 101233 files / 903665324 bytes；64/71 direct | `@vitejs/plugin-react`、`esbuild`、`eslint`、`jsdom`等 | 否 |
| `api-s2` | 188.326s，exit 1；8条ENOENT；77次cache移动失败 | 98488 files / 909628650 bytes；63/71 direct | RTL DOM、`dayjs`、`history`、`react-i18next`等 | 否 |
| `api-s3` | 156.824s，exit 1；17条ENOENT；120次cache移动失败 | 98917 files / 893562949 bytes；60/71 direct | React、RTL、`axios`、`eslint`、`ts-morph`等 | 否 |

- 三轮API tree shape均不同，缺失direct集合也不同；因此API原生lock并未让Bun 1.3.14 Windows空cache frozen在本机达到可重复安装。
- 默认backend + 本机常规cache的API frozen样本在230.715秒后exit 1，失败集中于 `ts-morph`/`@ts-morph/common` cache move；这说明显式hardlink不是唯一触发条件。
- API裸 `bun install`在146.593秒后exit 1，71/71 direct已存在但 `@ts-morph/common`仍未物化；同tree重跑1.509秒后仍因同一项exit 1。该tree的Vite build完成并生成发布产物，说明API核心构建可运行，但不把非零install写成成功。typecheck命中固定源码已有类型错误，未归因于Bun依赖树。
- Admin `linker=hoisted`单变量样本保持相同lock、空cache、hardlink frozen，只增加hoisted linker；156.315秒后exit 1，出现142条ENOENT、61/73 direct且缺Rollup。日志没有原主样本的cache move类别，但大量嵌套 `node_modules`打开失败；因此hoisted只改变失败形态，没有解阻。

Admin API式补证使用与主矩阵相同的 `bun.lock` hash，临时删除Yarn lock、保留Bun guard与Husky trust，采用默认backend/linker/cache且不加frozen：

| 尝试 | 结果 | 完整性 / 质量 |
| --- | --- | --- |
| 第1次裸安装 | 130.362s，exit 1；12条ENOENT | 70/73 direct；缺 `moment`、`less`、`vite`；不能进入质量门禁 |
| 同tree第2次裸安装 | 22.781s，exit 0 | 73/73 direct；React/Vite/Playwright Core/Rollup与Bun `playwright.exe`入口均存在 |

修复tree的验证结果：

| 门禁 | 结果 |
| --- | --- |
| app / build-tooling / E2E typecheck | exit 0；41.196s / 2.583s / 1.585s |
| public scripts check / build / smoke | exit 0；2.432s / 5.918s / smoke通过 |
| Vite production build | exit 0；16.284s |
| 完整Jest | 同一依赖tree先在短路径直解布局通过143 suites/1356 tests；修正为真实repo/web-admin布局后剩余2 suites/15 tests通过，合计145 suites/1371 tests |
| Playwright discovery | exit 0；19 files / 22 tests |
| production lint | 原始 `bun run lint` exit 5且无ESLint诊断；直接执行Bun `eslint.exe` exit 0；只给 `**/*.test.*` glob加引号后 `bun run lint` exit 0 |

这些补证证明API式重试可以产出可用Admin tree，但没有满足主规格的“一次frozen、3/3成功”。重试次数和脚本兼容调整属于未来迁移设计，不回写tracked package/lock。

## 条件门禁与停止点

| 门禁 | 状态 | 说明 |
| --- | --- | --- |
| 三个Bun主样本 | **失败** | 0/3有效，按spec固定 `NO-GO`。 |
| Lock可复现性 | 通过但不足以放行 | 三轮lock完全一致；依赖tree仍全部失败且不一致。 |
| 关键manifest/入口/CLI | **失败** | 每轮都有direct与关键项缺失；Bun CLI以 `.exe`/`.bunx`检查，不再错误要求Yarn `.cmd`。 |
| Yarn cold controls / 20%收益 | 未执行 | 只在Bun 3/3有效后运行；失败样本不得用于性能结论。 |
| 完整Jest 145/1371 | 主矩阵未执行；补证通过 | 未在3棵残缺主tree上运行；API式同tree重试补齐后仍使用Jest并通过145/1371，未改用 `bun test`。 |
| TypeScript/lint/public scripts | 补证部分通过 | 三类typecheck与public scripts通过；原lint脚本需最小glob quoting后才通过，形成迁移写集。 |
| Vite build / 10%回退 | 补证build通过；性能未裁决 | 修复tree build exit 0；没有3/3有效Bun与Yarn controls，不能计算10%/20%收益。 |
| Playwright discovery / E2E | 补证discovery通过 | 19/22 discovery通过；未运行破坏性E2E，未触碰60或共享数据库。 |
| Docker build | 未执行 | 安装前置已失败且本机无Docker CLI；静态官方示例不计通过。 |
| CI/action/Makefile/local-dev迁移 | 只读审计 | 已明确未来单Bun lock、显式质量/E2E和调用方切换边界；本change不修改。 |
| Changed implementation coverage | N/A | 最终仅OpenSpec评估文档，无production implementation、配置或测试改动。 |
| 代码注释门槛 | N/A | 无源码、脚本、workflow或配置实施diff。 |

## OpenSpec与文档门禁

- Pre-implementation review：`READY`；修复了Docker或必要证据不可取得时结论歧义，明确本轮采用决策必须为 `NO-GO`。
- `openspec validate reevaluate-web-admin-bun-package-manager-after-web3-retirement --strict`：通过。
- `openspec validate --changes --strict`：归档前1/1通过；归档后active changes为空且无待校验项。
- `openspec validate --specs --strict`：48/48主规格通过。
- `git diff --check`：通过。
- proposal、design、spec、tasks与verification以简体中文说明为主；保留的英文为OpenSpec固定标题、命令、package名、hash字段和标准技术术语。
- 文档只包含公开官方URL、公开package名、版本、hash、计数与脱敏环境类别；不包含真实账号、registry credential、token、Cookie、私有URL或raw日志。

## 清理与RC状态

- 初版3个Admin主样本与harness-invalid root，以及补证使用的3个API严格样本、API默认frozen/裸安装tree、Admin API式安装tree、hoisted单变量tree和两个repo-layout验证root，均在核对绝对路径与junction target后整棵删除。全部cache、`node_modules`、候选lock、raw日志、build产物和临时junction均不存在。
- BrowserAct生成的core指南临时文件已核对父目录等于系统temp后单文件删除；没有修改或清理其它浏览器session/profile。
- tracked workspace未生成build、coverage、Playwright report、browser binary或临时数据库；Bun残留进程为0。
- change已归档到 `openspec/changes/archive/2026-07-16-reevaluate-web-admin-bun-package-manager-after-web3-retirement`，active changes为空。
- 归档已使用 `--skip-specs`；归档前后 `openspec/specs` tree无diff，目标 `web-admin-bun-package-manager-reevaluation` 主规格仍不存在，未把 `NO-GO`评估同步成“已采用Bun”的活动契约。
- 最终收敛前已rebase到最新base；上游唯一新增提交只调整 `.gitattributes`中的Go源码LF规则，不触及 `web-admin`、package/lock、CI、Docker、OpenSpec语义或本次样本输入，因此三轮证据可继续适用，无需重跑安装矩阵。

## Remaining Risk

- 本次能证明“依赖树显著缩小后，Bun 1.3.14 Windows frozen lifecycle install仍在cache移动/缺文件层失败”，但不能在不修改Bun或运行未发布构建的前提下唯一定位tar extraction、cache移动、Windows过滤器、hardlink或其组合根因。
- #32458与#33113在访问日仍未形成stable修复。官方状态未来可能变化；只有新stable明确发布相关修复，或依赖树再次由独立合法change实质变化时，才值得另立评估。
- 三个一次frozen主样本没有有效tree，因此没有可用于Yarn性能/20%收益或Docker采用门禁的主样本；API式重试tree虽补充了Jest、Vite和Playwright discovery证据，也不能替代一次frozen可复现性与性能证据。
- 本机Docker不可用本可阻断GO成功路径，但本次已更早被3/3安装失败裁决；不能反向把Docker静态审计写成通过。
- Web3退役和Cypress迁出减少了依赖规模，但本次没有对Bun内部阶段做可控单变量实验，不能唯一声称它们改善或恶化了某个失败计数。
- API原生lock的Windows严格样本同样0/3，说明问题不只来自Yarn导入lock；但API依赖树、Bun历史版本、Linux CI/Docker与本机已有tree经历不同，证据不足以把两项目失败唯一归因到同一个Bun内部缺陷。
- Admin同tree第二次裸安装能够修复并通过完整质量门禁，但尚未验证“同一workspace有界frozen重试”在3个Windows新clone与Linux CI/Docker都稳定成功。未来若产品接受重试，应将最大次数、每次完整性检查、耗尽失败和缓存策略作为显式契约，而不是依赖人工多跑一次。
- 原始lint脚本的未引用glob在Bun shell下exit 5，加引号后通过；这属于可修的迁移兼容面，但当前纯评估change不修改tracked package，也不能把临时修正写成已交付。

## Pre-archive review

- 状态：`READY`；API补证后的复审范围内未发现阻断问题。已纠正 `playwright.cmd`检查器错误、未经证实的symlink/跨盘/单包归因，以及“严格冷样本失败等于API不可运行”的证据层级错误；主结论仍由3/3一次frozen失败支持。
- Artifacts：proposal、design、spec、tasks和verification描述同一个纯评估结果；API对照、hoisted单变量、同tree重试、lint glob兼容与清理均有脱敏证据。归档已使用 `--skip-specs`且主规格tree无变化。
- Coverage：N/A。最终range diff只有当前OpenSpec的6个文档/artifact文件，没有production implementation、package metadata、lock、config、workflow、脚本或测试改动；不运行业务覆盖率制造形式门槛。
- 注释review：N/A。没有新增或修改public函数、关键私有逻辑、模型字段、脚本或配置surface；评估方法与非显然边界已在中文design/verification中说明。
- 文档语言：新增自然语言以简体中文为主；保留的 `Requirement`、`Scenario`、`SHALL/MUST`、package名、命令、hash和GO/NO-GO属于OpenSpec结构或标准技术术语。
- 运行态口径：结论分别说明一次frozen主矩阵、API式重试tree与质量门禁；没有把修复tree的Jest/Vite/Playwright discovery夸大为一次冷安装、性能、Docker或完整E2E通过。
- 脱敏：文档只含公开官方URL、公开package名、版本、hash、计数和环境类别；不含registry地址、账号、token、Cookie、DSN、私有URL或raw日志。
- 交付单元：archive后仍须对齐最新 `origin/hfl-test-base`并收敛为base + 1 logical commit；最终closeout只允许普通非强制push base，不push/merge test。
