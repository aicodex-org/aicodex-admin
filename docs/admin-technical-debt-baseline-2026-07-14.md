# Admin 技术债基线（2026-07-14）

## 文档定位

本文记录 `aicodex-admin` 当前技术债审计结论，用于后续选择 OpenSpec change 和安排实施顺序。

- 本文是日期化审计快照，不是正在实施的规格，也不授权直接修改代码。
- 审计时唯一 active change 是 `stabilize-web-admin-test-baseline-and-ci-gates`，当时由独立任务实施。
- 本文不接管、不扩展该 change 的写集，也没有把其审计时的进行中 diff 计入存量技术债。
- 排序优先对齐审计时的产品 P0：Connection Profile / Provider 认证与交接、Admin copy-safe handoff、Insight manual/secretRef binding、Provider Doctor、Profile 启用/回滚及 60 运行态验收。

## 状态更新（2026-07-15）

- `stabilize-web-admin-test-baseline-and-ci-gates` 已归档，并以单个 change commit `5acc2f52` 合入 `hfl-test-base`；本文涉及的前端 CI 写集冲突前置条件已经解除。
- `enable-incremental-go-correctness-gates` 已归档并合入，commit 为 `e3478d8d`。
- `migrate-web-admin-build-toolchain-to-vite` 已归档并合入，commit 为 `3f6c4871`。
- `stabilize-admin-go-test-baseline-and-fixtures` 已归档并合入，commit 为 `fdd7cef0`。
- `decouple-web-admin-jest-from-react-scripts` 当前正在独立 change 中实施。
- `establish-aicodex-owned-schema-migration-baseline` 当前正在独立 RC worktree 中实施。
- `migrate-web-admin-package-manager-to-bun` 已完成 `EVALUATE_AFTER_JEST` 评估，结论为 `NO-GO`：两次隔离 Bun frozen lifecycle install 均因依赖链接缺失而失败，同环境 Yarn frozen control 成功，因此没有有效 Bun 冷安装样本可计算 20% 收益阈值；当前继续保留 Yarn、`yarn.lock` 和既有工具链调用方。
- 本文中的文件数、调用次数、suite 数量和工具输出均为 2026-07-14 审计快照；正式创建后续 proposal 前必须基于最新基线重新验证。
- 当前正文继续保留审计时上下文，避免把历史证据改写成实时状态；本节只记录已经确认的后续状态变化。

## 结论摘要

TypeScript 增量迁移已经进入稳态，当前更适合解决的技术债主要位于 Go correctness、Go 测试隔离、数据库 schema 演进、P0 runtime config owner，以及前端构建工具从 CRA/CRACO 向 Vite 渐进迁移等方向。

| 顺序 | 候选方向 | 决策 | 规模判断 | 并发建议 |
|---|---|---|---|---|
| 1 | 增量启用 Go correctness gate | `GO` | 小 | 可独立实施 |
| 2 | P0 runtime config owner/resolution 收口 | `GO` | 中 | 可独立实施 |
| 3 | Go 测试隔离与 fixture 基线 | `GO` | 中 | 前端 CI change 已收口；立项前复核 workflow 写集 |
| 4 | AICodex 自有表版本化迁移基线 | `GO`，先做窄范围设计 | 中到大 | 不与 Go fixture 改造同时实施 |
| 5 | CRA/CRACO dev/build 渐进迁移到 Vite | `GO_AFTER_BASELINE` | 中 | 前置基线已完成，可独立评估 |
| 6 | 后台任务 lifecycle/graceful shutdown | `DEFER` | 中 | 审计时不是 P0 blocker |

## 审计时正在实施的质量基线

`stabilize-web-admin-test-baseline-and-ci-gates` 在审计时已有完整 proposal、design、spec 和 tasks，范围包括：

