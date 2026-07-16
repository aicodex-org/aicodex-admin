## ADDED Requirements

### Requirement: Admin E2E 使用单一 typed Playwright 工具链
`web-admin` SHALL 使用 `@playwright/test`、typed Playwright config 和项目自有 scripts 作为 Admin E2E 的唯一 runner，并 SHALL 使用 Vite `7002` 作为默认浏览器边界。

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

### Requirement: Cypress 行为逐项等价迁移
Playwright suite SHALL 保持现有 19 个 Cypress spec / 22 个 test 的用户行为、测试标题、历史文件映射、数据前置和关键断言，不得通过删测、合并关键断言、扩大 mock 或新增 skip/only 制造等价。

#### Scenario: 迁移 API 与 UI 登录测试
- **WHEN** 运行 `login` spec
- **THEN** suite SHALL 独立执行 API 登录成功、UI 登录成功、API 登录失败和 UI 登录失败 4 个测试
- **AND** API 测试 SHALL 继续断言成功 HTTP response 与 response body 的 `status`
- **AND** UI 测试 SHALL 继续通过真实表单提交并断言成功根路由或失败 `/login` 路由

#### Scenario: 迁移受保护管理路由测试
- **WHEN** 运行其余 18 个管理路由测试
- **THEN** 每个测试 SHALL 使用独立 browser context 执行真实 UI 登录并断言成功根路由
- **AND** 每个测试 SHALL 保留迁移矩阵中的精确或包含型 URL 断言
- **AND** 既有新增按钮 SHALL 继续触发真实 UI/后端行为而不是被 route mock 替代

#### Scenario: 报告既有覆盖限制
- **WHEN** change 记录迁移后的行为覆盖
- **THEN** verification SHALL 明确说明既有 22 个测试没有表单编辑/保存、删除或空态断言
- **AND** verification SHALL NOT 把路由迁移描述成这些未存在场景的覆盖

### Requirement: 写入型 E2E 只使用可销毁数据环境
完整 Playwright suite SHALL 只连接 job-scoped 或本地临时数据库，并 SHALL 在执行后回收数据库、session、浏览器和报告产物；完整 suite SHALL NOT 在 60、共享数据库、生产或类生产环境运行。

#### Scenario: CI 运行写入型测试
- **WHEN** CI 执行 Adapter、Payment、Product、Token 或 Webhook 新增测试
- **THEN** 后端 SHALL 使用本次 job 的一次性数据库和仓库内置初始化数据
- **AND** retries 产生的记录 SHALL 只存在于该一次性数据库
- **AND** job 结束 SHALL 销毁数据库 service

#### Scenario: 本地运行完整 E2E
- **WHEN** 开发者执行本地完整 E2E 验收
- **THEN** backend SHALL 使用临时目录内的 disposable 数据库与仓库内置 fixture
- **AND** 每个 test SHALL 要求显式 `AICODEX_ADMIN_E2E_DISPOSABLE_DB=1` 确认标记，缺失时 SHALL fail before user behavior
- **AND** 验收完成 SHALL 停止 backend、Vite 和 browser 进程并删除本次临时数据库与 Playwright output
- **AND** 未明确为 disposable 的 backend SHALL 阻止完整 suite 运行

#### Scenario: E2E 使用确定性 fixture 身份
- **WHEN** 测试需要认证
- **THEN** 测试 SHALL 仅使用一次性初始化数据中的确定性 fixture 身份
- **AND** 代码、日志、report 和 verification SHALL NOT 包含真实账号、token、Cookie、私有 URL、credential 或原始私有响应体

### Requirement: CI 真实执行 Playwright 并保留有限失败证据
GitHub Actions SHALL 显式安装 Chromium、验证 backend/Vite readiness 并运行完整 Playwright suite；仅安装 Playwright 或只执行 discovery SHALL NOT 视为 E2E 通过。

#### Scenario: CI 执行完整 Playwright suite
- **WHEN** E2E job 运行
- **THEN** job SHALL 使用 Yarn frozen install、显式 Chromium 安装、E2E TypeScript 检查和完整 Playwright run
- **AND** Chromium run SHALL 执行 22 个测试且失败时阻止依赖该 job 的 release 流程
- **AND** CI retries SHALL 保持 2，本地 retries SHALL 保持 0，workers SHALL 保持 1

#### Scenario: CI 上传失败诊断工件
- **WHEN** Playwright E2E 失败
- **THEN** CI SHALL 上传 HTML report、trace 和 screenshot 的可用子集
- **AND** 工件 SHALL 只包含一次性 fixture 数据、使用有限保留期并在无文件时安全结束上传步骤
- **AND** verification SHALL 只记录脱敏摘要、计数和相对路径，不复制原始 trace、Cookie 或响应体

### Requirement: Cypress 路径一次性移除且 Yarn 保持单一真值
迁移完成后仓库 SHALL 删除 Cypress dependency、config、support、spec、专用 TypeScript 配置和 GitHub Action，并 SHALL 保持 Yarn 与 `yarn.lock` 为唯一 package manager 真值。

#### Scenario: 审计最终 dependency tree
- **WHEN** 迁移完成后检查 package 与 lockfile
- **THEN** `cypress`、`@cypress/request`、`@cypress/xvfb` 和仅由 Cypress 引入的 `bluebird` SHALL 不再出现在有效依赖路径
- **AND** `@playwright/test` SHALL 由 `package.json` 和 frozen `yarn.lock` 确定性解析
- **AND** change SHALL NOT 生成 Bun lock、修改 Yarn preinstall guard 或升级 React、Router、Jest、Vite、Web3

#### Scenario: 审计最终仓库资产
- **WHEN** 全仓搜索 Cypress 与 Playwright 接入点
- **THEN** 运行时 E2E 资产与 CI SHALL 只引用 Playwright
- **AND** 历史 OpenSpec 证据 MAY 保留 Cypress 技术术语
- **AND** Docker、标准 local-dev、Admin Go runtime、fixture/schema 和生产业务源码 SHALL 无行为修改
