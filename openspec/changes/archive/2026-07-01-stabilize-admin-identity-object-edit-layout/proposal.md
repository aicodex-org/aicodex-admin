## Why

身份对象 / 权限对象相关编辑页仍保留旧式 `Row` / `Col span` 内部表单布局。Group、Role、Permission、Invitation 以及相邻对象配置页在桌面端 label 列宽度不一致，中文或英文长 label 容易被压缩，窄屏下也存在页面级横向 overflow 风险。

当前 Admin 前端 TS 迁移已完成，页面 UX/一致性巡检需要把这些编辑页的内部表单布局收敛到稳定、可测试、可维护的 scoped 契约，并避开已经完成或并行处理的组织/用户/应用/Provider/Syncer、Gateway 和接入凭据页面。

## What Changes

- 为身份对象 / 权限对象编辑页增加稳定页面、卡片和普通字段行 class hook。
- 用 scoped CSS 约束这些编辑卡片内部的 label/control 布局，使桌面端 label 列稳定、内容列可伸缩，窄屏自动换行。
- 增加聚焦测试覆盖 class hook、CSS hook 和布局契约；浏览器 smoke 使用脱敏 fixture 或静态 DOM 验证 1280px 桌面布局和页面级 overflow。
- 不修改 API、保存 payload、路由、权限模型、字段语义、对象关系、后端接口或业务行为。

## Capabilities

### New Capabilities

### Modified Capabilities

- `admin-enterprise-identity-console-shell`: 约束身份对象 / 权限对象编辑页内部表单布局一致性和 scoped 样式边界。

## Impact

- 目标前端页面：`web-admin/src/GroupEditPage.tsx`、`web-admin/src/RoleEditPage.tsx`、`web-admin/src/PermissionEditPage.tsx`、`web-admin/src/InvitationEditPage.tsx`。
- 相邻对象配置页：`web-admin/src/FormEditPage.tsx`、`web-admin/src/ModelEditPage.tsx` 可在实现阶段评估纳入；若风险或范围不合适，记录 deferred 原因。
- 影响样式：仅在新增 scoped class 下修改 `web-admin/src/App.less`。
- 影响测试：优先补充 Group / Invitation 既有测试；无既有测试页面可用源码/样式契约测试覆盖 hook 和 CSS。
