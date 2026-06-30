## Verification

- `openspec validate migrate-admin-backend-wrappers-to-typescript --strict`: 通过。
- `git diff --check`: 通过。
- `web-admin> yarn test src/backend --watchAll=false --runInBand`: 通过，11 个 suites / 45 个 tests。
- `web-admin> yarn typecheck`: 通过。
- `web-admin> node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`: 通过，无输出。
- `web-admin> yarn build`: 通过。
- `web-admin> yarn test src/backend --watchAll=false --runInBand --coverage --collectCoverageFrom="src/backend/**/*.{ts,tsx}" --coverageReporters=text-summary`: 测试通过；coverage summary 为 statements 48.3%、branches 30.49%、functions 29.87%、lines 48.9%。

backend wrapper 目录 coverage 仍低于 85%，原因是大多数迁移文件是 legacy 薄 fetch wrapper，历史上没有逐 wrapper 单测覆盖。本 change 不为覆盖率数字批量补低价值 mock 测试；本轮使用 backend focused suites、typecheck、增量 TS gate 和 build 覆盖本次迁移要求的契约。

未运行浏览器 smoke：本 change 只迁移 backend API wrapper 和 backend tests，从 JavaScript 迁到 TypeScript，不包含预期的视觉、路由或交互行为变更。
