## Context

当前 Admin E2E 由 Cypress 12.15.0 驱动：19 个 `*.cy.ts` 文件包含 22 个测试，0 个 skip/only，全部把 `http://localhost:7001` 写死在 spec、support 或 config 中；Vite、标准 local-dev 与 CI `wait-on` 的实际端口已经是 `7002`。CI 通过 `cypress-io/github-action@v5` 隐式执行 Cypress，但没有项目自有 E2E script，且 E2E MySQL service 创建 `casdoor`、Admin 默认配置连接 `aicodex_admin`，后端 readiness 可能在浏览器启动前就失效。

现有 22 个测试中，4 个覆盖 API/UI 登录成功和失败，18 个通过真实 UI 登录进入管理路由。Adapter、Payment、Product、Token、Webhook 共 5 个测试点击新增后会真实持久化随机记录；Syncer 新增只产生客户端草稿导航。旧套件没有清理钩子、表单编辑/保存断言或空态断言，错误态只覆盖登录失败。迁移必须如实保留这些行为和限制，不能通过 mock、skip、删测或把 URL 断言合并掉制造等价。

Cypress 15 + Bun 已有独立 NO-GO 证据：Cypress lifecycle 的 `bluebird` 是一个阻断，但 Web3 依赖树仍有独立问题。本 change 只选择 E2E runner，不改变 Yarn 单真值、Bun 决策或 Web3 依赖。API 仓库的 Playwright 配置只作为 `baseURL + webServer + failure artifact` 参考；其 Bun、5173、重复认证和 CI 未执行 E2E 的缺口不复制。

## Goals / Non-Goals

**Goals:**

- 使用 `@playwright/test`、typed config 和项目自有 scripts 等价迁移 19 个 spec / 22 个测试。
- 将 E2E、Vite webServer 和 CI 统一到 `7002`，同时允许通过 `AICODEX_ADMIN_E2E_BASE_URL` 覆盖公开本机地址。
- 保留逐测试独立 UI 登录、API/UI 登录成功/失败、路由访问、新增导航和原有 URL 断言；新增页面加载信号时不得替换既有断言。
- 只在一次性数据库中运行真实读取和 5 条写入测试，完成后销毁整库、session、报告和浏览器进程。
- 让 GitHub Actions 显式安装 Chromium、运行 22 个测试，并只在失败时保留有限、可审计的 trace/screenshot/report。
- 删除 Cypress package、action、config、support、spec 和 lock 路径，确认 `bluebird` 不再由 Cypress 引入。

**Non-Goals:**

- 不新增编辑/保存、删除、空态或更多业务场景；它们不是现有 22 个测试的迁移等价范围。
- 不在 60、共享数据库、生产或类生产环境运行 5 条写入测试，不使用真实账号、token、Cookie、私有 URL 或 credential。
- 不迁移 Bun/Vitest，不升级 React、Router、Jest、Vite，不删除或重构 Web3。
- 不修改 Admin Go runtime、fixture/schema registry、Provider/Insight contract、认证协议或生产业务源码。
- 不顺手修改 public auth、`Setting.tsx` 或 Go 中现存的 localhost `7001` fallback；它们属于生产/认证运行语义，不是 Cypress→Playwright 的端口边界。

## Decisions

### 1. 单一 Playwright config 与独立 TypeScript 边界

新增 `web-admin/playwright.config.ts`，集中定义 `testDir`、`baseURL`、Vite `webServer`、Chromium project、retries、workers、reporter 和工件目录。`baseURL` 默认为 `http://127.0.0.1:7002`，`AICODEX_ADMIN_E2E_BASE_URL` 只允许在 `localhost/127.0.0.1:7002` 间覆盖；Vite webServer 强制把 proxy 指向 `http://127.0.0.1:8000`，不继承可能指向 60/共享后台的 ambient proxy target，并在本地与 CI 都禁止复用既有 dev server，防止既有 7002 进程绕过 proxy 边界。spec 全部使用相对路径，避免再次散落端口或私有环境。

