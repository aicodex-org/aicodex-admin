## 验证记录

验证时间：2026-06-29

## 自动化验证

- `openspec validate "align-llm-ai-gateway-list-pages" --strict`
  - 结果：通过。
- `openspec validate --changes --strict`
  - 结果：通过，4 个 active changes 全部通过。
- `openspec validate --specs --strict`
  - 结果：通过，29 个主规格全部通过。
- `web-admin: node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`
  - 结果：通过。
- `web-admin: yarn typecheck`
  - 结果：通过。
- `web-admin: CI=true yarn test AgentListPage.test.tsx ServerListPage.test.tsx EntryListPage.test.tsx SiteListPage.test.tsx RuleListPage.test.tsx --watchAll=false --runInBand`
  - 结果：通过，5 个 test suites、52 个 tests 全部通过。
  - 覆盖点：统一列表壳、轻量行操作、固定操作列移除、Agent 页不再渲染中心控制台，以及 `AgentListPage`、`ServerListPage`、`EntryListPage` 表头不再携带旧列筛选 `filterDropdown/filterIcon`。
- `web-admin: CI=true yarn test AgentListPage.test.tsx ServerListPage.test.tsx EntryListPage.test.tsx SiteListPage.test.tsx RuleListPage.test.tsx --watchAll=false --runInBand --coverage --testTimeout=20000 --collectCoverageFrom=src/AgentListPage.tsx --collectCoverageFrom=src/ServerListPage.tsx --collectCoverageFrom=src/EntryListPage.tsx --collectCoverageFrom=src/SiteListPage.tsx --collectCoverageFrom=src/RuleListPage.tsx`
  - 结果：通过，5 个 test suites、52 个 tests 全部通过。
  - 文件级覆盖率：`AgentListPage.tsx` 100% lines，`ServerListPage.tsx` 100% lines，`EntryListPage.tsx` 100% lines，`SiteListPage.tsx` 98.91% lines，`RuleListPage.tsx` 96.49% lines，均高于 85%。
- `web-admin: NODE_OPTIONS=--max_old_space_size=4096 yarn build`
  - 结果：通过，生成 `build/`。
  - 说明：未设置 `NODE_OPTIONS` 的首次 `yarn build` 在 Windows / Node v24.14.0 下以 `3221226505` 退出，未输出业务编译错误；加大 Node heap 后构建成功。构建期间仅出现既有依赖告警：`fs.F_OK` deprecation、Browserslist 过期和 bundle size 提示。
- `rg -n "getColumnSearchProps|filterDropdown|filterIcon" web-admin/src/AgentListPage.tsx web-admin/src/ServerListPage.tsx web-admin/src/EntryListPage.tsx web-admin/src/SiteListPage.tsx web-admin/src/RuleListPage.tsx`
  - 结果：无匹配，目标列表页不再渲染旧列头搜索/筛选图标。
- `git diff --check`
  - 结果：通过。

## 浏览器预览

- 使用 `local-dev/start-frontend-remote-backend.ps1` 在 `http://127.0.0.1:7005` 启动本地前端，代理到已脱敏的 60 测试后台。
- Playwright MCP 打开 `/agents` 与 `/rules`：
  - 结果：未登录状态下重定向到 `/login`，未再出现 `RuleListPage.tsx` ESLint 编译 overlay。
  - 控制台剩余告警来自既有登录页 AntD 用法：`Spin tip` 和 `Form.Item name`，不是本 change 引入的列表页编译错误。
- 经用户授权读取本机私有 60 测试登录信息后，Playwright MCP 登录 `http://127.0.0.1:7005` 本地预览并检查 `/agents`、`/servers`、`/entries`、`/sites`、`/rules`：
  - 结果：五个目标页均找到对应统一列表壳，`shellTop` 均为 `137`，列表在首屏可见。
  - 结果：五个目标页 `.ant-table-filter-trigger` 计数均为 `0`，不再显示旧列头搜索/筛选图标。
  - 结果：五个目标页右侧固定列相关 cell 计数均为 `0`，未发现不必要 fixed column sticky 单元格。
  - 结果：五个目标页 `.llm-ai-gateway-center` 计数均为 `0`，未再渲染中心式快捷入口墙。
  - 剩余告警：快速切换到 `/rules` 时出现一次 React legacy lifecycle state update warning，来源于 `RuleListPage` 异步 fetch 在快速路由切换时的既有生命周期模式；本 change 未把该 warning 作为列表壳验收通过条件。

## 待补验证

- 无。验证记录仅使用 60 环境别名和本地预览地址，未写入账号、密码、Cookie、token、完整后台地址或响应体。
