## 验证范围

本 change 只改造 `web-admin` Provider 编辑页的共享编辑壳、基础字段布局、样式接入、i18n 文案和聚焦测试。不改 Provider 后端 API、保存 payload、删除 payload、OAuth/OIDC/SAML/WeCom/Lark 字段语义、认证回调或真实 provider 探测行为。

## 自动化验证

- `openspec validate migrate-provider-edit-shell --strict`：通过。
- `git diff --check`：通过。
- `yarn test ProviderEditPage.test.tsx provider/OAuthProviderFields.test.tsx provider/LarkProviderGuide.test.tsx --watchAll=false --runInBand`：通过，3 个套件共 49 个测试通过。测试覆盖共享编辑壳、底部动作栏、基础字段和组织搜索接线、旧重复按钮移除、加载成功/404/错误、组织与证书边界、12 类 Provider 分类默认值、6 类 Provider 类型默认值、mapping 校验、Lark/WeCom 校验、保存和删除的成功/业务失败/连接失败，以及 Google、Azure、Custom OAuth、WeChat、飞书/Lark 的真实字段交互。
- `yarn test StyleModuleTopology.test.ts --watchAll=false --runInBand`：通过，4 个测试通过。测试覆盖 `large-edit-pages.less` 已接入 `provider-edit.less`，且 Provider 编辑页样式通过聚合入口进入 `App.less`。
- `yarn stylelint src/styles/edit/provider-edit.less`：通过。
- `yarn eslint src/ProviderEditPage.test.tsx src/provider/OAuthProviderFields.test.tsx src/provider/LarkProviderGuide.test.tsx`：通过；仅输出既有 `caniuse-lite` 更新提示。
- `node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`：通过。
- `yarn typecheck`：通过。
- `yarn build`：通过。构建输出有既有依赖侧提示：`fs.F_OK` deprecation、`caniuse-lite is outdated` 和 CRA bundle size 建议；未发现本 change 引入的编译错误。

## 覆盖率

- 覆盖率命令：`yarn test ProviderEditPage.test.tsx provider/OAuthProviderFields.test.tsx provider/LarkProviderGuide.test.tsx --watchAll=false --runInBand --coverage --coverageReporters=text --coverageReporters=json --collectCoverageFrom=src/ProviderEditPage.tsx --collectCoverageFrom=src/provider/OAuthProviderFields.tsx --collectCoverageFrom=src/provider/LarkProviderGuide.tsx --collectCoverageFrom=src/provider/LarkProviderEndpointModeSummary.tsx`。命令通过，49/49 测试通过。
- 本 change 改写语句审计：基于 `coverage-final.json` 的 statement map 与 `git diff --unified=0 origin/hfl-test-base...HEAD` 新行交集统计，`ProviderEditPage.tsx` 为 `107/107（100%）`，新增 `LarkProviderEndpointModeSummary.tsx` 为 `5/5（100%）`，达到 85% 门槛。
- 相关组件完整文件覆盖率：`OAuthProviderFields.tsx` statements/lines 90.47%、functions 100%；`LarkProviderGuide.tsx` statements/lines/functions 100%；`LarkProviderEndpointModeSummary.tsx` statements/branches/functions/lines 100%。OAuth/Lark 两个既有文件的本 change JSX 调整没有独立 statement 起始行，因此同时记录完整文件覆盖率作为补充证据。
- 历史整文件口径：四文件合计 statements/lines 56.50%；`ProviderEditPage.tsx` statements/lines 53.73%、branches 42.36%、functions 58.87%。该页面约 1,300 行，仍包含本 change 未重写的 Email、SMS、SAML、Web3、Storage、Payment 等历史动态分支。
- 归档处置：用户已确认优先补充有效测试，不为未改历史分支添加只执行行号的低价值测试。本轮将本 change 改写语句从 31.78% 提升到 100%，并使相关 OAuth/Lark 组件完整文件覆盖率达到 90.47% 至 100%；历史整文件覆盖缺口保留为后续按 Provider 类型拆分时逐步治理的技术债。

## 浏览器验证

