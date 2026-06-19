## 验证范围

本 change 是 Admin `web-admin` 前端的行为保持型 TSX 迁移，覆盖“应用接入”一级菜单下二级菜单落地页：

- `/applications`
- `/resources`
- `/certs`
- `/keys`
- `/platform-api-mappings`
- `/webhooks`
- `/webhook-events`

验证不触发真实认证、OIDC、Gateway、Webhook 回调、真实密钥或生产/类生产配置。

## 命令与结果

| 命令 | 结果 |
| --- | --- |
| `openspec validate migrate-application-access-menu-pages-to-typescript --strict` | 通过：目标 change valid |
| `openspec validate --changes --strict` | 通过：5 个 active changes 全部通过 |
| `openspec validate --specs --strict` | 通过：26 个 specs 全部通过 |
| `git diff --check` | 通过：无 whitespace error |
| `cd web-admin; node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base` | 通过：无输出，退出码 0 |
| `cd web-admin; yarn typecheck --pretty false` | 通过：`tsc --noEmit --pretty false` 退出码 0 |
| `cd web-admin; $env:CI='true'; yarn test --watchAll=false --runInBand --coverage ApplicationAccessMenuPages.test.tsx ApplicationListPage.test.tsx PlatformApiMappingPage.test.tsx --collectCoverageFrom=src/ApplicationListPage.tsx --collectCoverageFrom=src/ResourceListPage.tsx --collectCoverageFrom=src/CertListPage.tsx --collectCoverageFrom=src/KeyListPage.tsx --collectCoverageFrom=src/PlatformApiMappingPage.tsx --collectCoverageFrom=src/WebhookListPage.tsx --collectCoverageFrom=src/WebhookEventListPage.tsx` | 通过：3 个 test suites、20 个 tests 全部通过 |
| `cd web-admin; yarn build` | 通过：production build compiled successfully，并完成 `build-temp` 到 `build` 的移动 |

## 覆盖率

覆盖率命令统计对象为本次迁移触碰的 7 个生产 TSX 页面：

| 文件 | Statements | Branches | Functions | Lines |
| --- | ---: | ---: | ---: | ---: |
| `ApplicationListPage.tsx` | 69.41% | 50.90% | 70.27% | 68.67% |
| `ResourceListPage.tsx` | 60.00% | 35.48% | 66.66% | 59.61% |
| `CertListPage.tsx` | 57.62% | 35.55% | 56.00% | 56.14% |
| `KeyListPage.tsx` | 71.73% | 33.33% | 70.00% | 70.45% |
| `PlatformApiMappingPage.tsx` | 64.16% | 69.35% | 60.42% | 64.79% |
| `WebhookListPage.tsx` | 74.00% | 34.78% | 75.00% | 72.91% |
| `WebhookEventListPage.tsx` | 65.00% | 26.25% | 61.29% | 65.00% |
| 合计 | 64.91% | 62.46% | 62.90% | 65.01% |

说明：

- 本次是 `.js` 到 `.tsx` 的迁移型 rename，Jest/Istanbul 按整文件统计，历史大页全部进入 touched production files 口径，因此整文件覆盖率未达到 85%。
- 已补充聚焦测试覆盖迁移后更容易被类型改坏的行为：列表行渲染、敏感字段不展示、fetch 参数、add/copy/delete/replay 操作、Webhook event 筛选/详情 helper、Platform API mapping 原有行为和脱敏复制。
- 未为了覆盖率数字迁移编辑页、后端 API client 或重写旧 `BaseListPage`，避免扩大本 change 行为面。

## 已知测试噪声

- Jest 输出 React 18 `ReactDOM.render` warning，来源于项目当前 Testing Library/React 兼容层，非本 change 新增运行时行为。
- Jest 输出 jsdom `window.computedStyle(elt, pseudoElt)` not implemented warning，来源于 AntD/Testing Library 可访问名计算，测试断言仍通过。
- Build 输出 `fs.F_OK` deprecation 和 `Browserslist: caniuse-lite is outdated` 提示，均为既有工具链提示，编译最终通过。

## 剩余风险

- 整文件覆盖率低于 85%，主要来自历史大页迁移后被整文件计入 coverage；本 change 用 focused behavior tests、typecheck、build 和 TS gate 控制迁移风险。
- 未做浏览器人工/Playwright 截图验证，因为本 change 不做视觉重设计；页面行为以现有 Jest、typecheck 和 production build 覆盖。

## 归档前 Review

- OpenSpec 文档语言：`proposal.md`、`design.md`、`tasks.md`、`verification.md` 和 delta spec 已检查，说明性正文以中文为主；OpenSpec 固定标题、命令、路径、字段和技术名词保留英文。
- 主规格同步：本 change 的 delta 只扩展 `web-admin-incremental-typescript`，archive 时由 OpenSpec 合入主规格；archive 后需要重新运行 `openspec validate --changes --strict` 和 `openspec validate --specs --strict`。
- 注释和类型边界：生产页面只做行为保持型 JS 到 TSX 迁移；新增 `legacyPage.ts` 用中文注释限定 `LegacyAny` 只用于旧 `BaseListPage`、JS backend client 和 AntD helper 边界，不把 `any` 扩散为新业务模型。
- 脱敏：验证记录、测试 fixture 和页面断言只使用 `.example.invalid`、假 secret 和字段名；未记录真实环境 IP、私有 URL、token、Cookie、真实 secret 或生产配置。
- 覆盖率：focused Jest coverage 已运行并记录 touched production files 结果。整文件覆盖率未达 85%，原因是历史大页迁移后按整文件统计；本 change 未用低价值测试强行覆盖旧 `BaseListPage`/backend client 分支，剩余风险已显式记录。
- 交付单元：当前 change 尚未 archive，且工作分支落后 `origin/hfl-test-base`；archive 后必须 rebase 到最新 base、重跑关键验证，并收敛为单 change commit 后再 push/ff-only 合入。
