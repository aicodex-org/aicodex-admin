## Context

本批迁移发生在 `web-admin` 已支持 `.js`、`.ts`、`.tsx` 共存之后。目标文件主要是基础入口、展示卡片、账号轻组件和少量独立轻文件，业务目标是机械迁移文件后缀和局部类型边界，而不是重构页面流程或共享组件体系。

并行 worker 正在迁移 backend wrappers、shared UI primitives、auth login buttons、Application/Syncer 相关页面和 Provider 配置，因此本 change 必须避开这些写集。`ManagementPage.js`、`App.js`、`Setting.js`、`BaseListPage.js`、`index.js`、`i18n.js`、`Conf.js`、`enterpriseNavigation.js`、`adminLoginRouting.js` 也保留给后续 shell/config 批次。

## Goals / Non-Goals

**Goals:**

- 迁移 P0 范围内的基础入口/公开轻页面、basic 展示组件和账号轻组件到 TSX。
- 对 props、state、路由参数、后端响应和轻量配置对象使用局部窄类型，保留 legacy JS 边界。
- 迁移触碰测试并运行 focused Jest、`yarn typecheck`、增量 TS gate 和 `yarn build`。
- 如果独立轻文件不牵出共享组件重构，则一并迁移；否则记录 deferred。

**Non-Goals:**

- 不迁移 backend wrappers、common/table/auth/provider/Application/Syncer 写集。
- 不迁移全局 shell/config 文件或修改路由注册、i18n 初始化、全局配置加载。
- 不改变页面行为、跳转、二维码/captcha/account sync API payload、dashboard 数据契约或 Tour 配置语义。
- 不新增依赖、不升级包、不做 UI 视觉重做或性能重构。

## Decisions

- **继续使用 extensionless import。** 文件后缀迁移后保留调用方既有无后缀导入路径，避免触碰 shell 或路由文件。
- **局部类型优先。** 目标文件依赖的后端 wrapper 和共享组件仍可能是 JS，本 change 使用组件内部 `type` / `interface` 描述实际消费字段，不把 legacy 边界扩展成全局宽松类型。
- **可并入文件按低风险判断。** `pricing/SingleCard`、`IframeEditor`、`ToolTable`、`TourConfig` 只有在不要求修改 common/table/backend/auth/provider 或全局配置时迁移；若类型洞牵出大范围 owner 边界，记录 deferred。
- **验证按源码层级表述。** 本 change 是机械 TS/TSX 迁移；若没有行为或视觉改动，浏览器 smoke 可不强制，验证结论只说明源码、测试、类型和构建层级。

## Risks / Trade-offs

- legacy JS 依赖会让部分 props 或响应字段无法完全精确类型化 -> 使用命名窄类型和局部断言，避免引入 `any` 扩散。
- 大批量 `git mv` 可能触发 import 路径或 Jest discovery 问题 -> 保持 extensionless import，focused Jest 使用能真实执行测试的匹配方式。
- 独立轻文件可能隐藏对 shared UI primitives 或 shell/config 的耦合 -> 遇到牵出边界时 deferred，不为迁移后缀扩大写集。
