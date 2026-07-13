## Why

邀请码编辑页仍使用旧式 Card 标题按钮、逐行 Row/Col 表单和正文末尾重复操作按钮，与组织账号下已经改造的角色、权限等编辑页不一致。现在需要把该页接入统一编辑壳，使路径、滚动正文和主要操作在长表单中保持稳定可达。

## What Changes

- 邀请码编辑页复用公共 `LargeEditShell`，展示返回入口、组织账号路径、对象标题、独立滚动正文和固定底部操作栏。
- 使用公共 `LargeEditSection` 与 `LargeEditFieldRow` 按邀请码现有业务语义整理基础信息、邀请配置、注册目标和注册信息正文分区。
- 移除 Card 标题和正文末尾的重复保存按钮，仅在固定底部操作栏保留取消、保存、保存并返回动作。
- 保持现有邀请码加载、字段编辑、复制注册链接、发送邀请、保存、保存并退出、新增取消删除、路由和 API payload 语义不变。
- 组织下拉展示组织显示名（保存值保持技术名），并在保存前阻断非法邀请码名称和非空非法邮箱。
- 补充聚焦 React 测试、样式约束、zh/en 文案和只读浏览器滚动截图验收；验收不触发保存、发送邀请、删除、真实外部同步或数据库写入。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `admin-enterprise-identity-console-shell`：补充邀请码编辑页使用单页统一编辑壳、业务分区和固定底部操作栏的可验收要求。

## Impact

- 前端页面：`web-admin/src/InvitationEditPage.tsx` 及其聚焦测试。
- 公共组件：复用 `web-admin/src/common/LargeEditShell.tsx`，不修改其业务无关契约。
- 样式与文案：大型编辑页 scoped Less、`zh` / `en` locale。
- OpenSpec：更新 `admin-enterprise-identity-console-shell` capability 的 delta spec；不触碰其它 active change。
- 后端、数据库、权限、路由、API endpoint、请求 payload 和外部同步链路均不变。
