## Context

治理规则迁移路线已完成评估，并将 RuleList、表达式表格、CompoundRule、RuleEditPage 拆成独立 change。RuleList 迁移已经形成 release candidate；本 change 接续处理 `web-admin/src/table/` 下四个治理规则表达式表格：

- `WafRuleTable.js`：WAF/ModSecurity 表达式，包含三条默认规则，支持 restore、添加、删除、上下移动和 name/value 编辑。
- `IpRuleTable.js`：IP 列表表达式，包含 loopback 和 LAN CIDR 默认规则，支持 `is in` / `is not in` 操作符、tags 输入、逗号拼接、添加、删除、上下移动和 restore。
- `UaRuleTable.js`：User-Agent 表达式，默认值来自 `window.navigator.userAgent`，支持五类操作符、添加、删除、上下移动、restore，并在 blur 时压缩空白。
- `IpRateRuleTable.js`：IP Rate Limiting 表达式，仅支持 restore 和三个字段编辑，rate / block duration 使用 `InputNumber`，字段回写保持字符串。

这些表格当前由后续待迁移的 `RuleEditPage.js` 调用。本 change 只迁移表格组件本身和对应测试，不改变调用方、后端 wrapper 或 Rule API payload。

## Goals / Non-Goals

**Goals:**

- 将四个表达式表格从 `.js` 迁移为 `.tsx`，保持默认导出、无后缀 import 解析和现有调用方兼容。
- 使用局部类型描述规则行、props、state、字段 key、表格列和 AntD 输入回调，避免无解释 `any`。
- 用 `.test.tsx` 覆盖四个表格的用户可观察行为和关键数据回写：默认规则、restore、添加、删除、上下移动、字段更新、IP tags 拼接、UA blur trim、IP rate number/string 转换。
- 保持 UI、i18n key、按钮、Tooltip、默认规则内容、row shape、原地 table 更新语义和 `onUpdateTable(table)` 回调不变。

**Non-Goals:**

- 不迁移 `RuleEditPage.js`、`CompoundRule.js`、`RuleBackend.js` 或共享 Rule API 类型模型。
- 不修改治理规则保存、删除、表达式语义、status code、reason、verbose mode、Gateway projection publish、权限、后端接口或数据库。
- 不重写 class component 为 hooks，不引入不可变数据重构，不做视觉 redesign。
- 不触碰 MCP Server、MCP Store、入口配置、站点范围、应用接入、组织账号或权限角色页面。
- 不修改 `package.json`、lockfile、`tsconfig.json` 或 TypeScript 基建。

## Decisions

1. **保留 class component 和原地更新语义。**
   - 理由：四个表格当前通过传入的 `table` 数组原地修改后回调，RuleEditPage 依赖这个低层表达式 shape。本 change 目标是行为兼容迁移，先不把它改成不可变更新。
   - 替代方案：重写为函数组件并统一 immutable update。该方案会扩大生命周期、引用语义和测试范围，留给后续行为重构单独评估。

2. **规则行类型保持最小三字段结构。**
   - 理由：四个表格都围绕 `{name, operator, value}` 工作，差异体现在默认值、操作符集合和 value 归一化。局部 `RuleExpressionRow` 类型足以表达本 change 需要的契约。
   - 替代方案：新增共享 Rule expression 类型模型。该方案会牵出 RuleEditPage、CompoundRule 和 RuleBackend 边界，不适合本次小步迁移。

3. **测试优先覆盖行为不变量。**
   - 理由：表达式表格最容易回归的是默认规则、行顺序、字段回写和特殊归一化。测试应通过渲染组件并触发按钮/输入，验证 `onUpdateTable` 收到的 table，而不是只断言组件内部方法被调用。
   - 替代方案：只通过快照或 mock 调用次数覆盖。该方案对迁移风险价值低，不作为本 change 的主要测试证据。

4. **导入边界保持 extensionless 兼容。**
   - 理由：RuleEditPage 当前通过无后缀路径引用表格组件，React Scripts/CRACO 已支持 JS/TSX 共存解析。本 change 删除 `.js` 后保留同名 `.tsx` 默认导出即可。

## Risks / Trade-offs

- [Risk] AntD v5 的 `Table`、`Select`、`InputNumber` 类型比 legacy JS 更严格，可能暴露 handler 参数或列定义类型不匹配。→ 使用局部类型、`ColumnsType<RuleExpressionRow>` 和窄化回调参数做最小适配，不修改 UI 行为。
- [Risk] IP 表格维护 `state.options` 并在上下移动时同步 swap，测试若只看 DOM 可能漏掉回写行为。→ 测试直接校验移动后 `onUpdateTable` 的行顺序，并保留 options 同步逻辑。
- [Risk] UA 默认规则依赖 `window.navigator.userAgent`，在 Jest 环境中值可能与浏览器不同。→ 测试只校验默认规则使用当前 `window.navigator.userAgent`，不写死真实 UA。
- [Risk] IP Rate 的 `InputNumber` 可能传入 `null`，旧代码会 `String(value)`。→ 类型允许 `string | number | null`，实现继续保留字符串化行为。

## Migration Plan

1. 先添加 `.test.tsx` 聚焦测试并运行，确认在 `.js` 仍存在、`.tsx` 不存在的迁移门禁测试按预期失败。
2. 将四个 `.js` 文件迁移为 `.tsx`，补充局部类型和最小 AntD 类型适配。
3. 运行聚焦 Jest/coverage、增量 TypeScript gate、`yarn typecheck` 和必要 build。
4. 更新 `tasks.md` 与 `verification.md`，交付 release candidate；若没有新的 `self-closeout=true` 授权，不 archive/merge `hfl-test-base`。

## Open Questions

无。若迁移过程中发现必须修改 `RuleEditPage`、`CompoundRule`、`RuleBackend.js` 或共享 Rule API 类型模型，停止并回传需要主控决策。
