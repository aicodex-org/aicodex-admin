# admin-enterprise-identity-audit-operations-center Specification

## Purpose
TBD - created by archiving change improve-admin-enterprise-audit-operations-center. Update Purpose after archive.
## Requirements
### Requirement: 审计运维中心工作台
Admin 企业认证中心 SHALL 在审计运维分组下将会话、审计记录、令牌和验证记录组织为紧凑运行态核对工作台，使管理员能够从任一审计运维页面理解当前核对域、主要风险和下一步入口，同时保持核心列表为首屏主任务。

#### Scenario: 管理员打开会话核对
- **WHEN** 已登录管理员访问 `/sessions`
- **THEN** 页面展示审计运维运行态核对条，并标记当前核对域为会话核对
- **AND** 页面仍展示既有 Session 表格、分页、搜索和删除行为
- **AND** Session 表格或表格入口在 1440x900 桌面首屏内可感知

#### Scenario: 管理员打开审计记录
- **WHEN** 已登录管理员访问 `/records`
- **THEN** 页面展示审计运维运行态核对条，并标记当前核对域为审计记录
- **AND** 页面仍展示既有 Record 表格、分页、搜索和详情抽屉
- **AND** Record 表格或表格入口在 1440x900 桌面首屏内可感知

#### Scenario: 管理员打开令牌核对
- **WHEN** 已登录管理员访问 `/tokens`
- **THEN** 页面展示审计运维运行态核对条，并标记当前核对域为令牌核对
- **AND** 页面仍展示既有 Token 表格、新增、编辑、删除、分页和搜索行为
- **AND** Token 表格或表格入口在 1440x900 桌面首屏内可感知

#### Scenario: 管理员打开验证核对
- **WHEN** 已登录管理员访问 `/verifications`
- **THEN** 页面展示审计运维运行态核对条，并标记当前核对域为验证核对
- **AND** 页面仍展示既有 Verification 表格、分页和搜索行为
- **AND** Verification 表格或表格入口在 1440x900 桌面首屏内可感知

### Requirement: 运行态摘要与入口聚合
审计运维中心 SHALL 展示当前筛选摘要、四类运行态入口和可处理风险入口；摘要 MUST 明确来自当前列表视图或分页总数，不得包装成真实全量治理事实。

#### Scenario: 当前视图有分页总数
- **WHEN** 当前列表页提供 `pagination.total`
- **THEN** 审计运维工作台展示该核对域的当前可见总数
- **AND** 页面使用当前筛选或分页视图的短标签说明来源

#### Scenario: 当前视图无分页总数
- **WHEN** 当前列表页没有可用分页总数
- **THEN** 审计运维工作台使用当前 data 数量展示可见记录数
- **AND** 不声明这是后端全量记录数

#### Scenario: 管理员查看运维入口
- **WHEN** 管理员查看任一审计运维页面
- **THEN** 页面展示会话核对、审计记录、令牌核对、验证核对四个入口
- **AND** 每个入口跳转到既有路由，不新增不兼容路由或权限 key
- **AND** 四个入口 SHALL 以紧凑 tabs、segmented rail 或同等低高度结构呈现，不在表格前堆叠四张大卡片

### Requirement: 风险核对与敏感信息边界
审计运维中心 SHALL 只展示可扫描的风险类别、状态标签和跳转入口，不得展示 token、验证码、Cookie、client secret 或其它可复用敏感凭据原值。

#### Scenario: 审计记录包含错误状态
- **WHEN** 当前 Record 列表包含 4xx 或 5xx 状态码
- **THEN** 审计运维工作台展示失败或风险核对提示
- **AND** 提供进入审计记录页面的入口

#### Scenario: 当前 Token 列表包含访问令牌
- **WHEN** 当前 Token 列表包含 `accessToken` 字段
- **THEN** 审计运维工作台只展示令牌数量、有效期核对或入口提示
- **AND** 不展示 `accessToken` 原值

#### Scenario: 当前 Verification 列表包含验证码
- **WHEN** 当前 Verification 列表包含 `code` 或 `receiver` 字段
- **THEN** 审计运维工作台只展示验证记录数量、未使用状态或入口提示
- **AND** 不展示验证码原值或接收者敏感明细

### Requirement: 企业管理台视觉与响应式
审计运维中心 SHALL 复用企业认证中心视觉语言，使用安静、信息密度合理的管理台布局，避免营销式 hero、装饰背景、卡片套卡片，并在桌面和窄屏上保持可读可操作。

#### Scenario: 桌面端扫描审计运维
- **WHEN** 管理员在桌面端访问任一审计运维页面
- **THEN** 工作台展示紧凑页头、运行态摘要、当前核对入口、风险核对和表格承载区
- **AND** 文案服务于操作决策
- **AND** 浏览器验证 SHALL 记录对应表格或表格入口的 y 坐标

#### Scenario: 窄屏访问审计运维
- **WHEN** 管理员在窄屏或移动端访问任一审计运维页面
- **THEN** 文本、按钮、入口、状态标签和表格区域不发生重叠或不可读溢出
- **AND** 页头、入口和摘要 SHALL 使用紧凑间距，避免移动端列表被大面积空白推到深滚动位置
- **AND** 四类核对入口仍可触达

