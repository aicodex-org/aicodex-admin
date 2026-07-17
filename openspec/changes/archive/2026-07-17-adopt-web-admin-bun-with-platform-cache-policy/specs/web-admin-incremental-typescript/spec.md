## MODIFIED Requirements

### Requirement: TypeScript 稳态工具链
`web-admin` SHALL 支持React 18项目内业务源码以 `.ts` / `.tsx`为默认实现形态，并 SHALL 使用typed Vite配置构建应用，同时保留必要runtime JS与Jest/React Scripts的受控验证边界。

#### Scenario: JS 和 TSX 共存构建
- **WHEN** 开发者在 `web-admin/src`下新增或修改 `.ts` / `.tsx`业务源码，同时仓库保留public raw scripts、Node构建入口或历史兼容JS入口
- **THEN** `bun run build` SHALL 能通过Vite构建该混合源码树
- **AND** `bun run typecheck:build-tooling` SHALL 检查typed Vite config与直接相关构建helper
- **AND** 本change不要求把served public JS改造成TypeScript runtime

#### Scenario: TypeScript 配置不检查历史 JS
- **WHEN** 开发者运行TypeScript静态检查
- **THEN** TypeScript配置 SHALL 允许受控JS runtime入口参与模块解析
- **AND** TypeScript配置 SHALL NOT 强制 `checkJs`检查全部runtime JS；需要静态验证的构建入口 SHALL 使用专用build-tooling typecheck或等价边界

### Requirement: Typecheck 验证入口
`web-admin` SHALL 提供 `bun run typecheck`脚本，用于执行 `tsc --noEmit`，并作为后续含TS/TSX前端change的标准验证项。

#### Scenario: 开发者运行类型检查
- **WHEN** 开发者在 `web-admin`目录运行 `bun run typecheck`
- **THEN** 命令 SHALL 执行TypeScript no-emit检查
- **AND** 命令 SHALL 在当前TS/TSX稳态代码上返回成功

## ADDED Requirements

### Requirement: TypeScript稳态验证命令遵循Bun单一真值
Bun采用后，增量TypeScript主规格中仍代表当前标准执行入口的验证命令 SHALL 使用 `bun run <script>`或等价Bun入口；历史交付要求中的验证层级 SHALL 保留，但现行契约 SHALL NOT 继续要求安装或调用Yarn。已归档change中的历史命令 SHALL 保持原始证据，不做追溯改写。

#### Scenario: 归档同步TypeScript主规格
- **WHEN** 本change完成sync-specs归档
- **THEN** 主规格中仍代表当前标准入口的Yarn命令字面量 SHALL 全部迁移为Bun runner
- **AND** typecheck、build-tooling、incremental gate、Jest、build与浏览器验证层级 SHALL 不因runner迁移被删除或降级
