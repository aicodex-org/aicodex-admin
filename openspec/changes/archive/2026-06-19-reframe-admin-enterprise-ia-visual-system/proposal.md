## Why

Admin 企业认证中心已经增加了关系、预检、治理任务等体验层能力，但 60 环境反馈显示显眼入口和工作台层过多会增加管理员理解负担。领导提出的“页面太素”应理解为企业产品成熟度不足，而不是继续新增菜单、中心、卡片或说明面板。

本 change 用 OpenSpec 固化新的路线方向：少入口、业务域导航、成熟企业控制台壳层、专业表格工具栏、对象上下文详情和可信证据链，避免后续 worker 继续把“企业级”误解为堆治理概念。归档前收口时，本 umbrella 只保留已经完成并合入的 IA/导航方向门禁；未完成的视觉系统实现、对象上下文迁移和浏览器/60 证据从本 scope 裁出，作为未来独立 change 候选。

## What Changes

- 收敛 Admin 企业认证中心信息架构：左侧主导航优先按业务域组织，而不是按横向治理能力或实现模块组织。
- 固化一级菜单文案门禁：菜单标签和菜单文档命名默认“四字中文业务名优先”，避免过长解释性短语；LLM AI/Gateway 等专有技术词可保留中英混合。
- 明确“身份资产关系、接入预检、治理任务、快捷操作”等能力的展示层级：默认沉到对象详情、配置流程、总览待处理提示或对象操作区，不再作为显眼主入口继续扩张。
- 增加企业控制台视觉方向约束，但不在本 change 中声明已完成页面头、表格工具栏、状态标签、详情抽屉、空态/错误态、密度、移动端间距或 i18n 文案实现。
- 增加后续任务判定规则：只新增菜单、中心、卡片或解释性面板而不能提升核心对象决策效率的任务默认拒绝。
- 增加验证要求：后续 IA 或视觉实现必须用浏览器/60 或 local-dev 截图证据证明核心列表、核心操作和对象上下文没有被新壳层压低或干扰。

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `admin-enterprise-identity-console-shell`: 修改 Admin 企业认证中心 Shell 的信息架构、抽象能力入口层级、企业视觉系统、专业列表工具面和后续任务门禁要求。

## Impact

- Affected future frontend areas: `web-admin/src/enterpriseNavigation.js`, `web-admin/src/ManagementPage.js`, enterprise identity overview/routes, object detail drawers, page headers, table toolbars, status tags, empty/error states and zh/en locale copy;这些属于未来独立实现候选，本次归档不改业务代码。
- Affected OpenSpec flow: future Admin enterprise identity UI workers must check this shell capability before adding new navigation entries, dashboards, workbenches or visual-system changes.
- No backend API, package, lockfile, build infrastructure, secrets, OAuth/OIDC callback, Provider login, Gateway publish/projection/cleanup/receipt or `test` branch changes are included in this proposal.
