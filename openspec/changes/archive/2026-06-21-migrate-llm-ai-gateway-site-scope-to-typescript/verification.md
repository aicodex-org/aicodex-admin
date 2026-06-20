# 验证记录

## 2026-06-21 rebase 刷新验证

- 基线：`origin/hfl-test-base` = `830cfda08f721ae45d6fce5bcf5d51c4a450538a`。
- 验证时提交（更新本记录前）：`c0441225e73ffffcb4fb4bd10e070f2b932de45e`。
- rebase：已将站点范围 release candidate rebase 到最新基线；`origin/hfl-test-base..HEAD` 为 1 个 commit。
- 写集确认：本轮仍限定在站点范围页面、`RuleTable` 共享表格、对应测试和 OpenSpec artifacts，未触碰 `RuleListPage`、`RuleEditPage`、其它规则表格、后端 wrapper、MCP Store 或 MCP Server。
- 重新执行的验证包括 OpenSpec strict、增量 TypeScript gate、focused Jest、changed-file coverage、`yarn typecheck` 和 `yarn build`；结果见下方命令表。

## 验证范围

本次验证覆盖 LLM AI/Gateway 站点范围 TSX 迁移 change：

- `web-admin/src/SiteListPage.tsx`
- `web-admin/src/SiteEditPage.tsx`
- `web-admin/src/table/RuleTable.tsx`
- 对应 `.test.tsx` 聚焦测试
- OpenSpec change artifacts 和仓库主 specs 校验

本次未做浏览器或真实运行态 smoke；迁移未改变 API path、payload shape、路由语义或后端 wrapper，验证证据以 focused Jest、changed-file coverage、typecheck、build 和 OpenSpec 校验为准。

## 命令与结果

| 命令 | 结果 |
| --- | --- |
| `openspec validate migrate-llm-ai-gateway-site-scope-to-typescript --strict` | 通过，目标 change valid |
| `openspec validate --changes --strict` | 通过，4 个 active changes valid |
| `openspec validate --specs --strict` | 通过，28 个 specs valid |
| `git diff --check` | 通过，无输出 |
| `git diff --check origin/hfl-test-base...HEAD` | 通过，无输出 |
| `cd web-admin; node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base` | 通过，无输出 |
| `cd web-admin; yarn typecheck` | 通过，`tsc --noEmit` exit 0 |
| `cd web-admin; yarn test --watchAll=false --runInBand --runTestsByPath src/SiteListPage.test.tsx src/SiteEditPage.test.tsx src/table/RuleTable.test.tsx` | 通过，3 suites / 29 tests |
| `cd web-admin; yarn test --watchAll=false --runInBand --coverage --collectCoverageFrom=src/SiteListPage.tsx --collectCoverageFrom=src/SiteEditPage.tsx --collectCoverageFrom=src/table/RuleTable.tsx --runTestsByPath src/SiteListPage.test.tsx src/SiteEditPage.test.tsx src/table/RuleTable.test.tsx` | 通过，3 suites / 29 tests；受影响文件 coverage 达标 |
| `cd web-admin; yarn build` | 通过，compiled successfully |

## Changed-file Coverage

统计对象限定为本 change 的三个实施文件。

| 文件 | Statements | Branches | Functions | Lines |
| --- | ---: | ---: | ---: | ---: |
| `src/SiteEditPage.tsx` | 100% | 91.17% | 100% | 100% |
| `src/SiteListPage.tsx` | 100% | 94.33% | 100% | 100% |
| `src/table/RuleTable.tsx` | 100% | 100% | 100% | 100% |
| All files | 100% | 93.54% | 100% | 100% |

覆盖率测试覆盖了列表页加载、分页、空数据 fallback、新增、删除、错误提示、站点表格列 render、节点状态标签、编辑页依赖数据加载和失败提示、字段 handler、保存成功/失败语义，以及 RuleTable 添加、删除、上移、下移、选择规则和 null rules fallback。

## Build Warnings

`yarn build` 成功，但输出以下既有 warning：

- `fs.F_OK is deprecated, use fs.constants.F_OK instead`
- `Browserslist: caniuse-lite is outdated`
- bundle size significantly larger than recommended

本 change 未修改构建依赖、Browserslist 数据库、bundle splitting 或构建脚本；这些 warning 记录为既有构建健康问题，不作为本次 TSX 迁移阻断项。

## 归档前 Review

- OpenSpec artifacts 语言以简体中文为主，保留了 OpenSpec 固定标题、规范关键字、命令、路径和技术名词。
- 验证记录未包含真实 secret、token、Cookie、私有 URL、账号凭据或生产/类生产连接信息。
- 主规格尚未包含本次站点范围 requirement；delta spec 为新增内容，archive 时同步到 `admin-enterprise-identity-llm-ai-gateway-center` 和 `web-admin-incremental-typescript`。
- 注释 review 发现 legacy JS `BaseListPage` 适配、`SiteEditPage` 初始 null 语义和 `RuleTable` 导出 contract 需要说明，已补中文注释。
- 注释补充后重跑 `git diff --check` 和 `cd web-admin; yarn typecheck`，均通过。

## 剩余风险

- 未做浏览器截图或真实登录态 smoke；本 change 仅做行为兼容迁移，主要风险已由 focused Jest、typecheck 和 build 覆盖。
- `SiteEditPage` 仍保留 legacy class component、`UNSAFE_componentWillMount` 和原地修改 `this.state.site` 的既有行为；本 change 按设计不重构这些行为。
- 治理规则编辑器、MCP Store、MCP Server 和后端 wrapper 未纳入本 change。
