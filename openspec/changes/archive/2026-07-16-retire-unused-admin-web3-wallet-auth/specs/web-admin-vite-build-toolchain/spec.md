## MODIFIED Requirements

### Requirement: 浏览器兼容 fallback 保持有界
Vite 构建 SHALL 支持当前 Buffer 和必要 CommonJS 依赖，但 SHALL NOT 为已退役的 MetaMask/Web3 Onboard 认证保留专属预打包项，也 SHALL NOT 通过无边界 Node polyfill 套件模拟浏览器不应使用的 core modules。

#### Scenario: 构建 Buffer 与 CommonJS 依赖
- **WHEN** 执行 production build
- **THEN** Buffer 和仍有业务 owner 的混合 CommonJS 模块 SHALL 成功解析和产出
- **AND** build SHALL NOT 因 `process`、`global` 或 Node core module 缺失而失败
- **AND** MetaMask/Web3 Onboard 专属依赖与 `optimizeDeps` 项 SHALL 不再存在

#### Scenario: 浏览器触发普通 Provider 路径
- **WHEN** smoke 打开普通登录或 Provider 路径并触发对应模块加载
- **THEN** 所需 chunk SHALL 成功加载
- **AND** 页面与 console SHALL 不出现未定义 Buffer/global/process 或 CommonJS interop error
