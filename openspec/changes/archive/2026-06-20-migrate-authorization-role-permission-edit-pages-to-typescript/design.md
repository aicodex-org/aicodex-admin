## Context

当前基线 `origin/hfl-test-base` 中，`RoleEditPage.js` 和 `PermissionEditPage.js` 仍为 class component。`RoleEditPage` 主要依赖 `RoleBackend`、组织列表和若干 shared selector；`PermissionEditPage` 还依赖 `ModelBackend`、`ApplicationBackend`、资源类型切换、用户/组/角色/域/资源/动作/效果选择、submitter/approver/approveTime/state 字段，以及普通用户只能修改自己提交 permission 的校验。

本 change 从 `origin/hfl-test-base` 独立启动，不依赖尚未合入 base 的角色/权限列表页 TSX release candidate。列表页、backend wrapper 和共享选择器仍可保持 legacy JS。

## Goals / Non-Goals

**Goals:**

- 将 `RoleEditPage` 和 `PermissionEditPage` 保守迁移为 `.tsx`。
- 使用局部类型描述 props、route params、state、role/permission record、organization/model/resource/user/group/role 选择项和 API response。
- 保持 `ManagementPage.js` 无后缀 import、`/roles/:organizationName/:roleName` 和 `/permissions/:organizationName/:permissionName` 路由、权限、文案、API 请求、保存删除 payload 和导航行为不变。
- 新增 `.test.tsx` focused tests，覆盖两个编辑页高价值行为和权限编辑校验分支。
- 通过增量 TypeScript gate、`yarn typecheck`、focused Jest/coverage 和 build/import 边界验证。

**Non-Goals:**

- 不迁移 `RoleListPage`、`PermissionListPage`、`AdapterListPage`、`AdapterEditPage`、`EnforcerListPage`、`EnforcerEditPage`、`PolicyTable` 或其它权限角色页面。
- 不迁移 `RoleBackend.js`、`PermissionBackend.js`、`ModelBackend.js`、`ApplicationBackend.js`、`OrganizationBackend.js`、`UserBackend.js`、`GroupBackend.js`、`BaseListPage.js`、`Setting.js` 或 `Conf.js`。
- 不改变角色/权限数据结构、审批状态语义、普通用户 submitter 校验、模型/资源选择语义、保存删除 payload、用户可见文案或路由语义。
- 不重写 class component 为 hooks，不 redesign UI，不升级 AntD API，不新增 UI 库。

## Decisions

1. **编辑页与测试同 change 迁移，backend wrapper 保持 JS。**
   - 编辑页依赖多个 legacy backend wrapper 和 selector。迁移这些共享依赖会牵出列表页、应用页面、其它组织账号页面和 Casbin 页面，超出本 change 范围。页面内使用局部类型描述当前消费的字段和 response shape。

2. **保留 class component 和现有 field update 模式。**
   - 继续使用当前 `updateRoleField`、`updatePermissionField`、`submitRoleEdit`、`submitPermissionEdit`、`deleteRole` 和 `deletePermission` 流程，只补类型和必要的窄断言，避免改变保存、取消、删除和路由跳转行为。

3. **权限编辑页优先保护校验和审批状态语义。**
   - `PermissionEditPage` 的风险集中在 users/roles、resources、actions、普通用户 submitter 限制和本地管理员审批状态切换。测试应覆盖这些用户可观察错误提示和 payload 边界。

4. **测试以用户可观察行为和 API 边界为准。**
   - focused tests mock legacy backend、model/resource/user/group/role 依赖和必要 shared selector，验证页面加载、字段更新、保存 payload、错误提示、状态切换和导航。测试不调用真实后端，不依赖真实权限环境或真实数据。

## Risks / Trade-offs

- **权限编辑页依赖面大。** Mitigation：只迁移两个编辑页，backend/shared selector 保持 JS；实施前 review 若发现必须实质修改共享组件则停止并回传。
- **普通用户权限校验容易回归。** Mitigation：新增 focused test 覆盖 submitter 与当前账号不一致时的 fail-fast 错误提示，确认不调用 update API。
- **模型和资源选择存在条件渲染。** Mitigation：测试覆盖模型加载、Application 资源加载、`Application`/`API` 资源类型的关键分支，构建验证覆盖 import 边界。
- **列表页 TSX release candidate 尚未合入 base。** Mitigation：本 change 不修改列表页，也不依赖列表页 TSX；后续合并时如主规格产生文本冲突，按各 change delta 顺序解决。

## Rollback

无数据库或后端迁移。若需要回滚，恢复两个编辑页为 `.js` 并移除对应 `.test.tsx` 与 OpenSpec 归档即可；路由、API 和数据无独立迁移状态。
