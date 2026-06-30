## Context

`web-admin/public` 中的文件由 CRA build 原样复制到最终 `build/`。`AuthCallbackHandler.js` 和 `ProviderHintRedirect.js` 是非模块 raw scripts，通过 IIFE 暴露 `window.CasdoorAuthCallback.run()` 和 `window.CasdoorProviderHintRedirect.run()`，页面仍按 `.js` 路径加载。

本 change 不能把 served 文件直接改成 `.ts`，也不能改登录、callback、storage 或 redirect 行为。实现目标是让 `.js` 成为由 TS 源生成的产物，并通过验证证明生成链路稳定。

## Goals / Non-Goals

**Goals:**

- 新增 TS 源目录承载两个 public auth scripts。
- 新增专用 tsconfig，让 `tsc` 能检查并生成 public `.js`。
- 增加 npm script，支持显式生成并在 build 前保证 public `.js` 与 TS 源一致。
- 增加轻量 smoke，使用脱敏假参数证明两个生成后的 `.js` 可加载且核心全局入口无语法错误。

**Non-Goals:**

- 不改变 served 文件名或路径。
- 不重写登录/OIDC/OAuth/SAML/CAS/WeCom/Web3 callback 语义。
- 不迁移 Cypress、src auth、table/common/provider/backend/root shell 等写集。
- 不新增生产依赖，不调整 CRACO 或 build output 目录。

## Decisions

- **TS 源和 public JS 分离。** TS 源放在 `web-admin/public-scripts/`，生成输出仍写入 `web-admin/public/`，保持 CRA public copy 行为不变。
- **专用 `tsconfig.public-scripts.json`。** 使用 `target ES2017`、DOM lib、非模块输出，保留既有 public raw scripts 的 async 运行形态，避免影响主 `tsconfig.json` 和 `src` typecheck。
- **提交生成 JS。** public `.js` 是运行时 served 文件，继续入库；验证通过重新生成确认其与 TS 源一致。
- **最小 smoke。** 使用 Node `vm` 和 jsdom-like mock 对象加载两个 public `.js`，只验证脚本语法、全局入口和脱敏 redirect/fallback 路径，不使用真实 token 或 raw callback payload。

## Risks / Trade-offs

- TS 编译可能调整格式但不应改变运行语义 -> 迁移时保持 IIFE、函数名和分支结构，生成后用 focused smoke 和 build 验证。
- public scripts 不经过 webpack -> 生成输出必须是自包含 raw script，不依赖 import/export 或 bundler polyfill。
- 登录链路敏感 -> 若 TS 化需要改变 callback 参数、storage key、fetch path 或 redirect 构造，则停止在 RC/blocker，不做行为改写。
