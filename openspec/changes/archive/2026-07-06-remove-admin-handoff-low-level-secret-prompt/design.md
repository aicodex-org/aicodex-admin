## Context

本 change 承接已归档的 Admin Provider handoff UI 收敛工作。当前页面结构、状态语义和 copy-safe package 行为已经符合 P0 边界，剩余问题是默认层仍把底层 secret 落点作为解释文本展示。

## Decisions

- 默认层的 credential reference 缺失提示只说用户动作：生成 Admin 交接包、导入 Insight Profile、在 Insight 通过 manual/secretRef binding 绑定 resolver 凭据。
- copy-safe 说明保留“Admin 交接包只传递 copy-safe 引用，不传递真实凭据”，不枚举 `.env`、K8s Secret、Vault/KMS 或外部 secret system。
- 本次只改前端文案和测试；后端模型里已有的 copy-safe 字段、诊断状态和 owner evidence 不扩展。

## Non-Goals

- 不实现 Admin secure handoff。
- 不新增 Admin secret 管理、凭据发行、撤销或 resolver 生命周期。
- 不改 API/Gateway/Insight contract，不新增 package schema 字段。
- 不重做诊断详情布局或导航结构。

## Validation

- OpenSpec strict validate。
- 聚焦 Jest 覆盖默认态文案和低层落点词不可见。
- incremental TypeScript gate、`yarn typecheck`、`yarn build` 和 `git diff --check`。
- 本 change 不改布局；浏览器 smoke 如执行，仅作为低风险 UI 文案复查，不声明跨仓闭环。
