## Why

企业微信和飞书组织同步页面已经共用 TSX 外壳，但用户截图显示顶部配置区、辅助诊断区和正式同步记录仍像两个产品。管理员需要在两类同步里看到一致的基础流程：配置、测试、预览或同步、查看正式记录；飞书独有的 dry-run、身份匹配诊断和交接资料要保留，但不应默认压过主流程。

## What Changes

- 对齐企业微信和飞书组织同步配置区的视觉节奏：目标组织、provider 凭证字段、同步选项、定时选项、权限提示、主操作和正式同步记录。
- 保留飞书/Lark 专有字段和能力，但把服务区域、dry-run 历史、身份匹配诊断、交接资料放到更紧凑或更次级的位置。
- 统一正式同步记录表的语义，让状态、触发方式、阶段、执行人、开始/结束时间、部门/用户影响、飞书可选成员关系影响和安全错误摘要都易于扫描。
- 不改变后端 API、同步执行、脱敏导出行为、provider 专有能力或当前路由。

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `feishu-organization-sync`：收紧 Web Admin 页面展示要求，强调基础同步流程一致性、辅助诊断默认紧凑和正式同步记录表对齐。
- `wecom-organization-sync`：收紧 Web Admin 页面展示要求，保持已发布企业微信页面作为清爽的基础同步流程基准，并与飞书共享正式记录表语义。

## Impact

- 影响范围限定在 `web-admin` 组织同步页面展示、共享前端 helper 和聚焦前端测试。
- 不改后端 API、持久化、调度器、同步执行、OAuth/OIDC、Gateway、Insight 或生产配置。
- OpenSpec delta 只更新既有同步能力的 Admin UI 要求。