- 使用 `local-dev/start-frontend-remote-backend.ps1 start -Port 7002 -BackendHealthPath /api/get-account -WebWaitSeconds 180` 启动本地前端，并代理到已授权的 60 测试后台。报告中不记录完整后台地址、Cookie、token 或账号凭据。
- 访问 `http://127.0.0.1:7002/providers`，使用当前登录态进入 Provider 列表，再打开一条真实 Provider 编辑路由 `/providers/admin/dingding`。
- Playwright DOM 检查结果：
  - `.provider-edit-shell` 存在。
  - `.provider-edit-action-bar` 存在。
  - `.provider-edit-card .ant-card-head` 不存在，旧 Card title 操作区已移除。
  - 页面文本不包含旧 `Save & Exit`。
  - 1440x900 桌面 viewport 下 `documentElement.scrollWidth === window.innerWidth`，无页面级横向溢出。
  - 底部动作按钮为 `取消`、`保存`、`保存并返回`。
  - 区块标题为 `基础信息`、`Provider 配置`，中文模式下不再出现新增标题中英混排。
  - 组织下拉选项不重复渲染 `admin`，共享项显示为 `admin（共享）`，其它组织显示展示名和技术标识。
  - 基础字段 `组织`、`分类`、`类型` 以及配置区 `Email正则表达式` 的 tooltip 使用 Provider 语境文案。
- Playwright console error 检查：当前页面无 console error。
- 追加使用 Playwright fixture 镜像 60 当前 6 个 Provider 名称/类型做布局回归：`admin/dingding`、`admin/Feishu`、`admin/WeCom`、`admin/provider_captcha_default`、`admin/provider_balance`、`admin/provider_payment_dummy`。6 个页面均能进入 `.provider-edit-shell`，存在底部 `.provider-edit-action-bar`，桌面 1440x1000 viewport 无页面级横向溢出。
- 飞书/Lark 和企业微信指南块检查：`.provider-edit-guide-row` 均带有 `admin-large-edit-full-width-row`；Alert 宽度与配置表单宽度一致，飞书/Lark 为 `1060/1060`，企业微信为 `1060/1060`，修复用户截图中指南块被压成窄列的问题。
- 追加飞书/Lark endpoint mode 提示美化验证：使用 Playwright MCP fixture 打开 `http://127.0.0.1:7002/providers/admin/Feishu`，mock 最小只读 API 数据，红框位置的端点模式说明由普通多行文本改为共享 `LarkProviderEndpointModeSummary` 结构化摘要。字段区 `.provider-edit-endpoint-mode-control` 的 computed `display` 为 `flex`，提示面板尺寸约 `720x130`，包含 1 个当前模式 badge 与 2 个域名 code pill；指南 Alert 内复用同组件但使用扁平样式，避免白盒套白盒。页面无横向溢出，console/page error/request failed 均为 0；截图输出到 `output/playwright/provider-edit-fixture-review/Feishu-endpoint-field-panel-polished-v3.png` 与 `output/playwright/provider-edit-fixture-review/Feishu-endpoint-top-polished-v3.png`。
- 限制说明：当前 MCP 浏览器没有可用 60 登录态；常见 `admin/123` 在 `built-in` 与 `admin` 组织均不是有效测试账号，因此本轮无法完成“登录 60 后实时逐页截图”。未读取本地 Chrome Cookie 或其它敏感会话数据。实时 60 逐页截图需要使用已登录浏览器会话补跑。

## 剩余风险

- 动态 Provider 专属字段仍由 `web-admin/src/provider/*` helper 输出旧式 `Row/Col`，本次通过 `admin-large-edit-form-content` 公共 legacy row 样式收敛视觉，没有重写所有 Provider 类型字段。
- `ProviderEditPage.tsx` 历史整文件覆盖率仍为 53.73%；本 change 改写语句已达到 100%，但 Email/SAML/Notification 等未改深层表单仍应在后续按 Provider 类型拆分时逐步补齐测试。
- 本轮浏览器 fixture 证明布局修复对 60 当前 Provider 类型组合有效，但不替代带真实登录态的 60 运行态截图验收。
