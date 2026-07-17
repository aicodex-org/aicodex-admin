## Why

Admin 已证明 Bun 1.3.14 在 Linux 冷 frozen install 与 Windows 默认持久 cache 的日常路径可以形成完整依赖树；此前失败集中在 Windows 显式空/隔离 cache 的首次物化路径。现在需要把这个平台差异固化为可诊断、可回滚的 package manager 契约，以同一 tracked lock 完成真实 CI、Docker、本地开发和运行态交付验证。

## What Changes

- **BREAKING**：将 `web-admin` 的唯一 package manager 真值从 Yarn Classic 切换为精确 `bun@1.3.14`，提交唯一 `bun.lock`并删除 `yarn.lock`及活动Yarn/npm fallback；Jest仍由Jest 27执行，不迁移到 `bun test`。
- 新增平台化安装入口：Windows使用普通 `bun install`和默认持久cache，Linux CI/Docker使用frozen install；两端在安装前后校验lock hash，并验证全部direct dependency、resolution和React/Jest/Vite/Playwright关键入口。
- 平台入口最多执行5次同workspace、同cache的透明重试；Windows标准入口不设置、清空或接受显式 `BUN_INSTALL_CACHE_DIR`，耗尽、lock漂移或tree不完整均fail-closed。
- 将GitHub Actions、production Dockerfile、Makefile、Playwright webServer、Windows local-dev和活动开发说明一次性切换到Bun；保持Node、Jest、Vite、public scripts与Playwright既有职责和产物路径。
- 记录Windows空/隔离cache首次物化的已知限制、诊断与恢复方式；该压力场景不再替代标准Windows持久cache和Linux交付路径的验收。
- 在默认持久cache下完成3次Windows fresh `node_modules`重建及完整质量门禁；随后仅在controller时点授权后使用同一RC branch/lock执行60环境的no-cache production Docker构建和隔离candidate smoke。

## Capabilities

### New Capabilities

- `web-admin-bun-package-manager`: 定义Bun单一真值、平台化cache/install策略、有界重试、lock/tree完整性、已知Windows压力限制、CI/Docker/local-dev切换、运行态门禁与整体Yarn回滚。

### Modified Capabilities

- `web-admin-test-baseline-and-ci-gates`: 将CI安装和Jest、TypeScript、lint、public scripts、build、E2E命令从Yarn runner切换到Bun，同时保持现有门禁内容。
- `web-admin-jest-toolchain`: 将开发/CI Jest和相关非测试工具链命令切换为Bun runner，继续使用显式Jest 27而非Bun test runner。
- `web-admin-incremental-typescript`: 将TypeScript稳态的标准typecheck/build runner从Yarn切换到Bun，保留脚本名与验证层级。
- `web-admin-playwright-e2e`: 将E2E package runner、Linux frozen install与lock cache key切换为Bun，保持19 files/22 tests、loopback和一次性数据库边界。
- `web-admin-vite-build-toolchain`: 将默认Vite开发和production build的外部命令契约从Yarn切换到Bun。
- `admin-local-dev-workflow`: 将Windows本地开发和frontend-only预览切换为Bun及默认持久cache，不保留Yarn/npm fallback。

## Impact

- 依赖真值：`web-admin/package.json`、新增 `web-admin/bun.lock`、删除 `web-admin/yarn.lock`，以及最窄安装/完整性脚本与直接测试。
- 交付入口：`.github/workflows/build.yml`、`deploy/Dockerfile`、`Makefile`、`web-admin/playwright.config.ts`、两条 `local-dev` PowerShell入口、活动开发指引和直接契约测试。
- 本地验证保留用户现有完整 `node_modules`与默认全局cache；不删除用户证据cache，不重复空隔离cache压力矩阵。
- 60阶段只使用任务专属clone、Compose project、端口、临时数据库volume和定向清理；不得替换、重启或连接现有Admin服务/数据库。
- 不修改业务页面、Go业务代码、数据库schema、认证/Provider契约、`origin/test`或旧NO-GO archive；技术债基线只在后续closeout明确授权时更新。
