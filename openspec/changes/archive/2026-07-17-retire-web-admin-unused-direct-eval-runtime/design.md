## Context

最新基线中，`web-admin/src/Setting.tsx` 导出 `parseObject(s)`，其实现通过 direct `eval` 把字符串当作 JavaScript 对象表达式执行。限定源码扩展名的全仓搜索只找到该定义，没有任何调用方；production `src/**/*.ts(x)` 中也只有这一处 direct `eval`，且没有 `new Function`。未修改基线的 `yarn build` 成功，但稳定输出一条 Rolldown `[EVAL]` 安全告警。

`parseJson(s)` 紧邻该函数但使用标准 `JSON.parse`，是仍需保留的独立解析边界。本 change 只拥有 `Setting.tsx`、直接相关 focused 测试和 OpenSpec，不拥有 Vite 配置、依赖、workflow、其它业务页或技术债路线文档。

## Goals / Non-Goals

**Goals:**

- 删除零调用的 `parseObject`，使 production TypeScript/TSX 源码的 direct `eval` 计数归零。
- 建立不依赖 console suppression 的源码级防回退契约，同时拦截等价的 `new Function` 字符串执行入口。
- 固定 `parseJson` 的空串、合法 JSON 与非法 JSON 行为，证明相邻删除不改变支持中的解析语义。
- 证明生产构建不再输出 `[EVAL]`，并把无关既有 warning 单独分类。

**Non-Goals:**

- 不拆分或迁移大型 `Setting.tsx`，不清理其它历史导出。
- 不新增 JSON5、宽松对象字面量解析器或任何替代动态执行。
- 不实施全局 CSP header、nonce、Trusted Types 或 bundle 分包。
- 不修改依赖、lockfile、Vite/Jest/CI 配置、其它业务页或共享环境。

## Decisions

### 1. 直接删除死导出，不提供兼容 shim

选择删除 `parseObject`，因为源码调用盘点只命中定义，且生产构建告警与它一一对应。保留一个抛错或返回 `null` 的同名 shim 会继续维护不存在的契约，也不能提供用户价值。

备选方案：

- 用 `JSON.parse` 替换 `eval`：会把原本接受 JavaScript 对象字面量的未使用函数悄然改成新语义，制造无调用方却需要维护的 API，拒绝。
- 引入 JSON5：会新增依赖和运行时解析面，超出“删除零调用死代码”的目标，拒绝。
- 在 build 配置中 suppress `[EVAL]`：只隐藏诊断而不移除风险，拒绝。

### 2. 用 TypeScript AST 建立 production 源码契约

新增 focused Jest 测试，递归读取 `web-admin/src` 下 production `.ts/.tsx`，排除测试和声明文件，用仓库既有 `typescript` parser 识别：

- callee 为 identifier `eval` 的 direct call；
- callee或constructor为identifier `Function` 的 `Function(...)` / `new Function(...)`。

AST 检查比文本正则更能避免注释、字符串和属性名误报，也不需要新增依赖。测试输出只列仓库相对路径与行列，不读取或回显运行态数据。

### 3. 将 build warning 作为独立验收层级

源码契约负责快速防回退，`yarn build` 负责证明真实 Vite/Rolldown production pipeline 不再发出 `[EVAL]`。测试不得 mock 或过滤 console 来制造通过；build 仍出现 direct-eval warning 时 change 不可归档。`fs` browser external 与 chunk-size warning 属于既有第三方/分包边界，本 change 只分类记录，不修改配置。

### 4. 用相邻行为测试证明兼容性

在现有 `Setting.test.tsx` 中直接调用 `parseJson`，覆盖空串返回 `null`、合法 JSON 返回解析值、非法 JSON 继续抛 `SyntaxError`。不为已删除的 `parseObject` 保留行为测试，因为它没有支持中的调用契约。

## Risks / Trade-offs

- [风险] 动态字符串拼装可能逃过简单文本检查 → 使用 TypeScript AST 识别 direct call/new expression，并由真实 production build 作为第二层验证。
- [风险] 仓库外消费者理论上可能导入 `parseObject` → Web Admin 是内部单体构建，当前全仓源码和测试无引用；删除前后完整 typecheck、Jest 与 build 将验证静态消费者边界。
- [取舍] 不治理依赖包内部的动态执行 → 本 capability 只约束项目自有 production TypeScript/TSX；第三方依赖由供应链和构建诊断另行治理。
- [取舍] 删除行无法形成传统 changed-line coverage 分母 → 记录删除后 production changed executable statements 为 0，并对相邻保留的 `parseJson` 三个行为分支提供 focused 回归；不得用全文件低相关覆盖率替代该口径。

## Migration Plan

1. 先运行新源码契约，在未修改生产代码时确认因 `Setting.tsx` direct `eval` 失败。
2. 删除 `parseObject`，重跑契约与 `Setting` focused 测试取得 GREEN。
3. 执行完整静态、测试、构建和最小浏览器/build smoke；确认 `[EVAL]` 消失。
4. 若发现真实调用或行为回归，停止 closeout并恢复该 change 自有提交；不通过引入替代动态解析绕过。

## Open Questions

- 无。当前调用盘点、写集和验收边界足以实施最小删除。
