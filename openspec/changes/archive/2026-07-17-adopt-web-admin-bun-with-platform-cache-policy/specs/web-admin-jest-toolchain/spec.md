## MODIFIED Requirements

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