- 修复当前 6 个失败 Jest suite、9 个失败测试；
- 增加稳定的 `yarn test:ci`；
- 在 CI 中执行 TypeScript typecheck、增量 TS gate 和全量 Jest；
- 保持生产页面、路由、权限和后端接口行为不变。

该 change 明确不处理：

- Go 测试和 Go correctness lint；
- 数据库 fixture 和 schema migration；
- React、Testing Library、CRACO、React Router 等依赖升级；
- 后端生产架构。

因此，下述后端候选不是对该 change 的重复建设。

## GO-1：增量启用 Go correctness gate

### 现状证据

- `.golangci.yml` 设置 `linters.default: none`，仅启用 `gofumpt` formatter。
- `.github/workflows/build.yml` 中的 `Go-Linter` job 已运行 golangci-lint，但当前只形成格式化门禁。
- `go vet ./...` 当前稳定只有两个基线错误：
  - `admin/storage/casdoor.go`：外部 `casdoor.Config` 使用 unkeyed struct literal；
  - `admin/service/proxy.go`：`panic(err)` 后存在 unreachable `return`。

### 建议 change

`enable-incremental-go-correctness-gates`

### 建议范围

- 修复上述两个确定性问题；
- 在 `.golangci.yml` 中增量启用 `govet`；
- 复用现有 CI linter job；审计时不修改前端 change 正在调整的 workflow；
- 暂不一次性启用 `errcheck`、`staticcheck` 等所有规则。

### 验收标准

- `go vet ./...` 通过；
- `golangci-lint` 使用仓库配置执行通过；
- 不新增大面积排除规则；
- 不改变业务接口和运行时行为。

## GO-2：P0 runtime config owner/resolution 收口

### 现状证据

- Admin 中约 44 个 Go 文件直接调用 `conf.GetConfig*`。
- `admin/conf/conf.go` 通过裸字符串 key 读取环境变量或 Beego 配置，缺少统一的 owner、默认值、必填/互斥校验、敏感级别和启动诊断。
- `admin/controllers/insight_usage_identity_resolver.go` 已有 typed request/response、超时、有限重试和脱敏审计，但配置决策仍分散：
  - saved runtime policy 决定是否允许 legacy；
  - endpoint/token 仍从 legacy `conf` 读取；
  - caller、timeout、maxItems 分别进行二次解析。
- `ServiceCredentialGovernanceConfig` 保存的是 copy-safe metadata，不应保存真实 credential material。

### 建议 change

`consolidate-insight-runtime-config-resolution`

### 建议范围

- 只覆盖当前 P0 的 usage identity resolver、provider trust、Gateway projection 等 runtime 配置；
- 建立 typed runtime config resolver，统一解析 source、owner、policy 和阻塞原因；
- 保持真实 token 位于环境或 secret provider；
- Admin API、状态页和日志只暴露 copy-safe reference、来源和诊断，不回显 credential material；
- 不借机建设全仓配置中心或 Admin secret 管理系统。

### 验收标准

- 每组 P0 runtime 配置只有一个解析入口；
- missing、invalid、saved config unavailable、legacy disabled 等状态有稳定错误码或 blocker；
- endpoint/token 不进入 UI response、普通日志和审计日志；
- manual/secretRef/legacy 的优先级和 fail-closed 行为有自动化测试；
- Provider Doctor 能解释实际采用的配置来源，但不泄露敏感值。

## GO-3：Go 测试隔离与 fixture 基线

### 现状证据

当前 Go 全量测试基线包含多类不同问题：

- OIDC discovery 测试存在陈旧行为断言；
- `admin/i18n/deduplicate_test.go` 将不同 namespace 中的同名 key 也判定为重复，门禁语义与当前 i18n 组织方式存在冲突；
- SQLite fixture 缺少近期新增表，已经出现 `wecom_department_mapping` 不存在；
- 部分测试依赖本机或 CI MySQL；
- token key 测试会将生成的证书写入仓库路径，测试运行后可能产生 tracked diff。

