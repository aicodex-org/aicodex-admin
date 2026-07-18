## MODIFIED Requirements

### Requirement: Admin E2E 使用单一 typed Playwright 工具链
`web-admin` SHALL 使用 `@playwright/test`、typed Playwright config 和项目自有 scripts 作为 Admin E2E 的唯一 runner，并 SHALL 使用 Vite `7002` 作为默认浏览器边界。单元测试runner迁移 SHALL NOT接管或修改Playwright实现与执行边界。

#### Scenario: 开发者发现 Playwright 测试
- **WHEN** 开发者执行项目 E2E discovery script
- **THEN** Playwright SHALL 从独立测试目录发现 19 个 spec 和 22 个 test
- **AND** discovery SHALL 不包含 skip 或 only
- **AND** typed config、fixtures、helpers 和 specs SHALL 由独立 TypeScript 命令验证

#### Scenario: Playwright 启动 Vite webServer
- **WHEN** 本地或 CI 执行 Admin Playwright E2E
- **THEN** `baseURL` 与 Vite `webServer` SHALL 默认使用 `http://127.0.0.1:7002`
- **AND** specs SHALL 使用相对路径而不是散落 `7001` 或私有环境 URL
- **AND** E2E baseURL 覆盖 SHALL 只接受 loopback `7002`，Vite proxy SHALL 强制使用本机 `8000`
- **AND** 本地与 CI SHALL NOT 复用启动前已经存在的 dev server

#### Scenario: 单元runner迁移保持E2E discovery
- **WHEN** `web-admin`从Jest迁移到Vitest并更新package与lock
- **THEN** `bun run test:e2e:list` SHALL 继续发现19 files / 22 tests
- **AND** Playwright version、config、fixtures、specs、workers、retries与一次性数据库边界 SHALL 无行为修改

### Requirement: Cypress路径保持退役且Bun成为单一真值
仓库 SHALL 继续删除Cypress dependency、config、support、spec、专用TypeScript配置和GitHub Action，并 SHALL 以Bun与 `bun.lock`作为唯一package manager真值。

#### Scenario: 审计最终dependency tree
- **WHEN** 单元runner迁移后检查package与lockfile
- **THEN** `cypress`、`@cypress/request`、`@cypress/xvfb`和仅由Cypress引入的 `bluebird` SHALL 不再出现在有效依赖路径
- **AND** `@playwright/test` SHALL 由 `package.json`和唯一 `bun.lock`确定性解析
- **AND** change SHALL NOT 升级React、Router、Vite、Playwright或恢复Web3

#### Scenario: 审计最终仓库资产
- **WHEN** 全仓搜索Cypress与Playwright接入点
- **THEN** 运行时E2E资产与CI SHALL 只引用Playwright
- **AND** 历史OpenSpec证据 MAY 保留Cypress、Yarn与Jest技术术语
- **AND** Admin Go runtime、fixture/schema和production业务源码 SHALL 无行为修改
