## Context

`UserEditPage.tsx` 已是 TSX，但仍保留旧长表单结构：`Card` 标题内有保存按钮，`render()` 末尾又渲染一组重复保存按钮；账号字段分组由组织 `accountItems.tab` 与 `accountMenu` 决定，横向时在 Card 内部渲染 card-style tabs，纵向时渲染内部 `Sider/Menu`。这与当前组织编辑页和群组编辑页已经稳定的单一编辑壳不一致。

本次参照两类现有样板：

- `GroupEditPage.tsx`：顶部返回路径、对象标题、dirty 状态、滚动正文、底部固定操作栏、提交中防重复。
- `OrganizationEditPage.tsx` 与大型编辑页迁移指南：大型编辑页使用 page-level tabs、hash 恢复当前 tab、取消/返回保护未保存修改。

用户页字段多且由组织配置驱动，但页面顶层导航应像组织编辑页一样稳定。组织 `accountItems` 继续控制字段可见性、权限和校验，用户页顶层 tabs 固定为业务分区；群组页代表单正文编辑，但与组织、用户共用同一套头部、滚动正文和底部动作栏。

## Goals / Non-Goals

**Goals:**

- 用户编辑页只保留一个主要编辑壳，不再同时出现 Card 标题保存按钮和页面底部重复按钮。
- 顶部固定区域提供返回、组织账号路径、用户编辑标题和未保存状态。
- 底部固定操作栏提供 `取消`、`保存`、`保存并返回`，保存中防重复提交。
- 用户页使用固定业务 tabs 呈现：基础、身份认证、权限管理、安全、第三方登录、记录；active key 写入 `window.location.hash`，刷新后可恢复。
- 组织、用户、群组编辑页共用 `LargeEditShell`，正文由调用方决定是否传入 tabs。
- 任意字段、表格、第三方解绑、MFA、同意授权等既有 handler 继续更新同一 `user` 状态和既有后端契约。
- 返回/取消在 dirty 时弹出确认；新增模式确认取消后继续调用 `deleteUser()` 删除临时用户。

**Non-Goals:**

- 不改变 `accountItems` 配置模型、字段可见性规则、`viewRule/modifyRule` 权限语义或字段 tab 配置语义。
- 不新增必填字段校验；用户页目前由 `accountItems.regex` 与后端保存错误承担字段校验，本次不重定义账号字段必填规则。
- 不改 `UserBackend.updateUser`、`deleteUser`、MFA、OAuth/SAML、交易记录、目录同步或认证链路。
- 不把用户页 `accountMenu=Vertical` 继续表现为内部左侧菜单；页面级 tabs 是本次统一壳层的默认交互。
- 不把用户字段渲染重写为新的表单布局；字段分支仍复用 `renderAccountItem()`，只改变其所属正文分区。

## Decisions

### 页面壳

新增 `common/LargeEditShell.tsx` 作为大型编辑页共享壳。它只负责渲染：

- 返回按钮、面包屑、标题、可选扩展内容和未保存状态；
- 可选 tabs 区域；
- 滚动正文；
- 固定底部操作栏。

组织、用户、群组通过 `classPrefix` 继续保留原有 scoped class，例如 `organization-edit-shell`、`user-edit-action-bar`、`group-edit-header`，因此既有 CSS 和测试选择器不需要整体替换。用户页仍保留根节点 `admin-large-edit-page user-edit-page` 和主 Card `admin-large-edit-card user-edit-card` 作为测试、smoke 与 scoped CSS 边界。

标题根据当前语义保留：新增为 `New User`，当前账号为 `My Account`，管理员编辑他人为 `Edit User`，并在编辑模式中显示 `displayName || name`。

### 用户 Tabs 与字段渲染

用户页固定 tab key 为：

- `basic`：组织、ID、名称、头像、类型、邮箱、手机、地址、个人资料、属性等基础资料。
- `identity`：证件、实名验证、注册应用、注册类型和注册来源。
- `access`：群组、角色、权限、管理员/禁用/删除状态、强制改密和 IP 白名单。
- `security`：密码、MFA、WebAuthn、托管账号、Face ID、MFA 账号和上次改密时间。
- `connections`：第三方登录绑定。
- `records`：余额、购物车、交易、积分、信誉分、排名和同意授权记录。

`getAvailableTabs()` 只显示当前组织 `accountItems` 中存在且可见的业务分区。`accountItems.tab` 不再作为用户页顶层 tab 来源，避免组织字段配置改变页面 IA；字段可见性、`regex`、`viewRule` 和 `modifyRule` 仍由 `accountItems` 决定。

`renderAccountItem()` 不做字段级重写，避免漏改当前几十个字段分支。新增的 `renderAccountItemFormItems(tab)` 只负责把某个 tab 下的字段包装成 `Form.Item`，继续保留 regex 校验规则和原 handler。

### Dirty、返回与取消

`updateUserField()` 标记 `dirty: true`。表格、select、input、switch 等大部分字段最终都走该方法，因此能覆盖主要编辑路径。保存成功后清除 dirty；后端保存失败时继续回滚 owner/name，并结束 submitting。

返回与取消共用 `confirmDiscardChanges()`。无 dirty 时直接离开；dirty 时使用 AntD `Modal.confirm`。返回和取消都遵循既有列表返回逻辑：优先 `returnUrl`，其次 `sessionStorage.userListUrl`，local admin 返回 `/users`，非 local admin 返回 `/`。新增模式确认取消后继续调用 `deleteUser()`。

### 保存与提交态

`submitUserEdit(exitAfterSave)` 在 `submitting` 时直接返回；否则复制当前 user 并调用既有 `UserBackend.updateUser(this.state.organizationName, this.state.userName, user)`。成功后更新 `organizationName/userName`、清除 dirty、关闭 submitting，并按既有 `exitAfterSave` 逻辑跳转。失败或异常时关闭 submitting 并保留原错误提示。

### 样式与 i18n

样式继续使用各页面 `*-edit-*` scoped class，壳层组件额外输出 `admin-large-edit-*` 通用 class 作为后续收敛入口。新增用户 tab 文案放入 `user` namespace 或复用已有 `general`/`account` key；不会在 TSX 中新增硬编码中英文 UI 文案。

## Risks / Trade-offs

- [Risk] 用户页字段分支很多，直接重写字段布局容易漏 handler → 保留 `renderAccountItem()`，只重组外层壳和 tab 容器。
- [Risk] `accountMenu=Vertical` 和 `accountItems.tab` 的组织配置不再呈现为用户页顶层导航 → 用户页统一为固定业务 tabs；配置仍保留字段可见、权限和校验，不影响保存契约。
- [Risk] 某些组织只启用一个业务分区 → 隐藏 tab bar，正文单分区显示；编辑壳和固定动作栏仍生效。
- [Risk] dirty 不能覆盖不走 `updateUserField()` 的即时动作 → MFA 删除、第三方解绑和 WeCom 同步本来就是即时后端动作，本次不把它们纳入底部保存回滚语义。
- [Risk] 双重滚动或底部栏遮挡字段 → Card/body/shell 使用 flex 布局，正文独立滚动，移动端降级为自动高度和换行操作栏。
