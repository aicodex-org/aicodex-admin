## 验证摘要

验证时间：2026-06-30，本地 `web-admin` 渐进 TypeScript 迁移 worktree。

本 change 只做基础入口、basic 展示组件、账号轻组件和低风险独立轻文件的 TS/TSX 迁移；未修改后端 API 契约、真实认证链路、Provider 配置、shell/config 路由注册或生产/类生产配置。因此验证口径限定为源码、单测、类型和构建层级，不声明端到端或真实环境验收。

## 命令结果

- `openspec validate migrate-admin-basic-entry-account-pages-to-typescript --strict`：通过。
- `openspec validate --changes --strict`：archive 后通过，3 个其它 active changes 通过，0 failed。
- `openspec validate --specs --strict`：archive 后通过，30 个 specs 通过，0 failed。
- `git diff --check origin/hfl-test-base..HEAD`：通过，无 whitespace error。
- `yarn test --watchAll=false --runInBand --testMatch "**/src/account/WeComProfileSyncPanel.test.tsx" "**/src/TourConfig.test.tsx" "**/src/SystemToolsMenuPages.test.tsx" "**/src/ServerEditPage.test.tsx" "**/src/basic/ShortcutsPage.test.tsx" "**/src/PlanPricingSubscriptionPages.test.tsx" "**/src/ModelPages.test.tsx"`：通过，7 suites / 74 tests，0 snapshots。
- `yarn test --watchAll=false --runInBand --coverage --collectCoverageFrom=src/account/WeComProfileSyncPanel.tsx --collectCoverageFrom=src/TourConfig.tsx --testMatch "**/src/account/WeComProfileSyncPanel.test.tsx" "**/src/TourConfig.test.tsx"`：通过，2 suites / 17 tests。
- `yarn typecheck`：通过。
- `node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`：通过。
- `yarn build`：通过，`craco build` 编译成功，`mv.js` 将 `build-temp` 重命名为 `build`。

## 覆盖率

覆盖率统计对象选择本批迁移中有实际交互/配置逻辑分支且已有 focused tests 的两个文件；其它迁移文件为机械后缀迁移和局部类型边界补齐，由 focused Jest、typecheck、增量 TS gate 和 build 覆盖导入与编译风险。

| 文件 | Statements | Branches | Functions | Lines |
| --- | ---: | ---: | ---: | ---: |
| `src/account/WeComProfileSyncPanel.tsx` | 94.68% | 86.66% | 96% | 94.5% |
| `src/TourConfig.tsx` | 100% | 86.66% | 100% | 100% |
| 合计 | 95.68% | 86.66% | 96.96% | 95.57% |

## 警告和限制

- focused Jest 输出既有 React 18 `ReactDOM.render` 警告；该警告来自当前测试库/历史测试模式，本 change 未改测试渲染基础设施。
- `yarn build` 输出既有 `fs.F_OK` deprecation、Browserslist 数据过期和 bundle size 提示；本 change 未改依赖、构建配置或 bundle 拆分策略。
- 未执行浏览器 smoke：本 change 无 UI 视觉重做、路由注册变更或真实运行态行为变更；风险由 focused Jest、typecheck、增量 TS gate 和 build 覆盖。
- deferred 文件：无。
- 验证记录未包含 token、secret、Cookie、client secret、私有 URL、个人邮箱、手机号或其它敏感字段原值。
