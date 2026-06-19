## Context

`Casbin模型` 页面当前由三个 legacy JS 文件组成：

- `ModelListPage.js` 继承 `BaseListPage`，通过 `ModelBackend.js` 读取、创建和删除 model，并跳转到 `/models/:owner/:name`。
- `ModelEditPage.js` 是 React class component，通过 `ModelBackend.js` 和 `OrganizationBackend.js` 加载 model 与组织列表，并用 `CasbinEditor` 编辑 `modelText`。
- `CasbinEditor.js` 是函数组件，提供 Basic 文本编辑和 Advanced iframe editor，并在切换 tab 时同步 iframe 中的 model text。

本 change 只做行为兼容 TS/TSX 迁移。`ModelBackend.js`、`OrganizationBackend.js`、`BaseListPage.js`、`IframeEditor.js` 和 `common/Editor.js` 仍是 legacy JS；迁移文件用局部接口描述实际使用字段，不扩大到共享 backend 类型化。

## Goals / Non-Goals

**Goals:**

- 将 `ModelListPage`、`ModelEditPage`、`CasbinEditor` 保守迁移为 `.tsx`。
- 使用局部类型描述 account、route props、history/location、model record、organization record、backend response、table columns 和 iframe editor ref。
- 保持 `ManagementPage.js` 无后缀 import、`/models` 与 `/models/:organizationName/:modelName` 路由、权限、文案、API 请求和保存语义不变。
- 新增 `.test.tsx` focused tests，覆盖列表页、编辑页和 editor 的高价值行为。
- 通过增量 TypeScript gate、`yarn typecheck`、focused Jest/coverage 和 build/import 边界验证。

**Non-Goals:**

- 不迁移 `RoleListPage`、`PermissionListPage`、`IdentityEvidenceChainPage`、`AdapterListPage`、`AdapterEditPage`、`EnforcerListPage`、`EnforcerEditPage`、`PolicyTable` 或其它权限角色页面。
- 不迁移 `ModelBackend.js`、`OrganizationBackend.js`、`BaseListPage.js`、`IframeEditor.js` 或 `common/Editor.js`。
- 不重写 class component 为 hooks，不修复旧生命周期，不 redesign UI，不改变文案/i18n key。
- 不新增 API，不改后端，不改 Casbin model 数据结构、权限模型、保存 payload 或内置对象只读语义。

## Decisions

1. **保守迁移三个页面文件，不迁移 backend。**
   - `ModelBackend.js` 和 `OrganizationBackend.js` 是共享 legacy API wrapper。本 change 只在迁移页面内定义 `ModelRecord`、`OrganizationRecord` 和 response 类型，避免把写集扩到后端 wrapper 或其它消费者。

2. **保留 class component 和生命周期。**
   - `ModelListPage` 继续继承 `BaseListPage`，`ModelEditPage` 继续保留当前加载顺序和 `UNSAFE_componentWillMount`。这能把行为变化压到最低；生命周期现代化不属于本 change。

3. **`CasbinEditor` 只补 props/ref/message 类型。**
   - Basic/Advanced tab、iframe ref 的 `getModelText` / `updateModelText` 方法和 `message` 同步逻辑保持原样。测试只验证 tab 同步和内置对象只读保护，不连接真实 `editor.casbin.org`。

4. **测试以可观察行为为边界。**
   - focused tests mock legacy backend、Setting、BaseListPage 依赖边界或 iframe/editor 子组件，验证用户可见列表/编辑/同步行为。测试不调用真实 API，不依赖真实 Casbin model 服务。

## Risks / Trade-offs

- **legacy JS 依赖缺少类型。** Mitigation：用局部类型和窄范围断言包住边界，不引入 unexplained broad `any`。
- **`BaseListPage` 是 JS class，继承类型有限。** Mitigation：只补子类所需 state/props 和对继承方法的局部声明/断言，不迁移基类。
- **iframe editor 真实外部页面不适合单测。** Mitigation：用 mock ref/消息同步测试本组件逻辑，build/typecheck 覆盖 import 边界。
- **权限角色菜单其它页面仍是 JS。** Mitigation：这是后续 change，不作为本 change blocker；本 change 明确只迁移 Casbin 模型页面。

## Rollback

无数据库或后端迁移。若需要回滚，恢复三个页面文件为 `.js` 并移除对应 `.test.tsx` 与 OpenSpec 归档即可；路由和 API 无独立迁移状态。
