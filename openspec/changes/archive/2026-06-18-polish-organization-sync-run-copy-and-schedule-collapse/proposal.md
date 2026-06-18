## Why

企业微信和飞书组织同步页刚把正式同步记录首列改为 `序号`，但每行常驻复制图标让序号列变得吵闹；同时定时同步未启用时仍展示 Cron 和时区输入，造成同步选项和定时同步两列高度明显不一致。

## What Changes

- 企业微信和飞书正式同步记录的 `序号` 列默认只展示数字，不再常驻复制图标。
- 完整运行 ID 仍作为排障信息保留，可通过 hover 序号查看，并通过点击序号复制。
- 复制成功或失败使用轻量消息反馈，不改变后端 runId、rowKey 或同步记录数据结构。
- 企业微信和飞书定时同步未启用时只展示开关和简短状态提示；启用后再展开 Cron、时区和最近调度。
- 不新增摘要面板，不移动权限提示，不改变同步执行、调度、权限、OAuth/OIDC 或后端 API。

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `wecom-organization-sync`：收敛企业微信同步记录运行 ID 复制入口，并让未启用的定时同步配置保持折叠。
- `feishu-organization-sync`：收敛飞书/Lark 同步记录运行 ID 复制入口，并让未启用的定时同步配置保持折叠。

## Impact

- 影响范围限定在 `web-admin` 企业微信/飞书组织同步页面、聚焦测试和 OpenSpec 文档。
- 不改变后端 API、数据库、同步执行、定时调度保存协议、OAuth/OIDC、Gateway 或 Insight。
- 不读取真实 provider secret，不触发真实租户同步。
