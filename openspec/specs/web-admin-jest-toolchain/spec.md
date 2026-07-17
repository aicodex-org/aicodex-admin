# web-admin-jest-toolchain Specification

## Purpose
定义 `web-admin` 脱离 React Scripts 后的显式 Jest 工具链、完整测试发现基线、开发与 CI 入口兼容性，以及 Vite 生产构建不受影响的约束。
## Requirements
### Requirement: web-admin 使用显式 Jest 测试工具链
`web-admin` SHALL 使用仓库自有的显式 Jest 配置执行测试，SHALL NOT 依赖 React Scripts 注入 Jest transform、environment、setup、module mapping、discovery 或 coverage 行为，也 SHALL NOT 通过 `react-app-polyfill/jsdom`注入CRA测试polyfill。

#### Scenario: 转换 TypeScript 与 React 测试
- **WHEN** Jest 加载 `.ts`、`.tsx`、`.js`、`.jsx`、`.mjs` 或 `.cjs` 测试及依赖模块
- **THEN** 显式 Babel transform SHALL 解析 TypeScript、automatic JSX runtime、Jest mock hoist、dynamic import 与 CommonJS 互操作
- **AND** transform SHALL NOT 读取或改变 Vite production build 的 Babel target 配置

#### Scenario: 初始化浏览器测试环境
- **WHEN** Jest 启动任一DOM或React suite
- **THEN** runner SHALL 使用显式jsdom environment
- **AND** jsdom URL SHALL 固定为稳定的本机HTTP origin
- **AND** SHALL 在断言前加载 `src/setupTests.ts`，但 SHALL NOT 加载 `react-app-polyfill/jsdom`
- **AND** 现有 `window`、`document`、storage、`matchMedia` 与jest-dom matcher SHALL 可用
- **AND** 需要fetch的suite SHALL 使用明确的现有test double，而不是依赖全局CRA polyfill

### Requirement: 样式与资产模块具有稳定测试替身
显式 Jest 配置 SHALL 为普通 style、CSS Modules、通用资产与 SVG 分别提供可维护的 mapper 或 mock，并 SHALL 保持现有测试所需的模块导出语义。

#### Scenario: 测试导入样式与普通资产
- **WHEN** 被测模块导入 CSS/Less、CSS/Less Modules 或普通静态资产
- **THEN** 普通 style SHALL 映射到空 style mock
- **AND** style modules SHALL 映射到稳定 class-name proxy
- **AND** 普通资产 SHALL 返回确定性文件 stub，而不执行 Vite 或 Webpack loader

#### Scenario: 测试导入 SVG
- **WHEN** 被测模块通过 default export 或 `ReactComponent` named export 导入 SVG
- **THEN** SVG mock SHALL 同时提供稳定 default filename 与可渲染 React component stub

### Requirement: Jest discovery 保留完整基线
显式Jest配置 SHALL 发现旧runner在最新base上发现的全部测试路径，SHALL NOT 通过 `testPathIgnorePatterns`、删除测试、silent skip、降级transform或0-test success制造绿灯。

#### Scenario: 对照旧 runner 与显式配置
- **WHEN** 迁移前后分别执行Jest `--listTests`
- **THEN** 规范化后的新路径集合 SHALL 包含旧runner的全部141条基线路径
- **AND** 任何新增路径 SHALL 能对应本change明确新增的有效测试
- **AND** 任何旧路径缺失 SHALL 阻止release candidate

#### Scenario: CI 未发现测试
- **WHEN** `bun run test:ci`因配置错误发现0 tests
- **THEN** 命令 SHALL 以非零状态失败
- **AND** CI SHALL NOT 使用 `--passWithNoTests`

### Requirement: 开发与 CI 测试入口保持稳定体验
`web-admin` SHALL 提供直接调用Jest的开发watch入口和确定性的CI入口；两个入口 SHALL 共享同一显式配置，但 SHALL 使用适合各自场景的交互参数，并 SHALL 通过Bun package runner启动Jest而不是使用Bun test runner。

#### Scenario: 开发者运行bun run test
- **WHEN** 开发者在Git workspace执行 `bun run test`
- **THEN** script SHALL 固定 `BABEL_ENV=test`、`NODE_ENV=test`与空 `PUBLIC_URL`
- **AND** Jest SHALL 进入watch体验并发现非零测试
- **AND** 开发诊断 SHALL NOT 被全局 `silent`配置隐藏

#### Scenario: CI运行全量Jest
- **WHEN** CI或开发者执行 `bun run test:ci`
- **THEN** Jest SHALL 使用test环境变量、`CI=true`、非watch、`--runInBand`与 `--silent`完成全部suite
- **AND** 任一失败、timeout或未处理配置错误 SHALL 使命令失败

### Requirement: 既有 Jest 运行语义保持兼容
显式配置 SHALL 保持现有 mocks、`resetMocks`、fake timers、dynamic imports、CommonJS/ESM、jsdom globals 与默认单测 timeout 的断言语义。React 18 warning SHALL 保持可审计，但 Testing Library 默认渲染 SHALL NOT 继续使用 legacy root，配置与测试 SHALL NOT 通过全局或局部 suppression 隐藏 legacy root 或其它诊断差异。

