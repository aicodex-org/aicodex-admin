## Why

飞书组织同步已经具备 dry-run 预览能力，但 operator 只能看到当前一次结果，无法回看最近预览的影响、失败分类和脱敏摘要。正式同步前需要一条 Admin-owned 的 dry-run audit trail，用于审计、排障和确认风险趋势，同时继续保持不触发真实写入、不泄露通讯录明细。

## What Changes

- 新增飞书/Lark 组织同步 dry-run history 记录能力，在每次 dry-run preview 成功或 fail-closed 后保存脱敏摘要。
- 新增只读列表和详情 API，支持按组织、来源连接 hash、状态/诊断 alias、时间范围、limit/topN 查询。
- dry-run preview 写入历史失败时不改变 preview 的 fail-closed 语义；API 需要返回稳定结果或安全诊断。
- Web Admin 飞书组织同步页面新增最近 dry-run 历史表和详情 Drawer，展示预览时间、diff counts、safe diagnostics、retention/redaction 标记。
- 补充后端 object/controller/router 测试与前端 backend/page 测试，覆盖脱敏、筛选、失败记录和 UI 状态。

## Capabilities

### New Capabilities

- 无。

### Modified Capabilities

- `feishu-organization-sync`: 增加 Feishu/Lark dry-run preview history / audit trail 的记录、查询和 Admin UI 行为要求。

## Impact

- 后端：`admin/object` 新增 dry-run history model/store/service，并接入 dry-run preview service；`admin/controllers` 和 `admin/routers` 新增只读 history API。
- 前端：`web-admin/src/FeishuOrganizationSyncPage.js` 和 `web-admin/src/backend/FeishuOrganizationSyncBackend.js` 增加最近 dry-run 历史表、详情 Drawer 和 API 调用。
- OpenSpec：更新 `feishu-organization-sync` capability delta。
- 安全边界：仅记录脱敏聚合摘要，不保存或返回 raw Contact payload、完整树/用户列表、token、secret、手机号、邮箱、`open_id`、`union_id` 或 `user_id` 明细；不读取真实飞书密钥，不触发真实租户同步，不写 Gateway facts，不改企微同步实现。
