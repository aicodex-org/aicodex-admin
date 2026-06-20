## Context

`LLM AI/Gateway` 菜单已经完成 AI Agent 入口和入口配置页面的 TSX 迁移，MCP Server 当前存在独立 release candidate。站点范围页面仍由 `SiteListPage.js`、`SiteEditPage.js` 承载，其中 `SiteEditPage` 直接依赖 `table/RuleTable.js` 管理站点绑定的规则列表。治理规则编辑器则由 `RuleEditPage.js` 和多个规则表达式表格组件承载，耦合更深，应与站点范围分开迁移。

当前 change 只迁移站点范围页面及其直接依赖的规则选择表格，保持 JS/TS 共存和现有路由导入语义，不触碰后端 wrapper、规则治理编辑器、MCP Store、MCP Server 或应用接入页面。

## Goals / Non-Goals

**Goals:**

- 将 `SiteListPage`、`SiteEditPage` 和 `RuleTable` 迁移为 TSX，并补充局部类型描述 props、route params、state、站点记录、规则记录、表格行和 API response。
- 保持 `/sites` 和 `/sites/:organizationName/:siteName` 的路由、权限、接口、文案、表格列、字段编辑、保存、删除和错误提示行为不变。
- 新增 `.test.tsx` 聚焦测试，并用 changed-file coverage 证明迁移文件达到覆盖率门槛。
- 继续遵循增量 TypeScript：不迁移无关 JS，不改 `package.json`、lockfile、`tsconfig` 或后端接口。

**Non-Goals:**

- 不迁移 `RuleListPage`、`RuleEditPage`、`CompoundRule`、`WafRuleTable`、`IpRuleTable`、`UaRuleTable`、`IpRateRuleTable`。
- 不迁移 `SiteBackend.js`、`RuleBackend.js`、`ProviderBackend.js`、`ApplicationBackend.js`、`CertBackend.js` 或 `OrganizationBackend.js`。
- 不修改站点、规则、证书、应用或 provider 的后端 API path、payload shape、权限、保存/删除语义。
- 不触碰 Gateway projection publish、认证/OIDC、应用接入、组织账号、权限角色、MCP Store 或 MCP Server 其它页面。

## Decisions

1. **把 `RuleTable` 纳入站点范围 change。**
   - 原因：`SiteEditPage` 的规则字段 UI 直接依赖 `RuleTable`，如果页面 TSX 迁移但表格保持 JS，`site.rules` 与 `sources` 的关键边界只能落到弱类型 interop。
   - 取舍：这会比只迁移两个页面多一个组件，但范围仍小于治理规则编辑器，不会牵出规则表达式表格。

2. **保留 class component 和生命周期结构。**
   - 原因：现有页面继承或沿用 legacy class component 模式，迁移目标是行为兼容而不是 React 重写。
   - 取舍：不会借机把 `UNSAFE_componentWillMount`、原地 state 修改或表格方法改写为 hooks；这些可在后续行为重构 change 中单独评估。

3. **用局部类型而不是先迁移 backend wrapper。**
   - 原因：`SiteEditPage` 调用多个 legacy JS backend wrapper。迁移 wrapper 会扩展到证书、应用、provider 和组织账号边界，超出站点范围页面迁移目标。
   - 取舍：页面会通过本地 response/type alias 描述所需字段，API wrapper 仍保持 JS。

4. **测试聚焦用户可观察行为。**
   - 原因：当前没有 `Site*` 或 `RuleTable*` 测试，迁移需要补回归保护；测试应覆盖列表渲染、增删、编辑加载/保存和规则表格回写，而不是只断言 mock 调用次数。
   - 取舍：不做浏览器运行态 smoke，除非实现过程中发现路由/import/build-time 行为无法由 Jest、typecheck 和 build 证明。

## Risks / Trade-offs

- 站点编辑页直接修改 `this.state.site` → 迁移时保留行为，并通过测试覆盖字段编辑和保存 payload，避免顺手不可变重构引入差异。
- `RuleTable` 把 `owner/name` 字符串数组转换成表格行 → 用明确类型覆盖转换，测试添加、删除、上下移动和选择规则的回写结果。
- 站点页面依赖多个 legacy backend wrapper → 本 change 只为页面需要的响应字段建局部类型，避免扩大到应用接入、证书或 provider 路线。
- 当前 MCP Server RC 未收口 → 本 change 从 `origin/hfl-test-base` 独立分支创建；后续如 base 前进，需要 rebase 并重跑关键验证。

## Migration Plan

1. 完成 OpenSpec artifacts 和实施前 review。
2. 先补 `.test.tsx` 聚焦测试，确认迁移前目标行为由测试表达。
3. 将 `RuleTable.js` 迁移为 `RuleTable.tsx`，保持 props 和回写行为。
4. 将 `SiteListPage.js`、`SiteEditPage.js` 迁移为 TSX，更新必要局部类型，不改 UI 和 API 语义。
5. 运行增量 TS gate、typecheck、focused Jest、changed-file coverage，必要时运行 `yarn build`。
6. 完成归档前 review 后再根据 closeout 授权决定 archive/合入。

## Open Questions

- 无。当前 change 边界可由既有页面依赖和路线评估收口。
