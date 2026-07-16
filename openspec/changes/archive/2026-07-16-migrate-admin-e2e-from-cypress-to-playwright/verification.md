# 验证记录

## 结论

2026-07-16 在本地一次性数据库环境完成 Admin E2E 迁移验证。Playwright discovery 保持 19 个 spec / 22 个 test，完整 Chromium suite 为 22/22 通过；Cypress 可执行资产、依赖、GitHub Action 与其 Bluebird 路径均已移除。验证未连接 60、共享数据库、生产或类生产环境，也未修改 Admin Go runtime、fixture/schema registry、Web3 或生产业务源码。

## 迁移等价性

- `migration-matrix.md` 逐项对应原 19 个 Cypress spec / 22 个 test；0 skip、0 only，保留历史文件名、测试标题、登录前置和精确/包含型 URL 断言。
- API/UI 登录成功和失败仍为 4 个独立测试；API 登录同时保留成功 HTTP response 与 body `status` 断言，其余 18 个受保护路由测试继续每 test 使用独立 browser context 执行真实 UI 登录。
- Adapter、Payment、Product、Token、Webhook 5 条测试继续触发真实后端创建；Syncer 只保留客户端草稿导航语义，未扩大 route mock。
- 既有 22 个测试没有表单编辑/保存、删除或空态断言；本 change 不把路由与新增导航迁移描述成这些不存在的覆盖。

## 真实浏览器与数据隔离证据

本地验收使用随机临时目录中的空 SQLite 数据库、仓库既有 built-in seed、本机 backend `8000` 与 Vite `7002`。运行前设置显式 disposable 确认标记；SQLite 仅在本次临时 DSN 使用 WAL 与 busy timeout，未修改 Go 或生产配置。

| 项目 | 结果 |
|---|---|
| Backend readiness | `/api/health` 返回 200 后才启动浏览器行为 |
| Playwright runner | `@playwright/test` 1.61.1，Chromium project，1 worker，本地 0 retry |
| 完整执行 | server 复用边界修复后 `22 passed (4.3m)`；API HTTP 断言补强后 login spec 4/4 通过 |
| SQLite 锁诊断 | backend 日志扫描 `sqlite_busy_count=0` |
| 写入边界 | 5 条真实创建仅落入本次临时数据库，结束后整库销毁 |
| 清理 | backend、Vite、browser、临时数据库与 `output/playwright` 均已回收；`7002/8000` 无本次残留 listener |

首次诊断运行中，旧 CSS locator 与当前企业列表工具栏结构不一致，同时未配置等待策略的 SQLite 出现锁争用。最终实现改为按可访问名称定位 Add 按钮，并仅在临时运行 DSN 启用 WAL/busy timeout；复验中原 7 个失败全部消失。成功运行不保留 screenshot/trace/report，避免无必要的 fixture 页面与 session 工件滞留。

## CI 执行契约

`.github/workflows/build.yml` 的 `e2e` job 已显式包含：

- job-scoped MySQL `aicodex_admin` 与仓库既有 built-in seed；
- backend HTTP readiness；
- Node 20.19.0、`yarn install --frozen-lockfile`、Playwright Chromium 安装/cache；
- `yarn typecheck:e2e` 与完整 `yarn test:e2e`，并设置 disposable 确认标记；
- 仅失败时上传 `output/playwright` 中可用 report/trace/screenshot，空文件安全且保留 7 天；
- `tag-release` 继续依赖 `e2e` 成功。

Node YAML 解析结果为 `yaml_ok jobs=11 e2e_steps=11`，并由 Jest CI 契约断言完整 Playwright run，而不是只安装浏览器或只执行 discovery。GitHub hosted job 不在本地伪造；本地真实 Chromium + 临时 SQLite 证明浏览器行为，workflow 静态门禁证明 CI 接线，推送后的 job-scoped MySQL 执行仍由正常 CI 运行提供最终平台证据。

## 本地质量门禁

| 命令 | 结果 |
|---|---|
| `yarn install --frozen-lockfile` | 通过；完整执行 preinstall/lifecycle，未使用 `--ignore-scripts` |
| `yarn test:e2e:list` | 22 tests in 19 files |
| 临时 backend 下 `yarn test:e2e` | 22/22 通过 |
| `yarn test:ci` | 142 suites / 1342 tests 通过，0 snapshot |
| 聚焦 `PlaywrightE2eToolchain.test.ts` | 6/6 通过 |
| `yarn typecheck` | 通过 |
| `yarn typecheck:build-tooling` | 通过 |
| `yarn typecheck:e2e` | 通过 |
| 增量 TypeScript gate | 通过 |
| `yarn lint` | 通过，0 warning 门槛 |
| public scripts check/build/smoke | 全部通过 |
| `yarn build` | Vite 8.1.4 production build 通过 |
| workflow YAML 解析 | 通过；11 jobs，E2E 11 steps |
| `openspec validate <change> --strict` | 通过 |
| `openspec validate --changes --strict` | 1/1 通过 |
| `openspec validate --specs --strict` | 45/45 通过 |
| `git diff --check` | 通过 |

