## Why

现有 Admin 组织主数据质量 readiness 只能给出组织级汇总，operator 可以看到 `blocked`、`warning`、reason aliases 和数量，但无法定位具体是哪一个 `PlatformDepartment`、`PlatformUser` 或 `PlatformMembership` 触发质量问题。组织投影、API mapping 和 Gateway ingestion 诊断链路因此缺少 Admin producer 侧的明细入口，失败后仍需要人工翻库或猜测来源数据。

## What Changes

- 新增 Admin 只读组织目录质量 API，按 `department`、`user`、`membership` 返回脱敏明细、质量状态、reason codes、来源连接摘要、同步批次和版本线索。
- 支持 operator 常用筛选：organization、entityType、keyword、sourceType、sourceConnectionIdHash、qualityStatus、reasonCode、lifecycleStatus 和分页。
- 新增独立 web-admin 组织目录质量页面，从 Admin 管理工具菜单进入，提供筛选、表格、详情面板和修复线索。
- 复用现有 Admin 主数据对象、SourceConnection、OrgSyncBatch、PlatformApiUserMapping 与 quality readiness reason 口径，不读取 API/Gateway/Insight 内部库，不触发 Gateway projection publish。

## Impact

- 后端：新增目录质量 service、controller route 和聚焦测试；保持现有 readiness API、manual publish、Gateway ingestion status 和 publish attempt history 行为不变。
- 前端：新增独立页面、backend wrapper、菜单/路由入口和页面测试；不继续把无关模块堆叠到 Platform API mapping 页面。
- 安全与隐私：响应只暴露 Admin 诊断所需的本地键、hash、状态、版本和来源摘要；不得返回 token、Secret、Cookie、私有 URL、手机号、邮箱、完整组织树 payload 或原始外部 profile。
- 边界：本 change 不实现飞书 Contact v3、真实租户 smoke、真实 60 fixture 写入、Gateway authorization facts 写入或下游 DB 查询。