#### Scenario: 运行高风险兼容 suites
- **WHEN** 执行 auth、provider、application、Management、runtime env、locale、App lazy import、style topology、React 18 render/cleanup/act 与 fake-timer 聚焦 suites
- **THEN** 所有 suites SHALL 在默认 timeout 下通过
- **AND** legacy `ReactDOM.render` 告警 SHALL 为 0
- **AND** 配置 SHALL NOT 增加全局 timer 清理、延长 timeout、skip 或 warning suppression 来改变既有语义

### Requirement: 测试覆盖率由显式配置管理
Jest SHALL 显式声明 production source coverage discovery、Babel coverage provider、输出目录与 reporters，使 coverage 不依赖 React Scripts 默认值。

#### Scenario: 收集前端源码覆盖率
- **WHEN** 开发者使用 Jest coverage 参数运行测试
- **THEN** coverage SHALL 纳入 `src` 下的 JS/JSX/TS/TSX production source并排除声明文件
- **AND** SHALL 生成 text、JSON、LCOV 与 Clover 等既有报告形式到 ignored coverage 目录

### Requirement: Jest 解耦不改变 Vite 与 public scripts
移除React Scripts后，Vite SHALL 继续作为唯一默认 `start`/`build`工具链，production lint、TypeScript gates与public auth scripts SHALL 保持可执行。

#### Scenario: 验证非测试前端工具链
- **WHEN** 安装唯一 `bun.lock`并完成package manager迁移
- **THEN** `bun run typecheck`、`bun run typecheck:build-tooling`、增量TypeScript gate、`bun run lint`、public scripts check/build/smoke与 `bun run build` SHALL 通过
- **AND** `bun run start`、`bun run build`、Vite config、public scripts与生产组件 SHALL NOT 重新依赖React Scripts

### Requirement: React 18 测试渲染使用维护中的 createRoot 路径
`web-admin` SHALL 使用与React 18.2、当前Node基线和显式Jest 27工具链兼容的维护中Testing Library版本。默认 `render` SHALL 使用 `ReactDOMClient.createRoot`，`cleanup` SHALL 卸载已渲染root，`act` SHALL 能稳定提交同步与异步更新；测试配置和测试文件 SHALL NOT 通过全局或局部suppression隐藏 `ReactDOM.render`退役告警。

#### Scenario: 默认渲染 React 18 组件
- **WHEN** Jest suite使用Testing Library的默认 `render`渲染组件
- **THEN** 渲染 SHALL 调用 `ReactDOMClient.createRoot`
- **AND** console SHALL NOT 出现 `ReactDOM.render is no longer supported`告警

#### Scenario: 清理和 act 提交更新
- **WHEN** 测试在 `act`中触发同步或异步状态更新并随后执行 `cleanup`
- **THEN** 更新 SHALL 在断言前稳定提交
- **AND** 已渲染root SHALL 被卸载且容器 SHALL 被清空

#### Scenario: Testing Library peer 依赖可复现
- **WHEN** 开发者使用仓库Bun单一真值执行对应平台的标准安装入口
- **THEN** package与 `bun.lock` SHALL 显式满足Testing Library要求的DOM peer
- **AND** SHALL NOT 要求升级React、ReactDOM、Jest、TypeScript、Vite或业务运行时依赖

### Requirement: React 18 测试异步提交保持可审计
`web-admin` 的 React 测试 SHALL 在断言和 cleanup 前等待由交互触发的 promise、DOM 状态、microtask 或 timer 完成条件。测试 SHALL NOT 通过全局或局部 warning suppression、空 `act`、任意 sleep、提高 timeout 或 legacy ReactDOM 隐藏未完成更新。

#### Scenario: 等待异步用户交互完成
- **WHEN** 测试触发 backend request、class state、portal、motion、lazy import 或其它异步 React 更新
- **THEN** 测试 SHALL 使用 `findBy`、`waitFor`、await 交互、可捕获 promise 或具有实际推进目标的 `act` 等待用户可观察状态稳定
- **AND** 测试结束时治理 owner SHALL NOT 输出 `not wrapped in act` warning

#### Scenario: 局部诊断 guard 不静默 console
- **WHEN** 测试使用局部 guard 防止 act warning 回退
- **THEN** guard SHALL 保留原始 `console.error` / `console.warn` 行为并在断言后恢复 spy
- **AND** guard SHALL NOT 按 warning 文本返回、吞掉 AntD/runtime warning 或写入 Jest 全局 setup/config

### Requirement: fake timer 只推进其拥有的异步任务
使用 Jest fake timers 的测试 SHALL 在创建目标 timer 前启用 fake timers，在 `act` 中推进与断言相关的 timer 和后续 microtask，并在完成后恢复 real timers。测试 SHALL NOT 用 fake timer API 清理 native timer，也 SHALL NOT 通过全局 timer cleanup 改变其它 suite 语义。

#### Scenario: 轮询测试推进并恢复 timer
- **WHEN** 测试验证 polling、debounce、interval 或 timeout 行为
- **THEN** fake timer SHALL 在目标 timer 创建前启用
- **AND** timer 推进与后续 React 提交 SHALL 在断言前完成
- **AND** suite 结束时 SHALL 不输出 FakeTimers/native timer 提示
