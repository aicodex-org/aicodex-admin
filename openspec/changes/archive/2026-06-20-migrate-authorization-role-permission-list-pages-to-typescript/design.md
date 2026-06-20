## Context

`角色` 和 `权限` 列表页当前由两个 legacy JS 文件承载：

- `RoleListPage.js` 继承 `BaseListPage`，通过 `RoleBackend.js` 读取、创建和删除 role，并支持 `.xlsx` 模板下载和上传预览。
- `PermissionListPage.js` 继承 `BaseListPage`，通过 `PermissionBackend.js` 读取、创建和删除 permission；本地管理员使用全量列表接口，普通提交者使用 submitter 列表接口；页面同样支持 `.xlsx` 模板下载和上传预览。

本 change 只做行为兼容 TSX 迁移。`RoleBackend.js`、`PermissionBackend.js`、`BaseListPage.js`、`Setting.js` 和 `Conf.js` 仍保持 legacy JS；迁移文件使用局部接口描述实际使用字段，不扩大到共享 backend 类型化。

## Goals / Non-Goals

**Goals:**

- 将 `RoleListPage` 和 `PermissionListPage` 保守迁移为 `.tsx`。
- 使用局部类型描述 account、history、pagination、fetch params、role/permission record、上传预览行、表格列和 backend response。
- 保持 `ManagementPage.js` 无后缀 import、`/roles` 与 `/permissions` 路由、权限、文案、API 请求、上传 endpoint 和列表操作行为不变。
- 新增 `.test.tsx` focused tests，覆盖两个列表页的高价值行为。
- 通过增量 TypeScript gate、`yarn typecheck`、focused Jest/coverage 和 build/import 边界验证。

**Non-Goals:**

- 不迁移 `RoleEditPage`、`PermissionEditPage`、`AdapterListPage`、`AdapterEditPage`、`EnforcerListPage`、`EnforcerEditPage`、`PolicyTable` 或其它权限角色页面。
- 不迁移 `RoleBackend.js`、`PermissionBackend.js`、`BaseListPage.js`、`Setting.js` 或 `Conf.js`。
- 不改变角色/权限数据结构、权限模型、审批状态、上传 payload、上传 endpoint、列表文案、表格列或路由语义。
- 不重写 class component 为 hooks，不 redesign UI，不升级 AntD API，不新增 UI 库。

## Decisions

1. **列表页和测试同 change 迁移，backend 保持 JS。**
   - 这两个列表页依赖共享 legacy backend wrapper。迁移 backend 会牵出编辑页和其它消费者，超出本 change 范围。页面内使用局部类型包住当前接口返回和记录字段。

2. **保留 `BaseListPage` 子类模式。**
   - 继续复用现有 `fetch`、`handleTableChange`、`getColumnSearchProps` 和分页模式，只补子类 props/state 和表格列类型，避免改变分页筛选排序行为。

3. **上传逻辑只补类型，不重写交互。**
   - `.xlsx` 读取、预览 Modal、FormData 提交和成功/失败提示保持原样。测试用 mock FileReader/XLSX/fetch 覆盖本地逻辑，不调用真实上传 endpoint。

4. **测试以用户可观察行为和 API 边界为准。**
   - focused tests mock legacy backend、Setting、xlsx 和必要的子组件，验证表格列链接、工具栏、新增/删除、错误提示、上传预览和 fetch 参数。测试不依赖真实后端或真实文件系统上传。

## Risks / Trade-offs

- **legacy JS 依赖缺少类型。** Mitigation：使用局部类型、窄范围断言和明确 `unknown` 收窄，不引入宽泛未解释 `any`。
- **上传预览分支依赖浏览器 `FileReader`。** Mitigation：在测试中提供最小 mock，验证页面状态和 Modal 行为，不扩大到真实文件解析。
- **权限列表数据列较多。** Mitigation：只类型化当前使用字段，避免为了完整 DTO 牵出编辑页和后端 wrapper。
- **角色/权限编辑页仍是 JS。** Mitigation：这是后续独立 change，不作为本 change blocker。

## Rollback

无数据库或后端迁移。若需要回滚，恢复两个列表页为 `.js` 并移除对应 `.test.tsx` 与 OpenSpec 归档即可；路由、API 和数据无独立迁移状态。
