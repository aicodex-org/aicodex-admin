## Why

Admin gateway projection controlled smoke execution 已有执行前 handoff，但执行后的结果材料仍缺少 Admin owner 的本地脱敏 evidence handoff。后续操作者需要一个统一、fail-closed、可验证的本地代码路径，判断 controlled smoke 执行结果材料是否可交接，而不是依赖真实环境、真实 fixture 或主观文档判断。

## What Changes

- 新增 Admin-owned controlled smoke result evidence handoff，用本地脱敏摘要、alias、状态、计数、redaction/风险分类和 operator next action 判断结果材料是否可交接。
- 对缺少必要 evidence、状态不满足交接条件、计数/alias 不一致、疑似敏感字段或跨 owner 成功外推执行 fail-closed。
- 新增 Bruno 本地入口、Node helper/test 和 operator README 说明，保持本地 dry-run，不触发真实 publish、Gateway ingestion、endpoint/provider token、fixture/DB 写入或真实 controlled smoke。
- 同步 `admin-gateway-organization-projection-publisher` spec，明确该 handoff 不能证明真实 publish、API/Gateway/Insight 成功、authorization facts、生产就绪、controlled smoke pass 或 full-success。

## Non-Goals

- 不修改 API、Insight、Gateway 仓库或跨 owner 契约。
- 不触碰 WeCom 同步写集。
- 不写真实 fixture，不查询、写入或清理真实 DB。
- 不触发真实 publish、真实 Gateway ingestion、真实 endpoint/provider token 或真实 controlled smoke。
- 不把本地脱敏 helper 成功描述为 controlled smoke full-success。

## Impact

- 影响范围限定在 `aicodex-admin` 的 Admin gateway projection Bruno 本地入口、Node helper/test、operator README 和 OpenSpec artifacts。
- 输出仅用于本地脱敏交接判断，可作为后续操作者收集/修复 evidence 的依据。
