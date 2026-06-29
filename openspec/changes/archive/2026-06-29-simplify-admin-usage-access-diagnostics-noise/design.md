## 背景

`应用接入 / 用量接入` 的用户目标已经收敛为交付 Admin provider 辅助交接包，而不是在 Admin 里再做一个用量 provider 配置中心。页面需要让管理员快速判断两件事：Admin 侧是否还缺部署配置；材料齐备时能否复制给 Insight 使用的 copy-safe Admin 交接包。

## 设计决策

- 页面只保留面包屑、标题、服务凭据治理状态、下一步提示和一个主工作区。
- 主工作区只存在两种状态：
  - `待补配置`：列出需要补到 Admin env/config 或部署私有配置的 key，提示补齐后重启 Admin 并刷新页面。
  - `Admin 交接包`：材料齐备后允许生成并复制 `aicodex.admin.serviceCredentialGovernanceHandoff` JSON。
- 不在页面内保存 secret、凭据引用、调用策略或运行策略修正；这些仍属于部署配置或后续专门 owner change。
- 不展示 `Dry-run/Readiness`、`Doctor`、诊断详情、高级修正、保存修正、读取当前值、stable alias、reason code 或 Evidence 元数据。
- `not_applicable` 不等于运行态 ready；当 Admin 无法判断下游运行态真值时，handoff package 使用 `cannot_infer` 语义。

## 边界

- Admin 只声明身份、组织、resolver、projection/trust 和服务间凭据入口的 owner 状态。
- API/Gateway 仍是用量主交接包来源；Admin 不生成 API/Gateway 用量主配置包，不声明 usage facts 或 provider runtime truth。
- Insight 负责导入 API/Gateway 主包和 Admin 辅助包，并执行保存、回读、Doctor 和用量页面验收。

## 验证策略

- 聚焦测试覆盖页面不展示副标题、快捷入口、诊断详情、机器 alias、高级修正和保存/读取配置动作。
- 聚焦测试覆盖待补配置、生成 Admin 交接包、copy-safe 字段和 `not_applicable -> cannot_infer` 语义。
- 通过 typecheck、OpenSpec strict validate、构建和本地预览 smoke 验证最终状态。
