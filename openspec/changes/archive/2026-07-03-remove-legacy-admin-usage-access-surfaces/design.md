## Context

当前页面方向已经正确，但旧 surface 还存在三层风险：

1. UI 默认层仍在 loading/error/empty 文案里称为“服务凭据治理配置/状态”。
2. 前端 API client 仍直接调用 `/api/application-access/service-credential-governance-*`，该路径语义来自旧 Application Access 服务凭据治理面板。
3. 主规格仍要求 `/applications` 消费并展示服务凭据治理状态/配置/诊断/交接包，和最新“只保留 Insight Admin Provider 交接页”的口径冲突。

## Goals / Non-Goals

**Goals:**

- 让 Admin UI 默认层不再出现旧“服务凭据治理”产品入口或旧配置中心语义。
- 将前端数据调用切到新 `Insight Admin Provider handoff` 语义 endpoint。
- 旧 Application Access service-credential-governance endpoint 被访问时稳定拒绝，不继续作为产品 API。
- 新 endpoint 复用既有 copy-safe owner evidence/config/diagnostic 逻辑，继续支持 package 生成和脱敏。
- 测试覆盖旧入口不可见、旧 endpoint 拒绝、新 endpoint 可用、新 package 不回退。

**Non-Goals:**

- 不实现 Admin secure handoff、grant、token broker、短链、扫码、credential issuer/revoke 或 secret lifecycle。
- 不修改 API/Gateway/Insight contract，不实现 Insight Profile 导入端。
- 不删除仍被新 copy-safe package 生成依赖的内部 owner evidence 结构。
- 不做数据库迁移或生产数据清理。

## Decisions

### Decision: 旧 path 稳定拒绝，新 path 复用原只读/保存/诊断逻辑

旧 path 代表 `/applications` 旧治理面板，不再作为产品入口。新 path 使用 `/api/insight-admin-provider/handoff/*`，承接同一份 copy-safe metadata。这样满足“旧后端 surface 不保留”，同时不扩大到 DB/schema/Insight contract。

### Decision: 内部类型暂不做全量重命名

Go object 和 TS helper 中的 `ServiceCredentialGovernance` 命名已经承载大量 copy-safe 校验、overlay 和 runtime gate 逻辑。全量重命名会制造大范围低价值 diff，并增加迁移风险。本 change 只清理用户可见 UI、路由/API surface、OpenSpec 和测试断言；内部命名作为 implementation detail 保留。

### Decision: 不提供旧路径自动跳转

旧路径返回稳定错误，避免调用方误以为旧 API 仍是推荐面。新页面和测试必须使用新 path。

## Risks / Trade-offs

- [Risk] 外部脚本若仍调用旧 `/api/application-access/service-credential-governance-*` 会失败。→ 这是预期 cleanup；错误消息指向 `/api/insight-admin-provider/handoff/*`。
- [Risk] 内部文件名仍含 `ServiceCredentialGovernance`。→ 只作为实现细节保留，避免扩大写集；用户可见 UI/API/spec surface 收敛为新语义。
- [Risk] 没有浏览器 smoke 时可能漏掉文案长文本。→ 本 change 不改布局结构；通过聚焦 Jest、typecheck/build 验证，必要时记录未做浏览器 smoke 的剩余风险。
