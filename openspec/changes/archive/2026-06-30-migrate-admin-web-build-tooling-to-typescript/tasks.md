## 1. OpenSpec

- [x] 1.1 创建 `migrate-admin-web-build-tooling-to-typescript` proposal、design、tasks 和 `web-admin-incremental-typescript` spec delta。
- [x] 1.2 运行 `openspec validate migrate-admin-web-build-tooling-to-typescript --strict`。

## 2. Build tooling typing

- [x] 2.1 调查 `web-admin` 依赖和 CRACO/postbuild 入口，确认不能直接假设 TS runtime。
- [x] 2.2 为 `web-admin/craco.config.js` 增加 `// @ts-check` / JSDoc 类型约束，保持 dev proxy、Less、webpack output、fallback 和 source-map warning ignore 语义不变。
- [x] 2.3 为 `web-admin/mv.js` 增加 `// @ts-check` / JSDoc 类型约束，保持 `build-temp -> build` 和失败非零退出语义不变。
- [x] 2.4 新增并运行专用 build tooling TypeScript 静态校验命令，覆盖 `craco.config.js` 和 `mv.js`。

## 3. Validation

- [x] 3.1 运行 `git diff --check origin/hfl-test-base..HEAD`。
- [x] 3.2 运行 `yarn typecheck`。
- [x] 3.3 运行 `node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`。
- [x] 3.4 运行 `yarn build`，证明 CRACO config 和 postbuild 仍可执行。
- [x] 3.5 执行 postbuild 轻量验证，确认 `build-temp` 会移动/重命名为 `build`，并清理本地验证产物。

## 4. Release candidate

- [x] 4.1 提交并推送 `hfl-test/migrate-admin-web-build-tooling-to-typescript` 工作分支。
- [x] 4.2 保持 OpenSpec active，不 archive、不合入 `hfl-test-base`、不删除工作分支，并回传 RC 结果。