### 建议 change

`stabilize-admin-go-test-baseline-and-fixtures`

### 建议范围

- 区分 hermetic unit test 与 MySQL/integration test；
- 明确本地和 CI 的测试入口、build tags 及环境前置条件；
- 所有测试产物写入 `t.TempDir()`；
- 抽取 AICodex-owned schema registry，供生产 schema bootstrap 和 SQLite fixture 复用；
- 修复陈旧断言和错误门禁语义，不通过永久 skip 制造绿灯。

### 验收标准

- hermetic Go 测试可在无本机 MySQL 时确定性执行；
- integration 测试通过明确命令运行，并能识别缺失环境；
- 测试执行前后 `git status` 不新增变化；
- SQLite fixture 与生产注册的 AICodex-owned 表集合一致；
- CI 记录 unit/integration 两类结果，不把环境失败伪装成业务回归。

### 并发约束

该 change 最终可能修改 `.github/workflows/build.yml`。审计时要求等待前端 CI change 完成后再实施；该前置条件现已解除，但正式立项前仍需确认最新 workflow 写集没有并行冲突。

## GO-4：AICodex 自有表版本化迁移基线

### 现状证据

- `admin/object/ormer.go` 在应用启动时执行 `CreateTables()`。
- `createTable()` 当前包含约 77 次 `xorm.Engine.Sync2(...)`，失败直接 panic。
- 未发现独立的 schema version 或 versioned migration 目录。
- Admin 同时支持 MySQL、PostgreSQL、MSSQL 和 SQLite。
- 近期 secure handoff、Gateway projection、service credential governance、企业组织同步等能力持续追加新表，schema 变更速度较高。
- schema 注册、应用启动和测试 fixture 目前没有稳定的单一真值来源。

### 建议 change

`establish-aicodex-owned-schema-migration-baseline`

### 建议范围

第一阶段只治理近期 AICodex-owned 表，不一次替换全部 legacy Casdoor `Sync2`：

- 建立有顺序、不可变的 migration registry 和 schema version；
- 让生产启动和测试 fixture 复用同一 AICodex schema 注册入口；
- 为新 migration 提供重复执行保护和明确失败诊断；
- legacy 表暂时继续使用现有 `Sync2`，避免一次性迁移多数据库历史结构。

### 验收标准

- 已应用 migration 不重复执行；
- 新环境可从空库迁移到目标版本；
- 至少覆盖 SQLite 和实际主部署数据库方言的验证；
- schema 版本不兼容时启动失败并输出可操作诊断；
- fixture 不再手工维护另一份表清单；
- migration 文件不可在合入后静默改写。

## GO_AFTER_BASELINE：CRA/CRACO dev/build 渐进迁移到 Vite

### 决策

该方向值得实施，但审计时不应与 `stabilize-web-admin-test-baseline-and-ci-gates` 并行。当时该 change 正在修改 `web-admin/package.json`、`.github/workflows/build.yml`、Jest suite 和 CI 测试入口，与 Vite migration 的核心写集完全重叠。该前置冲突现已解除，Vite 迁移仍应作为独立 change 重新评估。

正确边界是先迁移应用 dev/build，再单独让测试运行器脱离 React Scripts。不要在一个 change 中同时迁移 Vite、Vitest、React Router、Testing Library 和 class component。

### 现状证据

