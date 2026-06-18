## Why

企业微信和飞书组织同步页面已经收敛到同一套主流程，但截图显示企业微信配置区仍把 Secret、同步选项和定时同步排布在与飞书不同的位置。管理员在两个 provider 间切换时，应该看到更一致的配置顺序；飞书同步记录表头也需要进一步短化，避免列头换行造成页面拥挤。

## What Changes

- 将企业微信配置区调整为与飞书一致的三行节奏：目标组织/空位、App ID/App Secret、同步选项/定时同步。
- 企业微信字段展示改为 `App ID（Corp ID）` 和 `App Secret`，但仍使用现有 `corpId` 与 `addressBookSecret` 后端字段，不改变接口契约。
- 将企业微信和飞书正式同步记录里的统计列头短化为 `部门`、`用户`，飞书保留 `关系`；单元格继续显示 `新 / 更 / 禁`。
- 保留飞书 dry-run、身份匹配和交接资料能力，不把飞书专有能力添加到企业微信。

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `wecom-organization-sync`：进一步约束 Web Admin 企业微信同步配置区与飞书同步页面的字段顺序和字段标签一致性。
- `feishu-organization-sync`：进一步约束 Web Admin 飞书同步记录表头短化和正式记录扫描体验。

## Impact

- 影响范围限定在 `web-admin` 的企业微信/飞书组织同步页面展示和聚焦测试。
- 不改变后端 API、数据库、同步执行、调度、权限、OAuth/OIDC、Gateway 或 Insight。
- 不读取真实 provider secret，不触发真实租户同步。
