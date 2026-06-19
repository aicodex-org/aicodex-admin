## Context

企业微信组织同步已经有配置、连接测试、正式全量差异同步、同步记录和统一页面外壳。飞书/Lark 同步引入了 dry-run、历史、绑定诊断和 handoff evidence，但用户反馈企业微信页面的价值在于“干净清爽”，两个 provider 只需要在基础同步流程和关键预检入口上保持一致。

企业微信后端已有 normalized snapshot、`BuildWecomOrganizationSyncPlan`、`buildWecomOrganizationSyncRunStats` 和 `WecomOrganizationSyncExistingState`，可支持只读计算影响面；当前缺少对外 dry-run API、脱敏预览历史和前端预览入口。

## Goals / Non-Goals

**Goals:**

- 增加企业微信 dry-run preview，使管理员在正式同步前看到部门、用户、关系的聚合影响。
- 预览结果和预览历史只保存/展示脱敏摘要，不落 raw WeCom payload、用户明细、手机号、邮箱、token 或 secret。
- 前端将 `预览影响` 放在正式同步附近，预览历史作为低频 Modal 入口，不常驻主页面。
- 复用企业微信正式同步统计口径，避免两个 provider 的基础流程割裂。

**Non-Goals:**

- 不实现企业微信的绑定冲突诊断、交接证据、验收资料或飞书重诊断面板。
- 不修改正式同步 apply 行为、Gateway projection publish、User/Group/Platform 写入语义。
- 不读取真实 secret 以外的额外运行态配置，不写真实租户 fixture，不触发真实同步作为测试前提。
- 不大范围迁移 web-admin 旧 JS；新增展示组件和类型优先使用 TS/TSX。

## Decisions

1. **dry-run 服务复用企业微信现有 snapshot + plan 口径。**
   - 做法：`WecomOrganizationSyncDryRunPreviewService` 校验配置、拉取 snapshot、读取 existing state、调用 `BuildWecomOrganizationSyncPlan`，并用现有统计函数拆分部门/用户新增、更新、软禁用。
   - 理由：正式同步和预览使用同一差异口径，减少“预览通过但正式统计不同”的误解。
   - 替代方案：复制飞书 dry-run diff 逐项比较字段。该方案能给更多细节，但会让企业微信页面和服务变重，不符合本次 KISS/YAGNI。

2. **关系影响只展示聚合变更数量。**
   - 做法：用户-部门、部门负责人、直属上级关系统一归入 `relationships`，展示 `toUpdate` 与 `toSoftDisable` 等聚合计数；不在 P0 拆成多张细表。
   - 理由：企业微信关系事实多于飞书，但管理员正式同步前主要关心链路和影响规模。过细分类会增加 UI 噪声。
   - 替代方案：分别展示 membership/manager/direct leader 三组表格。该方案更完整，但会让企业微信页面接近飞书重诊断，暂不采用。

3. **预览历史使用轻量专表。**
   - 做法：新增 `WecomOrganizationSyncDryRunHistory`，只保存 source alias、operator/request hash、snapshot 计数、diff 计数、reason counts、safe summary、createdAt、retention/redaction metadata。
   - 理由：正式 run 记录不应混入 dry-run；同时管理员需要回看最近预检结果。轻量专表比复用正式 run 状态更清晰。
   - 替代方案：只在前端内存展示最近一次预览。该方案不能审计，也无法跨刷新回看。

4. **前端入口保持二级但靠近主操作。**
   - 做法：在企业微信 action bar 中增加 `预览影响`，旁边提供 `预览历史`。结果和历史均用 Modal 展示，主页面不新增大面板。
   - 理由：预览是正式同步前的辅助动作，应比配置提示更接近“开始全量同步”，但不应占据同步记录主区域。
   - 替代方案：把预览历史常驻在同步记录下方。用户已明确该模式在飞书页显得别扭，企业微信不采用。

## Risks / Trade-offs

- **真实企业微信权限不足导致 dry-run 失败** → 返回 `failed` preview 与安全诊断，不写正式数据；前端展示“预览失败，不影响已保存配置”。
- **history 写入失败影响预览结果** → dry-run preview 仍返回，附带 `historyWarning`；审计缺口在 UI 中提示但不阻断 fail-closed 语义。
- **新增表在旧环境首次启动创建** → 仅使用 Xorm additive `Sync2`，不做破坏性迁移。
- **企业微信与飞书能力不完全一致** → 文档明确企业微信只补轻量 dry-run，飞书重诊断暂不反向要求企业微信实现。
