## ADDED Requirements

### Requirement: web-admin使用精确Bun单一真值
`web-admin` SHALL 以Bun 1.3.14作为唯一活动package manager，SHALL 在 `package.json`精确声明 `bun@1.3.14`并提交唯一 `bun.lock`，且 SHALL 删除 `yarn.lock`、Yarn-only guard和活动Yarn/npm fallback。Jest SHALL 继续由现有Jest runner执行，迁移 SHALL NOT 改用 `bun test`。

#### Scenario: 审计package manager真值
- **WHEN** 开发者检查最终package、lockfile和安装guard
- **THEN** `packageManager` SHALL 精确等于 `bun@1.3.14`
- **AND** 仓库 SHALL 只存在tracked `web-admin/bun.lock`
- **AND** guard SHALL 接受Bun并拒绝Yarn/npm安装入口
- **AND** dependencies、devDependencies和resolutions SHALL 不因迁移发生未批准版本变化

#### Scenario: 执行现有Jest测试脚本
- **WHEN** 开发者或CI执行 `bun run test:ci`
- **THEN** script SHALL 启动仓库现有Jest 27工具链
- **AND** 命令 SHALL NOT 调用Bun test runner

### Requirement: 安装入口按平台选择cache与frozen策略
统一安装入口 SHALL 在Windows执行普通 `bun install`并使用默认持久cache，在Linux CI/Docker执行 `bun install --frozen-lockfile`。两个平台 SHALL 使用相同tracked `bun.lock`、Bun版本、完整性检查与失败语义。

#### Scenario: Windows开发者使用标准安装入口
- **WHEN** Windows开发者在未设置 `BUN_INSTALL_CACHE_DIR`的环境执行 `bun run deps:install`
- **THEN** 入口 SHALL 执行普通 `bun install`
- **AND** SHALL NOT 设置、清空或重定向默认持久cache
- **AND** SHALL NOT 把 `--frozen-lockfile`加入Windows标准命令

#### Scenario: Windows环境显式设置custom cache
- **WHEN** Windows标准入口检测到非空 `BUN_INSTALL_CACHE_DIR`
- **THEN** 入口 SHALL 在首次install前返回非零并提示取消该变量后重试
- **AND** SHALL NOT 删除、清空或读取该custom cache的内容

#### Scenario: Linux交付环境安装依赖
- **WHEN** GitHub Actions或production Docker在Linux执行 `bun run deps:install`
- **THEN** 入口 SHALL 执行 `bun install --frozen-lockfile`
- **AND** SHALL NOT 降级为普通install或继承Windows custom-cache策略

### Requirement: 平台安装使用同workspace有界重试
统一入口 SHALL 在同一workspace与同一平台cache内最多执行5次对应安装命令。每次失败 SHALL 保持可见，耗尽 SHALL 返回非零；入口 SHALL NOT 清tree、换lock、切backend、手工补包或无限重试。

#### Scenario: 前次失败后同cache恢复
- **WHEN** 某次install返回非零或exit 0后的完整性检查失败，且后续attempt在同一workspace/cache通过
- **THEN** 入口 SHALL 输出每次attempt、实际命令和失败状态
- **AND** SHALL 保留当前 `node_modules`与cache后有界重试
- **AND** SHALL 只在完整性检查通过后返回0

#### Scenario: 五次均未形成完整tree
- **WHEN** 连续5次命令或安装后完整性检查均未成功
- **THEN** 入口 SHALL 停止在第5次并返回非零
- **AND** CI、Docker或本地调用方 SHALL 不继续后续质量或build步骤

### Requirement: 安装成功包含lock与依赖完整性复核
入口 SHALL 在首次attempt前验证实际Bun版本等于package pin并计算 `bun.lock` SHA-256；每次attempt后 SHALL 验证hash未变化。install exit 0后 SHALL 动态验证全部direct dependency manifest、全部resolution精确版本，以及React/Jest/Vite/Playwright/`rc-virtual-list`关键入口与当前平台CLI shim。