#### Scenario: 只读工作台不触发执行
- **WHEN** 管理员点击工作台中的入口或查看风险摘要
- **THEN** 页面只跳转既有路由或展示只读说明
- **AND** 不触发认证、授权、会话清理、令牌签发、验证码重发、组织同步或 Gateway projection publish

### Requirement: 审计运维分页列表治理壳一致性
Admin 企业认证中心 SHALL 将审计运维下的登录会话、操作日志、令牌管理和验证码记录分页列表对齐统一列表治理壳，移除重复摘要块，使查询、更多筛选、按钮、行操作和分页样式保持一致。

#### Scenario: 审计运维列表不展示重复摘要块
- **WHEN** 管理员访问 `/sessions`、`/records`、`/tokens` 或 `/verifications`
- **THEN** 页面 SHALL NOT 在表格前展示审计运维摘要、统计卡片、入口卡片或风险提示卡片
- **AND** 当前页面语义 SHALL 由左侧菜单、顶部 tab 和列表标题表达
- **AND** 表格标题、搜索栏和表格在桌面首屏内更靠前可见

#### Scenario: 审计运维列表使用统一查询入口
- **WHEN** 管理员查看任一审计运维分页列表
- **THEN** 页面使用统一列表标题区展示列表名称和可用操作
- **AND** 页面使用统一基础搜索字段选择、关键字输入、查询、重置和更多筛选入口
- **AND** 表头不再默认展示每列搜索图标

#### Scenario: 审计运维列表避免横向滚动和敏感长字段噪声
- **WHEN** 管理员在桌面宽度查看 `/sessions`、`/records`、`/tokens` 或 `/verifications`
- **THEN** 列表内容区域 SHALL NOT 因 `max-content` 表格宽度或长令牌文本产生横向滚动条
- **AND** 令牌授权码、访问令牌和验证码 SHALL NOT 在列表列中直接展示
- **AND** 对应字段可继续作为该页面的查询字段参与搜索

#### Scenario: 审计运维列表默认 20 条时固定表头
- **WHEN** 管理员在桌面宽度以默认分页大小查看审计运维分页列表
- **THEN** 列表标题、查询工具栏和表格表头 SHALL 保持在页面上方
- **AND** 纵向滚动 SHALL 发生在表格数据区，而不是带走整个页面头部
- **AND** 展开更多筛选时表格数据区高度 SHALL 相应收缩，避免分页被挤出视口

#### Scenario: 审计运维列表保留既有业务行为
- **WHEN** 管理员在四个审计运维分页列表中搜索、排序、翻页、查看详情、新增令牌、编辑令牌、删除令牌或删除会话
- **THEN** 页面继续使用既有后端分页、搜索、排序和操作 API 契约
- **AND** 不新增不兼容路由、权限 key 或真实运行态执行动作

#### Scenario: 登录会话列表表达用户与应用语义
- **WHEN** 管理员查看 `/sessions`
- **THEN** 侧边导航和列表标题 SHALL 使用“登录会话”表达当前页面
- **AND** 原 `name` 字段 SHALL 在列表中展示为“用户”
- **AND** 列表 SHALL 展示应用列，以表达会话数据的 `组织 / 用户 / 应用` 粒度
- **AND** 路由、后端字段名和删除会话行为 SHALL 保持兼容

#### Scenario: 登录会话列表收敛大量 Session ID 展示
- **WHEN** 某条登录会话记录包含超过 2 个 Session ID
- **THEN** 列表 SHALL 只直接展示前 2 个 Session ID
- **AND** 页面 SHALL 使用“+N 更多”入口打开右侧抽屉查看全部 Session ID
- **AND** 单个 Session ID 删除确认 SHALL 表达为“踢出该会话”
- **AND** 行级删除确认 SHALL 表达为删除该应用下全部会话
- **AND** 列表行高 SHALL NOT 因大量历史 Session ID 被撑成大块空白

#### Scenario: 操作日志详情抽屉可滚动查看完整内容
- **WHEN** 管理员在操作日志列表打开任一记录详情
- **THEN** 详情 SHALL 保留右侧抽屉查看模式
- **AND** 抽屉内容 SHALL 使用内部滚动容器承载摘要、技术请求详情、脱敏响应和脱敏对象载荷
- **AND** 内容较多时管理员 SHALL 能滚动到抽屉底部
- **AND** 脱敏对象载荷 SHALL 跟随抽屉主滚动展示，避免同时出现抽屉滚动和对象区域内置滚动
- **AND** 脱敏响应和脱敏对象载荷 SHALL 提供低噪声复制入口
- **AND** 复制入口 SHALL 只复制脱敏后的展示内容

#### Scenario: 审计运维列表不影响其它列表壳配置
- **WHEN** 本变更实施后
- **THEN** 公共列表壳的全局样式变量和已调优的组织、群组、资源、证书、密钥、Webhook 等列表页布局 SHALL NOT 因本变更被修改
- **AND** 审计运维差异 SHALL 通过审计运维局部 class 或页面级调用参数表达