- `web-admin/package.json` 当前使用 `react-scripts 5.0.1`、`@craco/craco 6.4.5` 和 `craco-less 2.0.0`；
- `web-admin/craco.config.js` 已承载 dev proxy、Less variables、Webpack resolve fallback、runtime overlay、开发入口注入和 `build-temp` 输出路径改写；
- `web-admin/src` 没有 `require.context` 和自定义 SVG/file loader 链，Less 定制也较简单，应用构建本身具备迁移条件；
- 审计时约有 136 个 Jest 测试文件，其中约 72 个文件使用 `jest.mock`，测试仍依赖 `craco test`/React Scripts 的 transform、jsdom 和默认配置；
- `web-admin/src/Setting.tsx` 使用动态 CommonJS `require("i18n-iso-countries/langs/" + language + ".json")`，需要在 Vite 下改成可静态分析的显式映射或受控 glob；
- `Conf.ts`、`ManagementPage.tsx`、`serviceWorker.ts` 和 `public/index.html` 仍使用 `process.env.PUBLIC_URL`、`process.env.NODE_ENV` 或 `%PUBLIC_URL%`；
- `local-dev/start-frontend-remote-backend.ps1` 会直接查找 `craco.cmd`，并通过 `craco start` 判断进程归属；
- Docker 当前从 `/web-admin/build` 复制静态产物，Vite 切换后必须保持该交付路径；
- 现有 Browserslist/TS 配置仍声明 ES5/IE 兼容，而 React 18 已不再支持 IE，迁移前需要明确真实浏览器支持基线。

### 迁移原则

- Vite migration 的目标首先是降低构建工具维护成本、缩短开发反馈链路，不把“自然减少生产 bundle”作为未经验证的收益；
- 保持路由、权限、认证回调、public auth scripts、后端契约和用户可见行为不变；
- 保持开发端口 `7002`、后端代理目标配置方式和 `web-admin/build` 交付目录；
- 保持现有 Jest 绿基线，不在 dev/build migration 中批量改写 136 个测试文件；
- CRA production build 隐式执行的 lint 能力必须改为显式、非修改式 CI gate，不能在切换 Vite 后静默丢失；
- Web3、MetaMask、Web3 Onboard、Buffer 和其它 CommonJS 依赖必须通过真实 production build 与安全 smoke 验证，不能只验证首页启动；
- 不把 React Router、Testing Library、React 版本或 class-to-hooks 重构混入构建工具迁移。

### 建议 Change A：迁移 dev/build

建议名称：

`migrate-web-admin-build-toolchain-to-vite`

建议范围：

- 增加 typed `vite.config.ts`，迁移 CRACO 中的 dev proxy、Less、overlay/preflight 和构建输出约定；
- 将 CRA 环境变量收口到 typed build/runtime env adapter，避免在业务文件中散落 `import.meta.env`；
- 将动态国家语言包加载改成 Vite 可静态分析的显式映射或受控 glob；
- 迁移 `public/index.html` 和 public asset base path；
- 保持 `public-scripts:build`、`public-scripts:smoke` 和 auth callback 脚本行为；
- 先增加并行的 Vite start/build 验证入口，对照 CRACO 产物和运行行为，再切换默认 `start`/`build`；
- 同步 Docker、local-dev 脚本、新人文档和 CI，但不修改业务页面。

### 建议 Change B：测试运行器脱离 React Scripts

建议名称：

`decouple-web-admin-jest-from-react-scripts`

建议先为现有 Jest 建立显式 transform、jsdom、setup、module mapping 和 coverage 配置，再移除 React Scripts 的测试依赖。不要默认把 Jest → Vitest 与 Vite dev/build 切换合并；是否迁移 Vitest 应在 Jest 解耦后根据实际收益单独评估。

### 验收标准

- `yarn start` 仍监听 `7002`，所有 `/api`、`/swagger`、`/files`、OIDC discovery、CAS 和 `/scim` proxy path 行为一致；
- `yarn build` 输出到 `web-admin/build`，Docker 和静态部署路径保持兼容；
- `yarn typecheck`、增量 TypeScript gate、现有全量 Jest、public scripts check/build/smoke 和显式 lint gate 通过；
- CRA 与 Vite production build 的入口、静态资源 base path、懒加载 chunk 和主要 bundle size 有对照记录，Vite 产物不出现无依据的明显回退；
- Admin 首页、登录壳、页面刷新、OIDC/CAS callback 路由、Provider/Web3 懒加载完成浏览器 smoke；
- build warning、Node polyfill 和 CommonJS compatibility 问题有明确处置，不通过全局兼容插件无边界兜底；
- 完成 dev/build 切换前保留可回退的 CRACO build 证据，切换后不长期维护两个默认生产构建入口。

