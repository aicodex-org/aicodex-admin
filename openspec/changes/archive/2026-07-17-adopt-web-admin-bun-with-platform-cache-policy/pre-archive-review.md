# Pre-archive Review（最终RC候选）

## 状态

- 归档准备状态：`READY`
- 生命周期边界：运行态门禁已通过且部署锁已释放；本change仍按release-candidate-only保持active，不得自行archive、push base/test或释放change lease。
- Review范围：`origin/hfl-test-base@51359c78..HEAD`的最终实现、OpenSpec artifacts、直接测试、完整质量证据、本地与60环境browser/build证据、注释、文档语言、脱敏、写集和临时残留。

## 发现项与修复

- Blocking / fail-closed：E2E workflow原先使用 `bun x playwright install`，CLI缺失时可能临时下载并绕过tracked tree。已先收紧 `FrontendCiGates.test.ts`得到预期RED，再把workflow改为 `bun x --no-install playwright install --with-deps chromium`；组合聚焦4 suites、46/46通过，全仓活动owner不再存在无界 `bun x`。
- Non-blocking：fresh W3非标准 `bun x … jest`诊断受Windows新物化tree/Defender负载影响，Feishu单用例超过默认5s；标准 `bun run test:ci`与fixed candidate的Node/Jest非静默全量均为157/157 suites、1503/1503 tests通过。未提高timeout、未改并行owner、未添加skip/suppression。
- 本次审查范围内未发现其它阻断问题。

## 验证与覆盖率

- Windows默认持久cache：3/3 fresh `node_modules`样本均attempt 1/5成功；lock不变，72/72 direct、1/1 resolution、8/8 critical和1751-file tree shape一致。
- Jest：标准 `test:ci`与Node/Jest非静默全量均0 failure；direct owner最终46/46通过。
- TypeScript、lint、public scripts、Vite build、19/22 Playwright discovery与本地Chromium production preview均通过；bundle与父提交Yarn runner逐字节一致。
- `install-with-retry.cjs` changed coverage：statements 88.20%、lines 88.95%、functions 85.18%，达到实施代码85%门槛；测试覆盖平台分派、custom cache fail-fast、恢复/耗尽、lock漂移、残缺tree、错误可见和Husky边界。
- OpenSpec target、all changes、57/57 specs strict与 `git diff --check`通过。
- 60环境使用同一候选HEAD和lock完成真实production Dockerfile no-cache build；Linux frozen安装attempt 1/5通过，依赖树72/72 + 1/1 + 8/8完整，隔离candidate的server health、登录页、关键静态路由/资源及真实Chromium 1440/390 smoke通过。
- 60环境任务container/image/network/volume/clone/log与本地隧道/浏览器产物已定向清理；既有Admin服务保持同一脱敏ID hash、running/healthy和restart=0，部署锁已释放。
- 运行态后fetch确认 `origin/hfl-test-base`未前进，最终实现相对已部署候选只新增3份OpenSpec脱敏证据；单提交收敛后聚焦owner测试4/4 suites、46/46 tests重新通过，无需重复Windows三矩阵或60部署。

## 注释 Review

- 已逐项检查 `runProcess`、`verifyInstalledTree`、`ensureHuskyBunHook`、`runInstallWithRetry`与PowerShell package-manager分派。
- retry、残缺tree、Windows cache、lock漂移、Husky v4兼容等非显然规则均有中文导向性注释；`Bun`、`manifest`、`CLI`、`Husky`、`fail-closed`等保留为标准技术词。
- 其它短小helper名称与失败消息已充分表达职责，不补复述代码的低价值注释。

## 文档、语言与脱敏

- proposal、design、tasks、verification、pre-implementation review与7个delta specs均以简体中文说明为主；OpenSpec固定标题、`Requirement`/`Scenario`、MUST/SHALL、命令、字段和技术术语保留英文。
- delivery artifacts无TBD、TODO、FIXME、模板占位、真实环境地址、账号、token、Cookie、DSN、registry配置或raw payload。
- verification明确区分用户手工证据、worker自动样本、本地浏览器、60隔离运行态与未覆盖的真实Provider/认证链路，不把局部部署smoke提升为第三方或生产流量E2E。

## 主规格与交付单元

- RC阶段 `openspec/specs`无diff；未来sync-specs archive将新建 `web-admin-bun-package-manager`并更新6个既有前端/本地开发主规格。Archive后必须清理新主规格 `Purpose`并重新做中文/TBD/strict review。
- 当前 `origin/hfl-test-base..HEAD`正好1个本change逻辑commit，base为HEAD祖先；最终工作分支只普通push，不push或merge base/test。
- 旧reference branch `8ad40f4c`仅本地保留且不push；`origin/test`未修改。

## 运行态证据与剩余风险

- 60运行态硬门禁已通过：同一branch/commit和 `bun.lock`完成production Dockerfile no-cache build、独立Compose project/端口/临时DB candidate及真实server/frontend smoke；任务资源均定向清理，未触碰既有Admin服务/DB。
- Windows显式空/隔离cache首次物化仍是Bun 1.3.14已知限制；标准入口拒绝非空 `BUN_INSTALL_CACHE_DIR`，文档提供恢复默认持久cache的路径。
- 60环境只覆盖临时PostgreSQL、health和未登录静态链路，不等同真实Provider、认证账号、共享数据库或生产流量E2E；该限制已按证据层级记录为非阻塞剩余风险。
- RC回传前保持 `ACTIVE`、resource locks与change lease；不archive、不push base/test、不删除新工作分支或释放lease。
