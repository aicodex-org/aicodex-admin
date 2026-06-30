## Context

CRACO 会直接加载 `web-admin/craco.config.js`，`package.json` 的 `postbuild` 会直接执行 `node mv.js`。当前依赖中有 `typescript`，但没有直接声明 `ts-node`，因此把运行入口直接改成 `.ts` 会引入额外运行时假设。

## Decisions

- 保留 `craco.config.js` 和 `mv.js` 作为 runtime entry，避免改变 `yarn start`、`yarn build` 和 `postbuild` 的加载路径。
- 使用 `// @ts-check` 和 JSDoc 类型约束这两个 CommonJS 脚本。
- 新增专用 `tsconfig` 和 package script，只校验 build tooling 脚本，不扩大到 `web-admin/src`、Cypress 或 public scripts。
- `mv.js` 的路径计算、缺失 `build-temp` 时非零退出、删除既有 `build`、重命名为 `build` 的语义保持不变。

## Alternatives

- 直接改为 `.ts` 入口：拒绝。CRACO 和 `node mv.js` 当前不具备 TS runtime 加载链路，直接改后会破坏现有命令。
- TS 源生成 JS：暂不采用。两个脚本体量小，JSDoc + 专用 TypeScript check 能提供静态维护收益，同时避免引入生成链路和生成文件漂移风险。

## Risks

- JSDoc 类型约束不等同于完整 TS 源迁移；但它能覆盖当前 CommonJS runtime entry，并且不会改变构建工具链入口。
- 如果未来要进一步迁移成 TS 源生成 JS，应先为生成命令、产物一致性和 CI 验证建立明确约束。
