## Why

Web Admin 的 `Setting.parseObject` 在全仓没有调用方，却把 direct `eval` 带入生产构建并触发 Vite/Rolldown 安全告警。移除这段死代码并建立源码级防回退契约，可以消除不必要的运行时代码执行能力，同时保持既有 JSON 解析行为不变。

## What Changes

- 删除零调用的 `Setting.parseObject` 及其 direct `eval` 实现，不提供替代动态执行路径。
- 增加基于 TypeScript AST 的 focused 测试，阻止 production `src/**/*.ts(x)` 重新引入 direct `eval` 或 `new Function`。
- 为相邻且仍在使用的 `parseJson` 固定空串、合法 JSON 与非法 JSON 行为，证明删除不改变既有解析语义。
- 用生产构建验证 `[EVAL]` 告警消失，并将其它既有 build warning 与本 change 分开记录。

## Capabilities

### New Capabilities

- `web-admin-runtime-code-execution-safety`: 约束 Web Admin 生产 TypeScript 源码不得通过 direct `eval` 或 `Function` 构造器执行运行时字符串代码，并要求生产构建保持对应安全诊断为零。

### Modified Capabilities

- 无。

## Impact

- 生产源码：仅 `web-admin/src/Setting.tsx` 删除未使用导出。
- 测试：新增 runtime code execution safety focused 契约，并补充 `parseJson` 行为回归。
- 构建：不修改 Vite 配置、依赖或产物结构；预期只消除由 `Setting.parseObject` 产生的一条 direct-eval warning。
- 不影响 API、认证、Provider、路由、用户界面、`package.json`、`yarn.lock`、workflow 或共享环境。
