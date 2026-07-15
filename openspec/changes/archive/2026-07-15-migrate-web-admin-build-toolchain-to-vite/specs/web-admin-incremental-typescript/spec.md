## MODIFIED Requirements

### Requirement: TypeScript 稳态工具链
`web-admin` SHALL 支持 React 18 项目内业务源码以 `.ts` / `.tsx` 为默认实现形态，并 SHALL 使用 typed Vite 配置构建应用，同时保留必要 runtime JS 与 Jest/React Scripts 的受控验证边界。

#### Scenario: JS 和 TSX 共存构建
- **WHEN** 开发者在 `web-admin/src` 下新增或修改 `.ts` / `.tsx` 业务源码，同时仓库保留 public raw scripts、Node 构建入口或历史兼容 JS 入口
- **THEN** `yarn build` SHALL 能通过 Vite 构建该混合源码树
- **AND** `yarn typecheck:build-tooling` SHALL 检查 typed Vite config 与直接相关构建 helper
- **AND** 本 change 不要求把 served public JS 改造成 TypeScript runtime

#### Scenario: TypeScript 配置不检查历史 JS
- **WHEN** 开发者运行 TypeScript 静态检查
- **THEN** TypeScript 配置 SHALL 允许受控 JS runtime 入口参与模块解析
- **AND** TypeScript 配置 SHALL NOT 强制 `checkJs` 检查全部 runtime JS；需要静态验证的构建入口 SHALL 使用专用 build-tooling typecheck 或等价边界

### Requirement: 后续新增代码约定
Admin 前端后续新增 React 组件 SHALL 默认使用 `.tsx`；新增共享逻辑、接口模型和类型定义 SHALL 默认使用 `.ts`；`web-admin/src` 业务源码 SHALL NOT 新增 `.js` / `.jsx`。

#### Scenario: 新增代码默认采用 TypeScript
- **WHEN** Admin 前端新增 React 组件、共享逻辑、接口模型或类型定义
- **THEN** React 组件 SHOULD 默认使用 `.tsx`
- **AND** 共享逻辑、接口模型和类型定义 SHOULD 默认使用 `.ts`
- **AND** 保留的 public raw scripts、Node 构建入口等 runtime JS SHALL 通过现有生成链路、`@ts-check` 或专用 typecheck 管控，而不是为了零 JS 数字改造运行入口
