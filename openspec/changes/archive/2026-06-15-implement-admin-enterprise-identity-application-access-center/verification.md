## 验证摘要

本 change 已完成应用接入中心前端实现、相关入口调整和 OpenSpec 校验。实现只消费现有 Application 列表数据并做前端只读推导，不新增后端写接口，不触发 OAuth/OIDC 授权、回调、密钥写入、同步执行或 Gateway projection publish。

## OpenSpec

- `openspec validate "implement-admin-enterprise-identity-application-access-center" --strict`
  - 结果：通过，目标 change valid。
- `openspec validate --changes --strict`
  - 结果：通过，archive 后剩余 3 个 active changes 全部通过。
- `openspec validate --specs --strict`
  - 结果：通过，archive 后 18 个主规格全部通过。
- `git diff --check`
  - 结果：通过，无尾随空白或补丁格式问题。

## 前端测试

- RED 阶段：`yarn test --watchAll=false --testMatch "**/src/ApplicationAccessCenter.test.js"`
  - 结果：按预期失败于 `Cannot find module './ApplicationAccessCenter'`，证明新增测试先覆盖缺失组件行为。
- GREEN 阶段：`yarn test --watchAll=false --testMatch "**/src/ApplicationAccessCenter.test.js"`
  - 结果：通过，`ApplicationAccessCenter` 6 个测试全部通过。
- 覆盖率：`yarn test --watchAll=false --coverage --collectCoverageFrom=src/ApplicationAccessCenter.js --testMatch "**/src/ApplicationAccessCenter.test.js"`
  - 统计对象：`web-admin/src/ApplicationAccessCenter.js`。
  - 结果：Statements 100%、Branches 96.25%、Functions 100%、Lines 100%，达到 85% 门槛。
- 相关回归：`yarn test --watchAll=false --testMatch "**/src/ApplicationAccessCenter.test.js" "**/src/IdentityConsoleOverview.test.js" "**/src/AuthSourceCenter.test.js" "**/src/ManagementPage.navigation.test.js"`
  - 结果：通过，4 个 suites / 16 个 tests 全部通过。
  - 备注：`AuthSourceCenter.test.js` 和 `IdentityConsoleOverview.test.js` 会输出 React 18 下旧版 `@testing-library/react` 使用 `ReactDOM.render` 的兼容警告，不影响断言结果。
- JS lint：`yarn eslint src/ApplicationAccessCenter.js src/ApplicationAccessCenter.test.js src/ApplicationListPage.js src/IdentityConsoleOverview.js src/IdentityConsoleOverview.test.js src/enterpriseNavigation.js`
  - 结果：通过。
- 提交钩子修复验证：`yarn test --watchAll=false --testMatch "**/src/ApplicationAccessCenter.test.js" "**/src/IdentityConsoleOverview.test.js"`
  - 结果：通过，2 个 suites / 9 个 tests 全部通过。
  - 备注：本次补齐 touched 测试文件的 `/* eslint-env jest */`，并按既有测试模式避免直接访问 `console.error`，确保 `lint-staged` 的裸 `eslint --fix` 能识别 Jest 全局。
- 样式 lint：`yarn stylelint src/App.less`
  - 结果：退出码 0；工具链提示 Less 文件缺少 `postcss-less` custom syntax 配置，为既有 stylelint 配置限制。
- 全量前端测试：`yarn test --watchAll=false --runInBand --silent --testMatch "**/src/*.test.js"`
  - 结果：失败，11 个 suites 通过、2 个 suites 失败。
  - 失败项 1：`src/App.test.js` 仍断言旧 CRA “learn react link”，且未用 Router 包裹 `withRouter(App)`，报错 `You should not use <withRouter(withI18nextTranslation(App)) /> outside a <Router>`。
  - 失败项 2：`src/PlatformApiMappingPage.test.js` 存在既有断言问题：`candidate: 1` 匹配到多个元素，以及 `navigator.clipboard.writeText` mock 未返回 Promise 导致 `.then` 读取失败。
  - 判定：上述失败不在本 change 触碰文件内，且相关回归测试已通过；本 change 未修改 `App.js`、`App.test.js`、`PlatformApiMappingPage.js` 或 `PlatformApiMappingPage.test.js`。

## 构建

- `yarn build`
  - 结果：通过，`craco build` 编译成功并生成 `build`。
  - 备注：输出 CRA 常见 bundle size 提示、Browserslist 数据过期提示，以及 Node `fs.F_OK` deprecation warning；这些为既有工具链警告，不影响构建成功。

## UI / 浏览器验证

- 尝试：启动 `yarn start`，目标端口 `7002`。
- 结果：未完成浏览器截图验证。dev server 进程启动并监听本地前端端口，但日志停留在 `Starting the development server...`，请求 `<local-admin-url>` 在 10 秒内未返回，说明首编译/响应未就绪。已停止残留 dev server 子进程。
- 替代证据：使用 RTL 覆盖应用接入中心渲染、入口链接、空态、loading、低风险状态和敏感字段不外露；使用 `yarn build` 验证生产编译。
- 剩余限制：本地未启动后端和登录态，无法通过真实 Admin session 进入 `/applications` 做端到端截图。

## 单测覆盖率

- 受影响实施代码：`web-admin/src/ApplicationAccessCenter.js`。
- 覆盖率命令：`yarn test --watchAll=false --coverage --collectCoverageFrom=src/ApplicationAccessCenter.js --testMatch "**/src/ApplicationAccessCenter.test.js"`。
- 结果：Statements 100%、Branches 96.25%、Functions 100%、Lines 100%，达到 85% 门槛。

## 安全与脱敏

- 新增组件只展示应用名称、配置状态、风险类别和跳转入口。
- `buildApplicationAccessCenterSummary()` 不返回 `clientSecret`、token 或其它敏感原值，测试已断言 summary 和页面不包含测试敏感占位值。
- 没有新增真实授权、回调、同步、密钥写入或 Gateway projection publish 行为。

## 剩余风险

- 应用接入中心摘要来自当前 Application 列表视图，不是后端全量聚合状态；页面文案已用“当前列表视图”标明。后续如需精确全量统计，应另起 change 定义只读聚合接口。
- 全量前端测试仍存在与本 change 无关的既有失败，已在本文件记录失败文件和原因。