## 后续候选：Yarn 到 Bun package manager

### 决策

- 建议 change 名称：`migrate-web-admin-package-manager-to-bun`。
- 当前决策：`EVALUATE_AFTER_JEST`。必须等 `decouple-web-admin-jest-from-react-scripts` 收口后再立项；Bun 目前只是待评估候选，不是已批准必做项。
- 当前环境具备 Bun 验证条件，但不把本地瞬时版本写成长期团队强制值；正式 proposal 再根据兼容性和可复现性 pin 版本。

### 当前绑定与预期收益

- `yarn.lock` 是当前唯一依赖真值，`preinstall` 会拒绝非 Yarn 安装；CI、Docker、Makefile、local-dev、README 和 `FrontendCiGates` tests 均绑定 Yarn。
- 预期收益主要来自冷安装、缓存安装和脚本启动。Vite 已改善 dev/build；在保留 Jest 的前提下，完整测试耗时不会仅因更换 package manager 而大幅下降。

### 范围与明确拒绝项

- 只迁移 package manager、lockfile、依赖安装和 script orchestration，保持 Vite + Jest。
- 不同时迁移 `bun test`、React、React Router、Testing Library 或业务代码。
- 迁移成功后只保留 Bun lockfile，不长期维护 `yarn.lock` 与 Bun lockfile 双真值。
- **REJECT**：把 Bun package manager 迁移和 Jest → `bun test` 混成一个 change。

### 分阶段评估与切换

1. 先完成基准与兼容性评估，记录 Yarn/Bun 冷安装、缓存安装、完整 Jest、Vite build 和 Docker build；proposal 必须设置可量化的 go/no-go threshold。
2. 达到门槛后，再切换 CI、Docker、Makefile、local-dev 和文档，并验证所有对外脚本入口保持兼容。
3. 最后清理 Yarn guard。切换前保留可回退证据，切换后不长期双跑 Yarn/Bun。

建议阈值如下，正式 proposal 可以在提供证据后调整，但不能取消量化门槛：

- 依赖安装或 CI dependency 阶段应有明确收益，建议至少提升 20%；
- 完整 Jest 和 Vite build 不应出现超过 10% 的无依据回退。

### 验收要求

- Bun frozen lock 安装可复现，且依赖解析结果经过审计；
- 完整 Jest discovery 数量和通过数与切换前一致；
- typecheck、lint、public scripts、Vite build、Docker build、local-dev 和浏览器 smoke 通过；
- 记录依赖解析差异，以及 Web3、Cypress、native dependency、postinstall 的兼容性与处置风险。

## DEFER：存在债务，但当前不应抢占 P0

### 后台任务 lifecycle 与 graceful shutdown

`admin/main.go` 在单一 `main()` 中完成配置、路由、数据库、默认对象、日志、多个 goroutine/worker 和 HTTP 服务启动。当前没有统一的 signal/context/shutdown 编排。

Gateway refresh、webhook 和组织同步 scheduler 已有部分 Stop/context 能力，因此后续应优先补顶层 lifecycle，而不是重写所有 worker。当前尚未形成 P0 运行态 blocker，暂缓。

### API response/error contract 全仓迁移

- controller 中约有 1,203 次 `ResponseError`；
- 显式设置 HTTP status 的调用约 13 次；
- legacy 客户端普遍依赖 `{status, msg, data}` envelope；
- P0 provider 已局部使用 typed error、traceId 和 HTTP status。

建议只要求新接口和 P0 接口使用窄 typed contract，并补 contract test；不发起全仓响应格式迁移。

