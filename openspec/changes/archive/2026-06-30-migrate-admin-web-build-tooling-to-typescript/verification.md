## 验证记录

### 范围边界

- 本 change 只覆盖 `web-admin/craco.config.js` 和 `web-admin/mv.js` 的 typed maintenance，以及配套的 `web-admin/package.json` 校验脚本、`web-admin/tsconfig.build-tooling.json` 和局部声明文件。
- 未触碰 `web-admin/src/*`、`web-admin/public/*`、`web-admin/cypress/*`、认证、Provider、Application、Syncer、Organization 编辑页或根壳层运行时代码。
- CRACO 和 postbuild 运行入口仍为现有 JavaScript 文件：`craco.config.js` 与 `node mv.js`。本 change 未引入 `ts-node` 或新的生产依赖。

### RC 验证

RC commit: `c33f9af48920da37c54d29c2f00e16914d773bc2`

- `openspec validate migrate-admin-web-build-tooling-to-typescript --strict`: 通过。
- `git diff --check origin/hfl-test-base..HEAD`: 通过。
- `yarn typecheck:build-tooling`: 通过，覆盖 `craco.config.js` 和 `mv.js`。
- `yarn typecheck`: 通过。
- `node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`: 在 `web-admin/` 下运行，通过。
- `yarn build`: 通过；CRACO 成功写入 `build-temp`，随后 `postbuild` 执行 `node mv.js`。

### Postbuild 证据

- `yarn build` 输出包含：`Renamed "...\\web-admin\\build-temp" to "...\\web-admin\\build" successfully.`
- 构建后检查到 `build=True`、`build-temp=False`，符合 `build-temp -> build` 语义。
- 验证后已删除本地 `web-admin/build`，再次检查 `build=False`、`build-temp=False`，无构建产物入库。

### 本地依赖与缓存说明

- 当前 retained worktree 初始没有可用 `web-admin/node_modules`，首次 `yarn install --frozen-lockfile` 和 `yarn install --frozen-lockfile --ignore-scripts --prefer-offline --network-timeout 600000` 均长时间停留在 linking 阶段，未生成完整 `.bin` shim。
- 为完成真实 `yarn` 脚本验证，RC 阶段临时将 `web-admin/node_modules` 建为本地 junction，指向同版本 Admin workspace 已完整安装的 `web-admin/node_modules`。该目录仅用于本地验证，未入库。
- RC 验证结束后已删除当前 worktree 的 `web-admin/node_modules` junction；最终工作区不保留 `node_modules`、`build` 或 `build-temp`。

### Final closeout 验证

OpenSpec archive 后基于最终内容重跑以下门禁：

- `openspec validate --changes --strict`: 通过，3 个 active changes 通过。
- `openspec validate --specs --strict`: 通过，30 个 specs 通过。
- `git diff --check origin/hfl-test-base...HEAD`: 通过。
- `yarn typecheck:build-tooling`: 通过，覆盖 `craco.config.js` 和 `mv.js`。
- `yarn typecheck`: 通过。
- `node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`: 在 `web-admin/` 下运行，通过。
- `yarn build`: 通过；只出现既有 Node `fs.F_OK` deprecation、Browserslist 和 bundle-size warning。
- postbuild 轻量验证：构建后 `build=True`、`build-temp=False`；清理后 `build=False`、`build-temp=False`。

### 覆盖率

N/A。本 change 修改的是 Web Admin 构建工具入口和静态校验配置，不新增用户可见运行时业务逻辑；回归保护由 build tooling TypeScript 静态校验、全量 typecheck、增量 TS gate、生产构建和 postbuild rename smoke 覆盖。

### 剩余风险

- `craco.config.js` 和 `mv.js` 保持 CommonJS JavaScript runtime entry；类型化维护采用 `// @ts-check`、JSDoc 和专用 TypeScript check，而不是 TS 源生成 JS。
- 如果未来要进一步迁移为 TS 源生成 JS，需要先建立生成命令、产物一致性检查和 CI 约束。
