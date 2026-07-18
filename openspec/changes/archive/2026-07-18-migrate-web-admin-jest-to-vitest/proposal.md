## Why

`web-admin` 已以 Vite 8.1.4 作为唯一应用构建工具链，但 157 个单测文件、1503 个测试仍由 Jest 27、独立 Babel transform 和 Jest 专属 mock/config 支撑，形成重复的转换链、陈旧依赖与持续扩大的迁移成本。现在需要在不改变生产行为、测试覆盖强度和 warning 可见性的前提下，将单元测试原子迁移到与 Vite 同生态的 Vitest，并把 runner、依赖、CI 与 OpenSpec 真值一次性收敛。

## What Changes

- **BREAKING**：将 `bun run test` 与 `bun run test:ci` 的唯一单元测试 runner 从 Jest 27 切换为精确 `vitest@4.1.10`；工作分支内可短暂双跑做路径与结果对照，最终候选不得保留双 runner、`@jest/globals` alias 或全局 `jest = vi` 兼容层。
- 新增独立 Vitest 配置和 setup/test support，显式固定 `jsdom@28.1.0`、`@testing-library/jest-dom@6.9.1`、`@vitest/coverage-v8@4.1.10`、单 worker、文件串行、mock reset、测试发现、CSS Modules、普通样式、SVG/资产与 coverage 契约；将Node engines收窄为共同兼容的 `^20.19.0 || ^22.12.0 || >=24.0.0`，不采用Node 22下界为22.13.0的 `jsdom@29.1.1`或Vitest不支持的Node 23。
- 将 157 个测试文件从 `@jest/globals` / `jest.*` 迁移到显式 `vitest` / `vi` API，逐项处理 77 个 module mock owner、48 个 mock factory 内动态 `require("@jest/globals")` owner、CommonJS/ESM、hoist、module cache、fake timer、`requireActual` 与 `isolateModules` 差异；不得通过删测、skip/only、扩大 mock、延长 timeout 或 suppression 制造绿灯。
- 移除 Jest 27、`babel-jest`、`jest-environment-jsdom`、`jest-watch-typeahead`、Jest config/support 与无 owner 依赖；逐项审计 Babel、CSS/asset support 的现有 owner，仅删除确认不再被 ESLint、Vite、coverage 或其它活动入口使用的项。
- 保持 migration 前后规范化测试路径集合 157/157 无缺失，最终测试数不少于 1503 且 0 failure；全量 CI 与专用审计入口保持 non-silent，React act、fake timer/native timer、AntD/runtime warning 不得因 runner 迁移被隐藏。
- 保持 coverage 覆盖 `src` production JS/JSX/TS/TSX、排除声明与测试文件，并继续输出 text、JSON、LCOV、Clover；CI 保留 `frontend-checks` job identity，只将unit step标签/失败契约和 `FrontendCiGates` 等直接契约测试同步到 Vitest。
- 同步 Vitest 新 capability，退役 `web-admin-jest-toolchain` 的活动 runner 真值，并更新测试基线、Bun、Vite、warning、增量 TypeScript 与 Playwright 等当前主规格；修正 `docs/admin-technical-debt-baseline-2026-07-14.md` 中已过期的 Bun NO-GO/Yarn/Jest 路线结论。
- 验收限于依赖、runner、CI、typecheck、lint、public scripts、Vite build、单元测试、coverage 与 Playwright discovery；不部署 60，不修改 production 页面、路由、API、后端、schema、认证/provider 或构建产物契约。

## Capabilities

### New Capabilities

- `web-admin-vitest-toolchain`: 定义 Vitest 4.1.10 单一测试 runner、jsdom/setup、Vite transform、mock/module/timer 兼容、资产语义、discovery、coverage、开发/CI 入口与 warning 可见性契约。

### Modified Capabilities

- `web-admin-jest-toolchain`: 移除全部活动 Jest runner requirements，使 archive/sync-specs 后不再与 Vitest 形成双真值。
- `web-admin-test-baseline-and-ci-gates`: 将全量单测、CI、discovery、warning 与迁移写集契约从 Jest 更新为 Vitest，并固定 157 files / 至少 1503 tests 基线。
- `web-admin-bun-package-manager`: 将 Bun 脚本与依赖完整性检查的单测关键入口从 Jest 27 更新为 Vitest，同时继续禁止使用 `bun test`。
- `web-admin-vite-build-toolchain`: 将 release candidate 的前端单测门禁更新为全量 Vitest，保持 Vite 生产构建边界不变。
- `web-admin-antd-runtime-warning-owners`: 将 non-silent warning owner 审计入口迁移到串行 Vitest，保留原始 warning 可见性和 owner 归因。
- `web-admin-incremental-typescript`: 将当前标准测试验证入口声明为 Bun + Vitest 单一真值，历史归档证据不作为活动 Jest runner 契约。
- `web-admin-playwright-e2e`: 明确单元 runner 迁移不得改变 Playwright 19 files / 22 tests、typed config、一次性数据库与 CI 执行契约。
- `admin-enterprise-identity-llm-ai-gateway-center`: 将MCP Server现行TypeScript迁移验收命令从Yarn/Jest更新为Bun/Vitest。
- `admin-web3-wallet-auth`: 将Web3退役能力中的现行依赖安装与前端回归命令更新为Bun/Vitest，不改变已退役业务边界。
- `web-admin-antd5-deprecation-cleanup`: 将AntD当前API清理的现行package/全量单测验收更新为Bun/Vitest。
- `web-admin-antd5-modal-destroy-semantics`: 将AntD版本、完整质量与bundle对比的现行Yarn/Jest命令更新为Bun/Vitest。

## Impact

- 预计实现写集包括 `web-admin/package.json`、`web-admin/bun.lock`、Vitest config/setup/support、157 个现有测试文件及直接 toolchain contract tests、`.github/workflows/build.yml`、`web-admin/AGENTS.md`、必要 README/技术债基线，以及本 change 和受影响主规格。
- 精确候选版本为 `vitest@4.1.10`、`@vitest/coverage-v8@4.1.10`、`jsdom@28.1.0`、`@testing-library/jest-dom@6.9.1`；保持 Bun 1.3.14、Vite 8.1.4、React/ReactDOM 18.2、TypeScript 5.7.3 与 Playwright 1.61.1 不变，并将Node声明收窄为三者共同支持的 `^20.19.0 || ^22.12.0 || >=24.0.0`。
- 迁移只改变开发/CI 测试工具链，不改变 production source、用户可见行为、Admin Go/runtime、数据库、部署或 60 环境。