#### Scenario: lock发生漂移
- **WHEN** 任一attempt前后的 `bun.lock` hash不同
- **THEN** 入口 SHALL 立即返回非零且不继续重试
- **AND** SHALL 报告lock drift而不打印lock内容或环境敏感值

#### Scenario: direct与关键入口完整
- **WHEN** install命令返回0且当前package包含72个direct dependency、1个resolution与8个critical package
- **THEN** 检查器 SHALL 验证72/72 direct manifest存在且名称匹配
- **AND** SHALL 验证resolution精确版本、8/8关键入口和Jest/Vite/Playwright CLI shim
- **AND** 缺失任何一项 SHALL 视为当前attempt失败

### Requirement: Windows空隔离cache限制具备可操作诊断
文档 SHALL 明确Bun 1.3.14在Windows显式空/隔离cache首次物化时可能出现cache move `EPERM`、tar extraction失败与 `ENOENT`。该压力场景 SHALL NOT 被表述为标准入口成功，也 SHALL NOT 在标准Windows默认持久cache和Linux交付路径通过时单独否决迁移。

#### Scenario: 操作者遇到空custom cache物化失败
- **WHEN** 手工诊断使用空custom cache并出现 `EPERM`、extract或 `ENOENT`
- **THEN** 文档 SHALL 建议保留同一cache/tree有界重试，或取消 `BUN_INSTALL_CACHE_DIR`恢复默认持久cache
- **AND** SHALL NOT 建议ignore lifecycle、手工补包、清空后无限重跑或吞掉错误

### Requirement: Windows现实路径验证默认持久cache
release candidate SHALL 从同一固定commit建立3个独立Windows fresh `node_modules`样本，均不设置 `BUN_INSTALL_CACHE_DIR`并使用最终安装入口。只有3/3成功、lock不变、tree完整且shape一致，候选才可进入60运行态门禁。

#### Scenario: 三个Windows样本全部成功
- **WHEN** worker严格串行执行3个初始无 `node_modules`的短路径样本
- **THEN** 每个样本 SHALL 使用默认持久cache并记录attempt、耗时、lock hash、direct/resolution/critical结果与tree shape
- **AND** 3个样本 SHALL 全部在5次以内成功且最终tree shape一致
- **AND** worker SHALL NOT 删除fixed workspace的用户 `node_modules`、全局cache或用户证据cache

### Requirement: Bun迁移具备整体回滚与运行态门禁
迁移 SHALL 作为一个逻辑交付单元整体回滚，不得只恢复lock或只切换部分CI。Windows与本地质量门禁通过后，worker SHALL 先向controller发送 `RUNTIME_GATE_READY`；只有controller时点授权后才可从同一RC branch/lock执行60环境production Dockerfile no-cache build与隔离candidate smoke。

#### Scenario: controller尚未授权60
- **WHEN** 本地pre-archive review已READY但controller尚未明确授权
- **THEN** worker SHALL 保持ACTIVE、resource locks和lease
- **AND** SHALL NOT 访问、构建或部署60

#### Scenario: 60隔离candidate通过
- **WHEN** controller授权worker进入60阶段
- **THEN** worker SHALL 使用同一RC branch和 `bun.lock`执行production Dockerfile no-cache build
- **AND** candidate SHALL 使用独立Compose project、端口和临时数据库volume
- **AND** server health、登录页、关键静态路由、资源与浏览器console/page/request smoke SHALL 通过
- **AND** 任务container/image/network/volume/clone/log SHALL 定向清理且现有Admin服务/数据库 SHALL 不被修改

#### Scenario: 整体回滚到Yarn基线
- **WHEN** 采用后必须回滚
- **THEN** operator SHALL revert本change整个逻辑commit并重新构建
- **AND** 父提交的 `yarn.lock`、package guard、CI、Docker、Makefile、Playwright和local-dev Yarn入口 SHALL 一致恢复
- **AND** 仓库 SHALL NOT 保留Bun/Yarn双lock混合状态
