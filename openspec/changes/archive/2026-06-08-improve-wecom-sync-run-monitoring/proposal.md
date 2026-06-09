## Why

当前企业微信同步页的同步记录虽然已经返回了运行状态、阶段和部门/用户统计，但前端把统计值压缩成 `新增/更新/禁用` 的裸三段数字，并把语义提示独立放在表格外，管理员需要来回对照才能理解结果。同时，手动启动同步后页面不会自动刷新运行进度，只能依赖整页刷新，导致长任务观察成本过高。

现在需要把这块补成标准后台体验：同步记录本身要自解释，运行中的状态和统计要可持续观察，并保留手动刷新作为兜底。

## What Changes

- 调整企业微信同步页“同步记录”区域的展示规则，使部门和用户统计在表头或单元格内即可直接表达“新增 / 更新 / 禁用”语义，不再依赖表格外的静态提示才能理解。
- 为企业微信同步页增加同步记录刷新能力，在存在 `running` 记录时自动轮询最新状态，并在全部进入终态后停止轮询。
- 在同步记录区域提供显式手动刷新入口，作为自动轮询异常、管理员复核或刚保存配置后的兜底操作。
- 让同步记录表格分页真正可用：管理员切换页码后，页面应请求对应历史页数据，而不是只显示不可操作的分页导航。
- 当页面已经检测到 `running` 记录时，约束“开始全量同步”入口，避免管理员在已运行状态下重复触发同步；若后端因并发或页面状态滞后返回 `already running`，前端应以提示和刷新为主，而不是把它展示成新的同步失败。
- 避免页面在账号或配置加载阶段出现空白首屏，至少提供可见的页内加载态。
- 在同步记录区域补充自动刷新状态提示、最近一次刷新时间和手动刷新 loading 反馈，让管理员知道页面是否仍在持续观察运行中任务。
- 约束刷新行为的边界，包括切换组织、页面卸载、无运行中任务和刷新失败时的处理方式，避免重复轮询或造成误导。
- 抽取 admin 端共享的表格分页 helper，统一快速跳转、分页尺寸切换和总数文案配置，减少各列表页重复实现。
- 补充对应前端测试和 OpenSpec 规格，明确同步记录展示与运行态观察的验收标准。

## Capabilities

### New Capabilities

### Modified Capabilities

- `wecom-organization-sync`: 补充企业微信同步页对同步记录统计展示、自解释文案、运行中自动刷新和手动刷新入口的行为要求。

## Impact

- 主要改动落在前端页面、共享分页 helper 与测试：`web-admin/src/WecomOrganizationSyncPage.js`、`web-admin/src/WecomOrganizationSyncPage.test.js`、`web-admin/src/common/table/TablePagination.js`、`web-admin/src/BaseListPage.js`、`web-admin/src/WebhookEventListPage.js` 以及 BaseListPage 派生列表页；继续复用现有 `web-admin/src/backend/WecomOrganizationSyncBackend.js` API 调用模块，不引入新的后端接口。
- 影响企业微信同步相关文档与规格，需同步更新 `openspec` delta spec，并视实现结果补充后台验收说明。
- 复用现有 `/api/wecom-org-sync/runs` 与 `/api/wecom-org-sync/runs/:runId` 能力，预期不引入新的后端接口；如实现时发现现有接口无法支撑，再在 design 中明确补充范围。