新增 `web-admin/playwright/tsconfig.json` 覆盖 config、fixtures、helpers 和 19 个 `*.spec.ts`，由 `yarn typecheck:e2e` 单独验证；主 `tsconfig.json` 继续只检查 `src`。baseURL 解析与 disposable guard 抽成纯 helper，由 Jest 覆盖合法默认值、loopback 覆盖、私有/远端 URL、错误端口和缺失确认标记。备选方案是把 Playwright 文件加入主 app typecheck，但会混合 Node/test 与浏览器应用类型边界，因此拒绝。

### 2. 保留 19 文件 / 22 测试映射与 per-test UI 登录

每个 Cypress spec 对应一个同基名 Playwright spec，保留历史 `orgnazition` 拼写和原测试标题；`login.spec.ts` 仍包含 4 个测试，其余每个文件各 1 个测试。共享 fixture 在每条受保护路由测试前执行真实 UI 登录并断言根 URL，不使用 worker-scoped `storageState` 静默替代 18 次登录前置。

登录 API 测试使用 Playwright `request.post`，UI 登录测试继续填表并点击；路由测试保留原有精确或包含型 URL 断言。新增按钮仍点击真实 UI，不通过 route mock 替换后端创建。Playwright locator 使用与 Cypress 相同的稳定 ID/CSS 语义；历史冗余的无断言根页访问可以移除，但所有用户行为断言必须逐项保留。

备选方案是把路由表合并成一个 data-driven spec 或复用一次认证状态。它更短，但会改变 spec/discovery 对照与登录隔离，降低迁移审计清晰度，因此拒绝。

### 3. 真实 E2E 只连接可销毁数据库

CI `e2e` job 保留 job-scoped MySQL service，把 `MYSQL_DATABASE` 与 Admin 默认 `dbName=aicodex_admin` 对齐；空库由既有 `object.InitDb()` 生成 built-in organization/admin/application/cert/provider 等确定性 seed，不把部署用的空字段 `init_data.json.template` 误作 fixture。用户名/密码只使用该一次性 built-in 身份的公开测试值，不读取或注入真实 secret。Vite 仍把 `/api` 代理到本机 `8000`。

本地最终验收使用临时目录中的空 SQLite 数据库、同一既有 built-in seed 和本机 `8000/7002`，测试完成后停止进程并删除整个临时目录。5 个写测试和 CI retries 产生的随机记录只存在于该一次性数据库，以整库销毁作为统一清理；不额外增加真实 delete API 或跨测试 mock。

每个 test 执行前都通过共享 fixture 要求 `AICODEX_ADMIN_E2E_DISPOSABLE_DB=1`，缺失或值不匹配立即失败；discovery `--list` 不执行 fixture，因此仍可在无 backend 时完成数量审计。这个显式确认与 loopback baseURL、本机 proxy 三者共同阻止完整 suite 误连共享环境。

Playwright 默认 `fullyParallel=false`、`workers=1`；CI retries 保持 Cypress `runMode=2`，本地 retries 为 0。任何未明确为 disposable 的 backend 都不得运行完整 suite，环境不满足时必须失败或停止，不能自动指向 60/共享地址。

### 4. CI 显式拥有浏览器、执行和诊断

移除 `cypress-io/github-action`，CI 按明确步骤执行 Yarn frozen install、Playwright Chromium 安装、后端启动/readiness、`yarn typecheck:e2e` 和 `yarn test:e2e`。Node 与前端门禁保持 `20.19.0`。Playwright browser cache 使用 OS 与 `yarn.lock` hash，系统依赖仍由安装命令显式补齐。

Playwright 只配置 Chromium，以保持当前 Chrome E2E surface；HTML + line reporter 写入 `web-admin/output/playwright/`，trace 与 screenshot 只在失败/重试时保留，不录制视频。CI 失败工件保留期设为 7 天并使用 `if-no-files-found: ignore`。工件可能包含页面与请求诊断，因此只允许一次性 fixture 数据；verification 只记录数量、状态、相对路径和脱敏错误摘要，不复制 trace、Cookie 或响应体。

备选方案是只在 `frontend-checks` 安装 Playwright、继续依赖隐式第三方 action 或不上传工件。它无法证明 E2E 真执行或提供可审计失败证据，因此拒绝。

