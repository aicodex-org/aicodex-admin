## 验证摘要

本 change 只改 Admin 前端认证源中心展示和 OpenSpec artifacts，不改真实认证链路、OAuth/OIDC 授权流程、组织同步执行、生产配置或密钥。

## 命令与结果

- `openspec validate "implement-admin-enterprise-identity-auth-source-center" --strict`
  - 结果：通过，输出 `Change 'implement-admin-enterprise-identity-auth-source-center' is valid`。

- `git diff --check`
  - 结果：通过，无 whitespace error。

- `yarn test --testMatch "**/src/AuthSourceCenter.test.js" "**/src/ManagementPage.navigation.test.js" --watchAll=false --runInBand`
  - 结果：通过，`Test Suites: 2 passed, 2 total`，`Tests: 7 passed, 7 total`。
  - 覆盖：认证源状态推导、配置完整度、敏感字段不展示、诊断入口、空态、加载态、导航文案与 `/providers` 权限 key 兼容。

- `yarn test --testMatch "**/src/AuthSourceCenter.test.js" --watchAll=false --runInBand --coverage --collectCoverageFrom=src/AuthSourceCenter.js`
  - 统计对象：`web-admin/src/AuthSourceCenter.js`。
  - 结果：通过，`Statements 100%`，`Branches 97.5%`，`Functions 100%`，`Lines 100%`，达到 85% 覆盖率目标。

- `yarn build`
  - 结果：通过，输出 `Compiled successfully.`。
  - 备注：构建存在既有 `Browserslist: caniuse-lite is outdated`、`fs.F_OK is deprecated` 和 bundle size warning，不是本 change 新增阻塞。

## 环境说明

- 当前 worktree 初次 `yarn install --frozen-lockfile` 和 `yarn install --frozen-lockfile --ignore-scripts` 均长时间停在依赖 linking 阶段，未生成可用 `node_modules/.bin/craco.cmd`。
- 为完成前端验证，已删除半成品 `web-admin/node_modules`，并临时创建 ignored 的 `web-admin/node_modules` junction 指向同项目主工作区依赖目录后执行测试和构建。命令的 cwd 均为当前 worktree 的 `web-admin`，验证对象为本次改动源码。
- Jest 在 `.codex` worktree 路径下默认 `testMatch` 未匹配到测试文件，因此聚焦测试显式传入 `--testMatch`。

## UI 验证

- 通过 React Testing Library 渲染认证源中心组件，验证状态卡片、空态、加载态、配置入口、同步诊断入口、失败摘要入口和敏感字段不展示。
- 通过生产构建验证新增组件、样式和路由集成可编译。
- 未启动真实 Admin 登录态浏览器流：`/providers` 依赖本地认证账号和后端 account/provider API，本 change 不创建真实账号、不写真实配置、不触发认证或同步执行。后续若需要截图，可在已登录且允许只读接口访问的测试环境打开 `/providers` 做视觉验收。

## 剩余风险

- 最近同步、授权状态和失败摘要仍为前端只读入口聚合，不代表真实运行健康度；精确摘要需要后续只读后端聚合接口。
- Provider 类型匹配采用保守前端规则，非标准命名的 provider 可能显示为未启用，但不会影响原 Provider 表格和编辑行为。