### 前端非 TypeScript 架构债

- `web-admin/src` 约有 505 个 TS/TSX 文件，仍存在约 170 个 class component 匹配；
- `web-admin/src/Setting.tsx` 超过 2,000 行，导出约 149 个符号；
- backend 中约有 276 处重复的 `res.json()`；
- `web-admin/src/backend/FetchFilter.tsx` 通过覆盖 `window.fetch` 注入全局行为；
- React 18 与较旧的 Testing Library React、React Router 5、CRA 5、CRACO 6 并存。

其中 CRA/CRACO → Vite 已单独列为 `GO_AFTER_BASELINE`。其余 class component、`Setting.tsx`、请求层、React Router 和 Testing Library 债务仍应按单一业务域渐进治理，不与 Vite change 混合。

### HTTP client 策略

外部 HTTP 调用分散在约 71 个文件，存在多处 `http.DefaultClient` 和少量显式 `InsecureSkipVerify: true`。本次不是安全审计，不能直接将其定性为漏洞。后续只按 provider、组织同步或 Gateway 等业务域收口 timeout、transport、TLS policy 和测试注入。

### OpenSpec 主规格体积

当前约有 34 个主规格、8,555 行和 257 个 archive；部分主规格超过 1,000 行。其主要问题是检索、review 和冲突成本，尚未形成运行态 blocker。后续可在新增 change 时改善 capability 边界，不建议仅为降低行数重写历史规格。

## REJECT_FILLER：当前不建议立项

以下方向存在局部合理性，但当前影响面远大于产品收益：

- 全仓 controller → service layer 重写；
- 全量 class component → hooks；
- Vite、Vitest、React、Router、Testing Library 和 class-to-hooks 一次性迁移；
- 全仓统一 HTTP client；
- 全仓“消灭 panic”；
- 为压缩文档体积大规模拆写历史 OpenSpec。

若未来实施，只能从明确业务域和可验收问题切入，不能以文件行数、class 数量或 TODO 数量作为独立立项依据。

## 推荐实施顺序

1. `[已完成]` 完成并归档 `stabilize-web-admin-test-baseline-and-ci-gates`。
2. `[已完成]` 完成并归档 `enable-incremental-go-correctness-gates`。
3. 围绕当前 P0 推进 `consolidate-insight-runtime-config-resolution`。
4. `[已完成]` 完成并归档 `stabilize-admin-go-test-baseline-and-fixtures`。
5. `establish-aicodex-owned-schema-migration-baseline` 已进入独立 RC worktree 实施，继续按其独立边界收口。
6. `[已完成]` 完成并归档 `migrate-web-admin-build-toolchain-to-vite`；当前继续独立实施 `decouple-web-admin-jest-from-react-scripts`。
7. `[已完成评估，NO-GO]` `migrate-web-admin-package-manager-to-bun` 未通过 frozen lifecycle 兼容门禁，性能收益阈值不可计算；保持 Yarn 单一真值，未来仅在 Bun linker 或依赖树发生独立、可证明变化后重新立项评估。
8. 重新根据 60 运行态证据判断 lifecycle、API contract、React Router/Testing Library 升级和其它前端架构债是否进入下一阶段。

## 本次审计验证记录

本次为只读代码与仓库结构审计，没有运行真实认证链路、生产配置或破坏性数据库操作。

已执行的关键检查包括：

- `go vet ./...`：失败，确认两个稳定基线错误；
- `rg` 量化 `Sync2`、配置读取、controller response、HTTP client 和前端请求模式；
- 检查 `.golangci.yml`、`.github/workflows/build.yml`、`admin/main.go`、`admin/object/ormer.go`；
- 检查审计时 active OpenSpec change 的 proposal、design、spec 和 tasks；
- 检查工作区状态，区分当前实施任务的 diff 与本次审计结论。

本文只新增审计文档，未修改业务代码、测试、CI 或 active change artifacts。
