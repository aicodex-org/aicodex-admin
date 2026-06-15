# Proposal

## Why

Admin gateway projection cleanup 已具备 retention readiness、dry-run guardrails 和 execute readiness，但 operator 在真实 cleanup 执行开放前仍缺少一条可交接的审批/拒绝/导出/刷新审计线索。没有审计 trail 时，后续无法清楚回答谁查看了哪次 dry-run、基于哪些 disabled reason 做了 approve/reject/copy/export 预览，以及该动作对应的 readiness hash、retention policy version 和 candidate count。

本 change 在 Admin owner 范围内补齐 cleanup approval audit trail/read model。P0 只记录或展示安全 operator action，不执行 cleanup、不删除或更新 publish attempt、不写 Gateway 授权事实。

## What Changes

- 新增 Admin-owned cleanup approval audit trail/read model，用于展示 readiness hash、retention policy version、candidate count、approval state、operator action、disabled reason、安全摘要和时间信息。
- 新增只读查询 API，并在需要时提供 P0 安全 action preview/record 能力；所有输出必须脱敏。
- Web Admin 在 gateway projection publish attempt / retention / cleanup readiness 区域新增“审批审计”面板或抽屉，覆盖 loading、empty、error、disabled 状态，支持复制/导出脱敏 JSON。
- OpenSpec 主规格补充 cleanup approval audit trail 的只读边界、存储范围、脱敏要求和 Gateway receipt hint 语义。

## Non-Goals

- 不执行真实 cleanup、delete、update 或 DB 清理。
- 不触发 projection publish，不写 Gateway authorization facts。
- 不读取 API/Gateway/Insight 内部库，不改变 API/Insight 逻辑。
- 不处理生产或类生产环境、60 写入或真实 gate。
- 不把 Gateway receipt hint 或 audit trail 表述为 runtime authorization success。