构建仅输出仓库既有的浏览器外置、direct `eval` 与大 chunk warning；对应生产源码和 Web3 依赖不在本 change 写集。

## 覆盖率与直接执行证据

- `playwright/support/runtime.ts` 聚焦 Jest coverage：Statements/Lines/Branches/Functions 均为 100%，覆盖默认值、loopback 覆盖、非法 URL、错误协议/host/port/path、内嵌 credential 与 disposable 标记。
- `playwright.config.ts` 在 discovery 与完整 22-test run 中直接执行；`fixtures/admin.ts`、`support/auth.ts` 和 19 个 spec 在完整浏览器 run 中直接执行。
- 本 change 未修改 production implementation，业务源码 changed-file coverage 为 N/A；不以全应用覆盖率替代 E2E 迁移质量。

## 依赖、端口与残留审计

- `yarn why @playwright/test`：直接 devDependency，解析为 1.61.1。
- `yarn why cypress` 与 `yarn why bluebird`：均无匹配；package/lock/workflow 中 Cypress/Bluebird runtime 命中为 0。
- Playwright tests 中 skip/only 命中为 0；E2E 配置开启 `forbidOnly`。
- Playwright config/spec/helper 不再引用 `7001`；baseURL 只接受 loopback `7002`，Vite proxy 只指向本机 `8000`，本地与 CI 都禁止复用可能带有其它 proxy 配置的既有 server。
- Docker、标准 local-dev、远端预览 7003、Admin Go runtime、fixture/schema 与生产认证中的既有 `7001` fallback 无 diff。

## 剩余风险

- 本地真实执行使用 SQLite，CI 使用 job-scoped MySQL；workflow 已明确运行同一 22-test suite，但 hosted runner/MySQL 的平台证据需由推送后的正常 CI 提供。
- runner 按既有 Chrome surface 只覆盖 Chromium，不新增 Firefox/WebKit。
- 迁移保持既有覆盖边界，未新增编辑/保存、删除或空态 E2E；这些不是本 change 的等价迁移范围。
- 仓库既有 AntD console warning、Token 页面卸载后异步 state update 提示、FakeTimers 提示和 Vite/Web3 build warning 仍存在；本 change 未通过修改生产行为掩盖这些独立技术债。

所有记录均为脱敏计数、命令和本机 loopback 边界，不包含真实账号、token、Cookie、私有 URL、连接串、credential 或原始私有响应体。

## Pre-archive review

- 独立 reviewer 发现的本地既有 server 复用风险和 API 登录 HTTP 断言弱化均已修复；安全修复后完整 suite 22/22 通过，断言补强后 login spec 4/4 通过。
- 注释 review 已覆盖 Playwright config、runtime guard、fixture identity 与 UI 登录 helper；非显然 fail-closed/proxy 边界使用中文说明，未发现阻断级注释缺口。
- OpenSpec proposal/design/tasks/specs/verification 的中文、脱敏、证据层级与迁移矩阵一致；主规格由 archive 同步。
- 已读取上游 copyfile NO-GO 归档；最新 base 只新增该归档文档，与本 change 写集无交集。clean rebase 后保持 latest `origin/hfl-test-base` + 1 logical commit。
- Rebase 后聚焦 Jest 14/14、app/build-tooling/E2E typecheck、增量 TypeScript gate、19/22 discovery、workflow YAML、OpenSpec change/changes/specs strict 与 `git diff --check` 均通过。
- 归档准备状态：**READY**。本次审查范围内 Critical/Important/Minor 未留未解决项；剩余项仅为 hosted CI/MySQL 平台证据和既有覆盖/console warning 限制。

## Archive 后验证

- Change 已归档到 `openspec/changes/archive/2026-07-16-migrate-admin-e2e-from-cypress-to-playwright/`，active changes 为空。
- Archive 同步更新 `web-admin-incremental-typescript`、`web-admin-test-baseline-and-ci-gates`，并新增 `web-admin-playwright-e2e` 主规格；三个主规格的 `Purpose` 已按最终稳定契约使用中文对齐。历史上误挂在 Cypress requirement 下的两条同步器编辑页场景已原义重挂到独立 requirement，未随 Cypress 清退删除无关契约。
- Archive/main spec 语言与脱敏复查未发现本 change 新增的英文业务正文或敏感环境信息；新主规格 `Purpose TBD` 命中为 0。
- Archive 后 `openspec validate --changes --strict` 无 active items，`openspec validate --specs --strict` 为 46/46；聚焦 Jest 14/14、E2E typecheck、19/22 discovery 与 `git diff --check` 通过。
- Archive 只改变 OpenSpec 目录与主规格；最终源码、依赖、CI 与测试配置未变化，因此复用同一最终源码状态下的全量 Jest、Vite build、100% runtime helper coverage 和真实 Chromium 22/22 证据。
