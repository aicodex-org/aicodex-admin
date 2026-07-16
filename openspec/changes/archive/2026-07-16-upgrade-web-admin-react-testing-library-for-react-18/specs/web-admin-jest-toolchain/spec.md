## ADDED Requirements

### Requirement: React 18 测试渲染使用维护中的 createRoot 路径
`web-admin` SHALL 使用与 React 18.2、当前 Node 基线和显式 Jest 27 工具链兼容的维护中 Testing Library 版本。默认 `render` SHALL 使用 `ReactDOMClient.createRoot`，`cleanup` SHALL 卸载已渲染 root，`act` SHALL 能稳定提交同步与异步更新；测试配置和测试文件 SHALL NOT 通过全局或局部 suppression 隐藏 `ReactDOM.render` 退役告警。

#### Scenario: 默认渲染 React 18 组件
- **WHEN** Jest suite 使用 Testing Library 的默认 `render` 渲染组件
- **THEN** 渲染 SHALL 调用 `ReactDOMClient.createRoot`
- **AND** console SHALL NOT 出现 `ReactDOM.render is no longer supported` 告警

#### Scenario: 清理和 act 提交更新
- **WHEN** 测试在 `act` 中触发同步或异步状态更新并随后执行 `cleanup`
- **THEN** 更新 SHALL 在断言前稳定提交
- **AND** 已渲染 root SHALL 被卸载且容器 SHALL 被清空

#### Scenario: Testing Library peer 依赖可复现
- **WHEN** 开发者使用仓库 Yarn 真值执行 frozen install
- **THEN** package 与 lockfile SHALL 显式满足 Testing Library 要求的 DOM peer
- **AND** SHALL NOT 要求升级 React、ReactDOM、Jest、TypeScript、Vite 或业务运行时依赖

## MODIFIED Requirements

### Requirement: 既有 Jest 运行语义保持兼容
显式配置 SHALL 保持现有 mocks、`resetMocks`、fake timers、dynamic imports、CommonJS/ESM、jsdom globals 与默认单测 timeout 的断言语义。React 18 warning SHALL 保持可审计，但 Testing Library 默认渲染 SHALL NOT 继续使用 legacy root，配置与测试 SHALL NOT 通过全局或局部 suppression 隐藏 legacy root 或其它诊断差异。

#### Scenario: 运行高风险兼容 suites
- **WHEN** 执行 auth、provider、application、Management、runtime env、locale、App lazy import、style topology、React 18 render/cleanup/act 与 fake-timer 聚焦 suites
- **THEN** 所有 suites SHALL 在默认 timeout 下通过
- **AND** legacy `ReactDOM.render` 告警 SHALL 为 0
- **AND** 配置 SHALL NOT 增加全局 timer 清理、延长 timeout、skip 或 warning suppression 来改变既有语义
