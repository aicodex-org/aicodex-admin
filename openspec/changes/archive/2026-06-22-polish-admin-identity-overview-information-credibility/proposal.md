## Why

身份总览首屏已经收敛到 AICodex 四个产品域，但仍存在几个会削弱企业控制台可信度的问题：同一屏内 `用量归因完整度` 上方指标可能显示 `-`，下方用量洞察卡片却显示 `98%`；KPI 顶部彩色线条没有清晰业务语义；副标题偏说明文档；repo code tag 视觉权重过高；最近审计证据操作文案重复 `查看记录`。这些问题容易让管理员误判数据口径或把页面看成路线说明而不是控制台状态面板。

## What Changes

- 统一身份总览内 `用量归因完整度` 的显示口径，避免同屏同语义指标一个显示 `-`、另一个显示 `98%`。
- 去掉或弱化 KPI 顶部无语义彩色线条，保留状态可读性但不制造不可解释装饰。
- 缩短 `AICodex 身份基础设施总览` 副标题，让首屏更像企业控制台。
- 将 `aicodex-app-spec`、`aicodex-insight`、`aicodex-admin`、`aicodex-api` 调整为次级 code tag，突出业务名、状态和接入/审计信号。
- 将最近审计证据的操作文案改为更具体的对象/证据动作，避免机械重复。
- 保持现有路由、入口、权限、接口和后端行为不变。

## Impact

- 主要前端文件：`web-admin/src/IdentityConsoleOverview.js`、相关测试和必要局部样式。
- Locale：如新增或调整用户可见文案，同步 `web-admin/src/locales/zh/data.json` 与 `web-admin/src/locales/en/data.json`。
- 不新增 API，不修改后端，不触碰 OAuth/OIDC、Gateway、DB 或真实认证链路。
- 不新增新的中心、工作台、治理入口或任务队列。
