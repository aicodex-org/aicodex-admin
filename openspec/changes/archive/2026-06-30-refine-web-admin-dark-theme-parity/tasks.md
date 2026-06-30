## 1. 共享主题边界梳理

- [x] 1.1 盘点近期共享页壳页面中残留的硬编码浅色 `background`、`border`、`box-shadow`、`color` 和复制反馈样式
- [x] 1.2 明确只替换页面局部 surface selector，不改动已经调稳的公共列表壳布局、间距和滚动边界

## 2. 关键页面暗黑适配

- [x] 2.1 将组织/用户紧凑列表壳、结果数分隔和目录健康辅助上下文接入共享主题 token
- [x] 2.2 将身份资产关系页、接入向导、审计记录详情抽屉和用量接入治理块中的自定义 cards、selector、summary、collapse 和 evidence 区接入共享主题 token
- [x] 2.3 保持现有查询、分页、详情抽屉、复制和只读边界语义不变，不新增后端 API 或主题配置协议
- [x] 2.4 将企业微信/飞书组织同步配置页纳入共享 cardless route scroll 路径，避免工作区标签或正文外层参与滚动
- [x] 2.5 将接入向导证据入口链接色接入共享 link token，避免暗黑模式下落到偏深默认链接色
- [x] 2.6 将工作区标签外层横向裁剪改为 `clip`，避免外层标签栏因 1px 高度误差变成纵向滚动容器
- [x] 2.7 将侧边菜单、正文 route scroll、共享页壳 body 和详情抽屉 body 的滚动条接入共享 scrollbar token，避免暗黑模式下落回系统浅色滚动条
- [x] 2.8 显式覆盖 Ant Design 默认 Header 背景，确保明亮模式顶部使用共享 header token，暗黑模式维持原深色顶部观感
- [x] 2.9 将顶部右侧组织选择器接入共享 shell token，降低暗黑模式下默认 Ant Design input 边框和黑底的控件噪声
- [x] 2.10 将共享列表壳查询控件、默认工具按钮、分页选择器、表格正文/链接和组织同步配置页表单/表格控件接入共享 surface/control/link token，避免暗黑模式下落回 Ant Design 默认黑色控件或偏沉主题紫链接
- [x] 2.11 将 API 网关映射、组织树运营、组织目录质量等非列表型 AntD Card 页面的 Card、表单控件、默认按钮、表格、空态、Segmented/Tree 和默认 Tag 接入共享 shell token，避免暗黑模式下落回 Ant Design 默认黑色 surface
- [x] 2.12 为企业微信/飞书同步等 cardless 路由恢复与普通 Card/List 路由一致的内容间距和层级，同时不改变正文滚动边界
- [x] 2.13 将普通 Card route、cardless route、PageScrollShell 消费者和组织同步页局部 header/action/record 间距收敛到共享 route/page shell spacing，避免页面各自叠加第二套外边距
- [x] 2.14 将 `/sysinfo` 纳入 cardless route，并将系统信息页改为共享诊断面板布局：CPU 全宽降高、资源指标等分、API 监控表格在卡内滚动、About 信息降级展示
- [x] 2.15 将 `/server-store` MCP Store 纳入 cardless route，并将筛选工具栏、目录卡片、Tag、链接、添加按钮和长标题截断接入共享 card catalog surface

## 3. 回归验证

- [x] 3.1 补充共享 shell / list page 暗黑主题回归测试，覆盖关键 selector 使用共享 token
- [x] 3.2 运行聚焦 Jest、`yarn typecheck` 和 `git diff --check`
- [x] 3.3 使用前端本地 dev 连接受控测试后台，在暗黑模式下巡检 `/organizations`、`/users`、`/identity-assets`、`/access-wizard`、`/application-usage-access` 和 `/records` 等关键页面
- [x] 3.4 使用 Playwright 复查 `/wecom-org-sync` 暗黑模式滚动边界和 `/access-wizard` 暗黑模式关键 surface/link token
- [x] 3.5 使用 Playwright 复查 `/` 工作区标签栏，确认外层标签壳不再成为纵向滚动容器，横向溢出仍只由内部 viewport 承接
- [x] 3.6 使用 Playwright 复查 `/` 和 `/resources` 暗黑模式 shell 滚动条，确认侧边菜单和正文滚动容器使用共享 scrollbar token 且轨道透明
- [x] 3.7 使用 Playwright 复查 `/groups` 明亮模式顶部 Header，确认 Header 背景、文字和主题 class 与共享 token 一致
- [x] 3.8 使用 Playwright 复查 `/applications` 暗黑模式顶部组织选择器，确认 selector 背景、边框、文字和箭头使用共享 shell token
- [x] 3.9 使用 Playwright 复查 `/groups` 和 `/wecom-org-sync` 暗黑模式查询/配置控件、默认工具按钮、表格正文与列表链接，确认实际渲染颜色落到共享 token 而不是 Ant Design 默认 `rgb(20,20,20)` surface 或偏沉主题紫链接
- [x] 3.10 使用 Playwright 复查 `/platform-api-mappings`、`/organization-tree-operations` 和 `/applications` 暗黑模式，确认非列表 Card 页局部 surface 与默认 Tag 不再使用 Ant Design 默认黑色 surface
- [x] 3.11 使用 Playwright 复查 `/wecom-org-sync` 与 `/feishu-org-sync` 明亮/暗黑模式，确认 cardless 路由使用与普通 Card/List 路由一致的内容间距，且普通 `/applications` 路由仍使用既有 Card margin
- [x] 3.12 使用 Playwright 复查 `/sysinfo` 明亮/暗黑模式，确认系统信息页不再出现旧的大外框窄列布局，工作页标签固定，CPU 指标和 API 数据表按共享诊断面板密度展示
- [x] 3.13 使用 Playwright 复查 `/server-store` 暗黑模式，确认 MCP Store 不再使用旧的大外框纯黑卡片，筛选工具栏和卡片目录使用共享 surface，长标题不挤压“添加”按钮
