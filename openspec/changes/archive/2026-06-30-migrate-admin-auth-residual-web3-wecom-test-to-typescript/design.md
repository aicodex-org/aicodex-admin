## Context

前序 auth support、auth login buttons 和 auth core flow 已完成大部分 `web-admin/src/auth` TypeScript 迁移。本批只收尾剩余的 `Web3Auth.js` 和 `WeComLoginPanel.test.js`，并避开 common/table/provider/backend/root shell 等并行写集。

`Web3Auth` 依赖第三方 Web3 SDK、wallet provider 和浏览器 `window` 注入对象；`WeComLoginPanel.test` 依赖 Jest mock、React Testing Library 和 auth-local 组件导入。迁移目标是补局部类型边界，不重写登录流程。

## Goals / Non-Goals

**Goals:**

- 将不含 JSX 的 `Web3Auth` 迁移到 TS，并用 auth-local 窄类型封住 SDK、provider、回调和 props。
- 将 `WeComLoginPanel.test` 迁移到 `.test.tsx`，保持真实执行 WeCom panel suite。
- 保持 extensionless import、默认导出和现有测试发现路径兼容。

**Non-Goals:**

- 不修改 Web3 登录、WeCom panel intent/polling/MFA 行为、认证 URL、回调参数、token/cookie 处理或后端 API 契约。
- 不迁移或修改 `common/*`、`table/*`、provider、backend、Application/Syncer、root shell/config、entry/basic/account/pricing 等写集。
- 不新增依赖、不调整 TypeScript/Jest/CRACO 配置。

## Decisions

- **按 JSX 判断文件类型。** `Web3Auth` 如包含 React JSX，迁移为 `.tsx`；不拆分 helper 到新文件，避免扩大写集。
- **局部窄类型优先。** 对 Web3 SDK、wallet provider、`window.ethereum` 或类似注入对象使用本文件内 interface/type；无法稳定建模的第三方动态值使用命名 `unknown`/窄 record 边界。
- **测试只迁移后缀和类型。** `WeComLoginPanel.test` 继续验证既有可观察行为和 mock 调用，不为了迁移重写测试架构。

## Risks / Trade-offs

- Web3 第三方 SDK 类型可能不完整 -> 仅描述当前代码消费字段，避免引入全局声明或新依赖。
- 测试迁移可能触发 Jest hoist/TS mock 类型问题 -> 使用本地 typed mock wrapper，确保 suite 真实执行且测试数量大于 0。
- 登录链路敏感 -> 若迁移需要改变授权 URL、SDK 调用顺序、polling/MFA 或 token/cookie 语义，则停止在 RC/blocked，不做 self-closeout。
