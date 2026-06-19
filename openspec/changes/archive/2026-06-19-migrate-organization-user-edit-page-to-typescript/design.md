## Context

`UserEditPage.js` 是用户资料维护的核心历史页面，包含基础资料、头像裁剪、组织/分组、密码、邮箱/手机号重置、地址、实名认证、OAuth/SAML 绑定、MFA、WebAuthn、托管账号、购物车、交易记录和账户页复用入口。它依赖大量 JS backend、modal、table 和 widget 组件。

本 change 属于 `web-admin` 渐进 TypeScript 路线，目标是在不改变业务链路的前提下迁移被触碰页面本身，而不是顺带把用户体系重构成全量类型模型。

## Goals / Non-Goals

**Goals:**

- 将 `UserEditPage` 本身迁移为 `.tsx`，保留 class component 和 `withRouter` 默认导出。
- 用局部 interface/type 描述页面 props、state、用户记录和本页直接消费的 backend 响应。
- 用兼容边界承接历史 JS 子组件的 props 和回调类型。
- 补充 React `.test.tsx` 聚焦测试，覆盖加载、保存、删除、跳转和关键更新行为。
- 通过增量 TS gate、`yarn typecheck`、聚焦 Jest/coverage 和 `yarn build` 验证 JS/TSX 共存。

**Non-Goals:**

- 不重写为 hooks，不改页面布局、tabs/menu、文案或交互。
- 不迁移后端 API 模块、MFA 模块、OAuth/SAML widget、modal、table 或账户页。
- 不修改认证、授权、OAuth/OIDC、Provider、Gateway projection、账户安全流程或真实环境配置。
- 不把所有用户模型字段抽成全局类型；本 change 仅定义当前页面需要的局部兼容类型。

## Decisions

- **保留 class component。** 页面副作用、条件渲染和历史回调较多，直接迁移 class component 可以避免 hooks 重写带来的行为风险。
- **保留 `withRouter` 导出。** 现有 `ManagementPage` 与 `account/AccountPage` 都依赖默认导出行为，本 change 不改变路由和嵌入契约。
- **局部类型优先。** 用户对象字段很多且部分由后端动态返回，页面内用最小可维护类型和索引签名承接历史字段，避免一次迁移扩散到全局模型。
- **重型子组件测试替身化。** 聚焦测试 mock 掉 table、modal、OAuth/SAML、MFA、裁剪等重型子组件，只验证 `UserEditPage` 自身的加载、保存、删除、跳转、字段更新和可见性决策。

## Risks / Trade-offs

- **页面体量大，分支覆盖难度高** → coverage 以 changed-file statements/functions/lines 达到 85% 为门槛，branch coverage 记录剩余缺口，不用低价值测试强压所有 UI 条件分支。
- **历史 JS 依赖类型不完整** → 通过局部 `unknown`、索引签名和 mock 组件边界控制风险，不迁移依赖链。
- **账户页复用路径容易回归** → 测试覆盖 `account` 为空/当前用户/管理员分支和 `withRouter` 导出可用性，不改变 `account/AccountPage` 调用方式。
- **多个组织账号 TS 迁移 RC 尚未合入** → 本分支从最新 `origin/hfl-test-base` 独立创建，后续合入 RC 时需要保留各自主规格场景。
