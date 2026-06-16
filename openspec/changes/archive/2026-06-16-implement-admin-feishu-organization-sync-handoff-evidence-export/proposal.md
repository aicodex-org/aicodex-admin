## Why

飞书组织同步已经具备配置、运行诊断、dry-run diff/history 和用户绑定冲突诊断。接下来需要让 operator 在真实租户测试或后续 Gateway projection / Insight 验收交接时，可以拿到一份稳定、脱敏、可复制导出的 handoff evidence，而不是人工截图或拼接多处页面信息。

当前 run、dry-run history 和 binding diagnostics 分散在不同区域，且缺少统一的 readiness、blocked reason、operator next action 和 cannotInfer 说明。新增 evidence export 可以把一次 run 或 dry-run 的本地审计摘要打包为安全 JSON，供测试交接和验收留痕。

## What Changes

- 新增 Admin-owned Feishu/Lark organization sync handoff evidence read model/service/API。
- Evidence 基于本地 run、dry-run history、dry-run diff、binding diagnostics 和配置元数据生成，包含：
  - `evidenceVersion`、`sourceType`、`sourceIdHash`、`sourceStatus`、`readiness`
  - endpoint mode、tenant/app/sourceConnection safe marker
  - run/dryRun id hash、部门/用户/成员关系聚合 count
  - binding conflict summary、soft-disable summary、trigger summary
  - blocked reasons、operator next actions、cannotInfer 和 redaction metadata
- 前端飞书组织同步页面新增 evidence 复制/导出能力，覆盖 loading、empty、error、unsupported、no-run、blocked、ready 状态。

## Non-Goals

- 不读取真实 Feishu/Lark secret，不调用真实 Contact v3。
- 不触发真实同步、不写 `User`/`Group`/`Platform*`，不触发 Gateway projection publish。
- 不读取 API/Gateway/Insight 内部库，不把这些服务作为 evidence 事实源。
- 不输出 raw source payload、完整组织树、手机号、邮箱、真实姓名、token/Cookie、私有 URL 或 tenant secret。
- 不新增可修复动作；operator next actions 只作为建议文本/枚举。

## Impact

- 后端：新增 object/service、controller、router、权限资源和 focused tests。
- 前端：扩展 `FeishuOrganizationSyncBackend` 和 `FeishuOrganizationSyncPage`，增加脱敏 evidence JSON 复制/导出。
- OpenSpec：扩展 `feishu-organization-sync` 规格，记录 evidence API、数据安全和 UI 状态契约。
- 安全：所有 evidence 输出必须是聚合 count、stable hash 或 safe marker，不能携带可识别个人或真实租户密钥的数据。