### 5. Cypress 一次性删除且不扩大 package migration

通过 Yarn 修改 `package.json`/`yarn.lock`：添加固定范围的 `@playwright/test`，移除 `cypress`。删除 Cypress config、support、19 个 spec、专用 tsconfig 和 GitHub Action；全仓扫描确认 Cypress runtime/config/action 不再存在，`yarn why bluebird` 不再由 Cypress 路径成立。

保持 `preinstall`、`yarn.lock` 和所有 Yarn 调用方，不生成 `bun.lock`，不重解算或主动升级 React、Router、Jest、Vite、Web3。lock diff 只接受 Cypress 移除、Playwright 增加及其直接传递变化。

### 6. TDD 与验证证据分层

先扩展 `FrontendCiGates.test.ts` 并增加 E2E 工具链契约测试，要求 19/22 discovery、7002、scripts、CI 真运行、无 Cypress/skip/only 和失败工件策略；在现状确认 RED 后实施最小迁移。config/helpers 由 `typecheck:e2e`、`playwright test --list` 和完整真实 E2E 直接执行；本 change 不修改 production implementation，因此业务源码 changed-file coverage 记为 N/A，不用全应用 coverage 制造形式门槛。

完整验证仍包含全量 Jest、app/build-tooling/E2E typecheck、增量 TS gate、production lint、public scripts check/build/smoke、Vite build、OpenSpec strict、YAML 静态检查、Playwright discovery/22 tests 与工件清理检查。

## Risks / Trade-offs

- [5 个测试会持久化记录，重试可能重复创建] → 只在 job-scoped MySQL 或本地临时 SQLite 中运行，单 worker，结束时销毁整库；禁止共享环境。
- [Webhook 新增后启用，后续登录可能触发投递] → fixture 仅使用仓库示例数据和一次性数据库，不指向真实 endpoint；suite 不在 60/共享库运行。
- [Playwright trace 可能记录表单值、Cookie 或响应] → 只使用公开的临时 fixture 身份、失败时保留、7 天过期；报告不复制原始工件内容。
- [只断 URL 的历史测试可能漏掉数据加载错误] → 迁移阶段保留所有 URL 断言，可增加低脆弱性的页面加载信号，但不得把不存在的编辑/保存/空态覆盖写成已完成。
- [Playwright browser 下载/cache 在 CI 不稳定] → 锁定依赖解析、缓存 browser binary、每次补系统依赖；安装或 discovery 失败即阻断。
- [CI backend 当前数据库名漂移] → 只调整 job-scoped MySQL 数据库名并强化 readiness，不修改 Go 配置、fixture 或 schema。
- [删除 Cypress 后 Web3/Bun 仍可能存在独立问题] → 只声称 Cypress/Bluebird 路径被移除，不声称 Bun 或 Web3 兼容已解决。

## Migration Plan

1. 固化迁移矩阵、strict validate 并完成 implementation-ready review。
2. 先提交 E2E/CI 契约测试 RED，再引入 Playwright dependency/config/fixtures/helpers 与 19 个 spec，使 discovery 和聚焦契约 GREEN。
3. 删除 Cypress 全路径并更新 CI、scripts、lockfile；在临时 SQLite + Vite 上运行 22 个真实测试，再运行全部前端门禁。
4. 完成 pre-archive review；最终 closeout 前 fetch/rebase 最新 `origin/hfl-test-base`，若 copyfile NO-GO 仅引入无交集文档则复用同一 E2E 运行语义并重跑 final gates，若触及本 change 写集则重新执行完整 E2E。
5. archive 并同步主规格，收敛为 latest base + 1 logical commit，普通非强制 push `HEAD:hfl-test-base`，不 push/merge `test`，最后删除工作分支与测试工件。

回滚方式：在 base 合入前删除工作分支即可；合入后 revert 单个最终 commit 可恢复 Cypress package/config/spec/action。任何真实 E2E 失败先停止浏览器/Vite/backend 并删除本次临时数据库，不对共享环境执行补偿删除。

## Open Questions

无。runner、端口、数据隔离、认证 fixture、CI 执行、工件、重试、测试数量与 package manager 边界均已由任务约束和现有代码基线确定。
