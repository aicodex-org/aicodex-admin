## MODIFIED Requirements

### Requirement: web-admin使用精确Bun单一真值
`web-admin` SHALL 以Bun 1.3.14作为唯一活动package manager，SHALL 在 `package.json`精确声明 `bun@1.3.14`并提交唯一 `bun.lock`，且 SHALL 删除 `yarn.lock`、Yarn-only guard和活动Yarn/npm fallback。单元测试 SHALL 由Vitest runner执行，迁移 SHALL NOT 改用 `bun test`。

#### Scenario: 审计package manager真值
- **WHEN** 开发者检查最终package、lockfile和安装guard
- **THEN** `packageManager` SHALL 精确等于 `bun@1.3.14`
- **AND** 仓库 SHALL 只存在tracked `web-admin/bun.lock`
- **AND** guard SHALL 接受Bun并拒绝Yarn/npm安装入口
- **AND** dependencies、devDependencies和resolutions SHALL 除经OpenSpec批准的单元测试工具链变化外不发生漂移

#### Scenario: 执行Vitest测试脚本
- **WHEN** 开发者或CI执行 `bun run test:ci`
- **THEN** script SHALL 启动仓库显式Vitest 4.1.10工具链
- **AND** 命令 SHALL NOT 调用Bun test runner或Jest runner

### Requirement: 安装成功包含lock与依赖完整性复核
入口 SHALL 在首次attempt前验证实际Bun版本等于package pin并计算 `bun.lock` SHA-256；每次attempt后 SHALL 验证hash未变化。install exit 0后 SHALL 动态验证全部direct dependency manifest、全部resolution精确版本，以及React/ReactDOM/Vitest/coverage provider/Vite/Playwright/`rc-virtual-list`关键入口与当前平台CLI shim。完整性检查 SHALL 从当前package动态得出数量，不得硬编码迁移前Jest依赖总数。

#### Scenario: lock发生漂移
- **WHEN** 任一attempt前后的 `bun.lock` hash不同
- **THEN** 入口 SHALL 立即返回非零且不继续重试
- **AND** SHALL 报告lock drift而不打印lock内容或环境敏感值

#### Scenario: direct与关键入口完整
- **WHEN** install命令返回0
- **THEN** 检查器 SHALL 验证当前package声明的全部direct manifest存在且名称匹配
- **AND** SHALL 验证全部resolution精确版本、React/ReactDOM/Vitest/coverage provider/Vite/Playwright/`rc-virtual-list`关键入口与当前平台CLI shim
- **AND** Jest CLI仍存在或任何当前direct/关键入口缺失 SHALL 视为当前attempt失败
