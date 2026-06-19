# 验证记录

验证日期：2026-06-19。

## 源码与规格门禁

- `openspec validate polish-admin-identity-overview-aicodex-infra --strict`：归档前通过。
- `openspec validate --changes --strict`：归档前通过，5 个 active changes 全部通过；归档并 rebase 后通过，4 个 active changes 全部通过。
- `openspec validate --specs --strict`：通过，26 个主规格全部通过。
- `git diff --check`：通过。
- `node -e "JSON.parse(...zh/data.json); JSON.parse(...en/data.json)"`：通过，`zh` / `en` locale JSON 可解析。

## 前端测试与覆盖率

- `cd web-admin; yarn test --watchAll=false --runInBand --coverage --collectCoverageFrom=src/IdentityConsoleOverview.js --collectCoverageFrom=src/enterpriseNavigation.js --testMatch "**/src/IdentityConsoleOverview.test.js" --testMatch "**/src/ManagementPage.navigation.test.js" --testMatch "**/src/common/NavItemTree.test.js"`：通过，3 个 suite、15 个 test 全部通过。
- 覆盖率统计对象：`IdentityConsoleOverview.js` 与 `enterpriseNavigation.js`。
- 覆盖率结果：All files statement 95.14%、branch 86.82%；`IdentityConsoleOverview.js` statement 92.53%、branch 86.81%；`enterpriseNavigation.js` statement 100%、branch 86.84%。受影响实现代码达到 85% 目标。
- 备注：Jest 输出 React Testing Library 旧 `ReactDOM.render` 的 React 18 兼容 warning，属于现有测试栈警告，不影响断言结果。

## TypeScript 与构建

- `cd web-admin; node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`：通过。
- `cd web-admin; yarn typecheck`：通过，`tsc --noEmit` 退出 0。
- `cd web-admin; yarn build`：通过，production build 编译成功。
- 备注：build 输出既有 `fs.F_OK` deprecation、Browserslist outdated 和 bundle size warning，本 change 未引入构建配置变更。

## 浏览器验证

验证方式：本地 production build 静态服务 + mock `/api/get-account`、`/api/get-dashboard` 和只读 `/api/**` 响应；未连接真实后端、60 环境或 69 正式环境。mock 账号按真实协议返回 `data` 账号、`data2` 组织，并包含 `avatar`、`logo`、`logoDark`、`themeData`、`navItems` 等壳层字段。

桌面 `1440x900`：

- `/` 必需内容全部可见：`AICodex 身份基础设施总览`、`身份控制台 / 身份总览`、四个产品域、四个 code tag、`待核对事项`、`接入健康`、`最近审计证据`、`查看记录`。
- `/` 未出现旧显眼入口堆叠和内部术语：`治理任务中心`、`接入预检中心`、`进入身份资产关系`、`企业认证中心`、`对象上下文`、`deep link`、`只读推导`、`当前列表视图`、`待处理` 等均未出现在总览正文。
- `/` 链接检查：`/applications`、`/providers`、`/records` 均可从总览或导航可达。
- `/applications`、`/providers`、`/records`：主内容区域均渲染，console warning/error=0，pageerror=0。
- 页面级横向溢出：`/`、`/applications`、`/providers`、`/records` 均为 `{clientWidth: 1425, scrollWidth: 1425, bodyScrollWidth: 1425}`。
- 标题顶部位置：`titleTop=145`，与 workspace tabs 合入后的桌面壳层间距一致，未出现超高顶部空白。

移动 UA `390x844`：

- UA：iPhone Safari 模拟 UA。
- `/` 必需内容全部可见：`AICodex 身份基础设施总览`、`应用规格`、`待核对事项`、`最近审计证据`。
- `/` 未出现禁用产品名、内部术语或 `待处理`。
- 页面级横向溢出：`{clientWidth: 390, scrollWidth: 390, bodyScrollWidth: 390}`。
- 标题顶部位置：`titleTop=141`，与移动端 workspace tabs 降级栏合入后的壳层间距一致，未出现超高顶部空白。
- console warning/error=0，pageerror=0。

## 剩余风险

- 本 change 只重构前端身份总览、导航可见性、文案、文档和 OpenSpec，不新增真实后端聚合状态或工单处理 workflow。
- 浏览器验证使用本地 production build 和 mock API，只证明前端壳层、总览渲染、路由兼容、响应式和无控制台错误；不声明真实后端审计事实链路、同步链路或 Gateway 投影链路已完成。
