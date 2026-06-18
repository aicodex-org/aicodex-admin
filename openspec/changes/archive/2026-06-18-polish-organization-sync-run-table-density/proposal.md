## Why

企业微信和飞书组织同步页的主流程已经基本对齐，但同步记录表仍把长 `runId` 作为首列展示，日常查看价值低且占宽；飞书定时同步输入缺少 `Cron 表达式`、`时区`标签，也和企业微信不一致。

## What Changes

- 将企业微信和飞书正式同步记录首列从 `运行 ID` 改为分页连续 `序号`，默认收窄列宽。
- 保留完整 `runId` 作为 `rowKey` 和排障信息，通过序号 tooltip/复制入口可查看或复制完整 ID。
- 统一两个 provider 的执行人列长文本处理，默认省略并通过 tooltip 查看完整值。
- 修正飞书正式同步记录 `错误摘要` 表头换行，保持表头单行展示。
- 为飞书定时同步输入补齐 `Cron 表达式`、`时区`标签，与企业微信配置节奏一致。
- 对正式同步记录的统计数字使用稳定数字宽度样式，提升扫读体验。

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `wecom-organization-sync`：约束企业微信正式同步记录的序号列、排障 ID 保留、执行人省略和统计数字扫读。
- `feishu-organization-sync`：约束飞书正式同步记录的序号列、排障 ID 保留、执行人省略、统计数字扫读和定时同步标签一致性。

## Impact

- 影响范围限定在 `web-admin` 企业微信/飞书组织同步页面、聚焦测试和 OpenSpec 文档。
- 不改变后端 API、数据库、同步执行、调度、权限、OAuth/OIDC、Gateway 或 Insight。
- 不读取真实 provider secret，不触发真实租户同步。
