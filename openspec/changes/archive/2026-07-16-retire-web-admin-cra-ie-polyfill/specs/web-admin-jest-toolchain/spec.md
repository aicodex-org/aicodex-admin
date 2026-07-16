## MODIFIED Requirements

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
