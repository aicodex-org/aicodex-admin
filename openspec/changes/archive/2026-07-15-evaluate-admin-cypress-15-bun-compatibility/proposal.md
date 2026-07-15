## Why

既有 Yarn→Bun 评估证明 Cypress 12.15.0 的 postinstall 与 Web3/ethers 深层依赖在 Bun 1.3.14 下无法形成完整依赖树。Cypress 15.17.0 起新增官方 Bun CLI 支持，因此需要独立验证升级到 15.18.1 是否真正解除安装阻断，而不是根据版本公告推断迁移可行。

## What Changes

- 审计 Cypress 12.15.0→15.18.1 对现有 19 个 E2E spec、配置、support、TypeScript、Node 24、Vite 8 和 `cypress-io/github-action@v5` 的兼容影响。
- 在短路径、空 `node_modules`、独立 cache 的临时副本中，使用 Bun 1.3.14 执行真实 lock generation 与 frozen lifecycle install，并检查 Cypress、Web3/ethers 关键依赖完整性。
- 只有取得有效 Bun 安装样本后，才继续执行 Cypress verify、Jest、typecheck、Vite/public scripts、19 个 E2E 与 CI action 兼容门禁。
- 记录至少 3 个有效、串行、隔离的 Bun 冷安装样本后再比较性能，并保留 Yarn control；失败样本不参与收益计算。
- 根据证据输出 `GO-CANDIDATE`、`NO-GO` 或 `BLOCKED/NEEDS_DECISION`，保持 release-candidate-only，不 archive、不合入 base/test。
- 不迁移 Playwright、Bun test 或其它业务依赖，不删除 E2E、不降低断言、不跳过 lifecycle，也不以双 lockfile 或 Yarn `node_modules` 伪造兼容。

## Capabilities

### New Capabilities

- `admin-cypress-bun-compatibility-evaluation`: 定义 Cypress 大版本升级及 Bun 安装解阻评估的隔离样本、质量门禁、性能与决策证据要求。

### Modified Capabilities

无。

## Impact

- 评估输入：`web-admin/package.json`、`web-admin/yarn.lock`、`web-admin/cypress.config.ts`、`web-admin/cypress/**`、现有 CI workflow 与前端质量脚本。
- 临时候选可调整 Cypress 版本、package guard 与 Bun orchestration，但只存在于隔离副本；若结论为 `NO-GO`，正式 workspace 只保留 OpenSpec 评估证据。
- 只有达到 `GO-CANDIDATE` 时，工作分支才可保留最小 Cypress 15 依赖/config/CI 调整；仍不 archive、不合入共享分支。
- 不改变后端 API、运行时配置、数据库、用户可见行为或测试环境数据。
