## 1. 基线、设计与实施门禁

- [x] 1.1 读取仓库/前端规则、技术债基线、Cypress/Bun 与 Vite 历史验证、相关主规格、现有 config/support/spec、CI/Docker/local-dev，并确认起始 workspace clean/aligned、active changes 无冲突。
- [x] 1.2 清点 19 个 Cypress spec / 22 个 test 的行为、数据/API 前置、断言、skip/only、7001/7002、写入与清理风险，提交逐测试 `migration-matrix.md`。
- [x] 1.3 创建中文 proposal/design/delta specs/tasks，明确 Yarn、7002、一次性数据库、fixture 身份、失败工件、非目标和 latest-base 单提交 self-closeout 边界。
- [x] 1.4 运行 target/changes strict、`git diff --check` 与 `openspec-pre-implementation-review` 循环，修复全部 Blocking/Fixable 后取得 implementation-ready。

## 2. TDD 建立 Playwright 工具链契约

- [x] 2.1 先扩展/新增 Jest 契约与纯 helper 测试，要求 E2E scripts、typed config、19/22 discovery 对照、loopback 7002、本机 8000 proxy、disposable 标记、0 skip/only、CI 真执行、失败工件、Cypress 删除和 Yarn 单真值，并确认在 Cypress 现状按预期 RED。
- [x] 2.2 使用 Yarn 添加 `@playwright/test`、移除 `cypress`，更新 scripts 与 frozen `yarn.lock`；审计 lock diff 只包含 Cypress 移除和 Playwright 增加的必要变化。
- [x] 2.3 新增 `playwright.config.ts` 和 `playwright/tsconfig.json`，实现 `AICODEX_ADMIN_E2E_BASE_URL`→本机 `7002`、Vite webServer、本地/CI 禁止复用既有 server、Chromium、单 worker、CI retries=2、本地 retries=0、HTML/line reporter 与失败 trace/screenshot。
- [x] 2.4 新增 per-test disposable guard、UI 登录 fixture 与共享 selectors/helpers，拒绝非 loopback/非 7002 baseURL、强制本机 8000 proxy，使用确定性一次性 fixture 身份且不输出 credential；运行聚焦 Jest、E2E typecheck/discovery 使工具链契约 GREEN。

## 3. 逐项迁移 19 个 spec / 22 个测试

- [x] 3.1 迁移 `login` 的 API/UI 成功和失败 4 个测试，保留 response `status` 与成功根路由/失败 `/login` 断言。
- [x] 3.2 迁移 Application、Certs、Models、Orgnazition、Permissions、Providers、Records、Resource、Role、Sessions、Sysinfo、User 12 个只读路由测试，保留历史文件/测试名与所有 URL 断言。
- [x] 3.3 迁移 Adapter、Payments、Products、Tokens、Webhooks 5 个真实创建测试和 Syncers 客户端草稿导航测试，保留按钮与包含型 URL 断言，不新增 route mock 或共享环境写入。
- [x] 3.4 删除 `cypress.config.ts`、`cypress/**` 和 Cypress 专用 TypeScript 配置；验证最终 discovery 为 19 specs / 22 tests、0 skip/only，历史 Cypress 只存在于 OpenSpec/验证材料。

## 4. CI 与一次性运行环境

- [x] 4.1 修改 E2E job，使 job-scoped MySQL 数据库名与 Admin 默认 `aicodex_admin` 对齐，让空库使用既有 built-in seed，并用明确 HTTP readiness 阻止 backend 未就绪时继续。
- [x] 4.2 将 E2E Node/Yarn 安装对齐 `20.19.0 + yarn install --frozen-lockfile`，缓存/安装 Chromium，显式运行 `yarn typecheck:e2e` 与完整 `yarn test:e2e`，保留 `tag-release` 对 E2E job 的依赖。
- [x] 4.3 删除 `cypress-io/github-action` 与 Cypress artifact 上传，改为只在失败时上传 `output/playwright` 中的 report/trace/screenshot，设置 7 天保留和安全的空文件行为。
- [x] 4.4 扩展前端 CI 契约测试并静态校验 workflow/YAML，确认 Docker、Vite、标准 local-dev、远端预览 7003 和 Go/生产运行语义无无关修改。

## 5. 真实 E2E 与完整质量验证

- [x] 5.1 在本地空的临时 SQLite + 既有 built-in seed + 本机 `8000/7002` 上真实运行完整 Playwright suite，确认 19 specs / 22 tests 全部通过且 5 条写入只落临时库；停止进程并删除临时数据库与工件。
- [x] 5.2 运行全量 `yarn test:ci`、`yarn typecheck`、`yarn typecheck:build-tooling`、`yarn typecheck:e2e`、增量 TypeScript gate、production `yarn lint`、public scripts check/build/smoke 与 `yarn build`。
- [x] 5.3 运行 `yarn test:e2e --list`、package/lock/Cypress/Bluebird/7001/7002 全仓审计、OpenSpec target/changes/specs strict、workflow YAML 静态解析、`git diff --check` 和临时产物/进程残留检查。
- [x] 5.4 报告 config/helpers 的直接执行证据与 changed coverage 适用性；不修改 production implementation 时明确记录业务源码 coverage N/A，不以全应用覆盖率伪装迁移质量。

## 6. Pre-archive 与 self-closeout

- [x] 6.1 编写脱敏 `verification.md`，记录迁移矩阵、19/22 discovery/真实执行、CI/browser、完整前端门禁、覆盖适用性、无编辑/保存/空态既有覆盖、清理与 remaining risk。
- [x] 6.2 运行 `openspec-pre-archive-review` 循环到 READY；fetch/rebase 最新 `origin/hfl-test-base`，读取并核对上游 copyfile NO-GO 归档，若 base 触及本 change 写集则重新运行完整 E2E。
- [x] 6.3 archive change 并同步合适主规格，检查 archive/main spec 中文与脱敏语言，重跑 changes/specs strict、diff check、聚焦 Jest/E2E typecheck/discovery 和必要的完整前端 final gates。
- [x] 6.4 收敛为 latest `origin/hfl-test-base` + 1 logical commit，普通非强制 push `HEAD:hfl-test-base`；禁止 push/merge `test`。
- [x] 6.5 删除本地/远端工作分支，固定 workspace 回到 clean/aligned base，清理 Playwright browser/report/test-results、临时数据库、backend/Vite/browser 进程，并以 `push_test=false`、`lease_release=true` 结构化回传。
