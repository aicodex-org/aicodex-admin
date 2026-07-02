# dingtalk-organization-sync Specification

## Purpose
定义 Admin 钉钉组织架构同步的配置、钉钉通讯录读取、差异同步、映射持久化、管理 API、Web Admin 页面、定时调度和单通讯录来源守卫要求。
## Requirements
### Requirement: 钉钉组织同步配置
系统 SHALL 允许授权管理员为非 `built-in` Admin 目标组织配置一个钉钉组织同步来源，配置内容包括 `appKey`、`appSecret`、同步启用状态、缺失数据软禁用行为和定时调度设置。

#### Scenario: 保存有效钉钉同步配置
- **WHEN** 授权管理员保存包含目标组织、`appKey` 和 `appSecret` 的钉钉同步配置
- **THEN** 系统 SHALL 持久化配置
- **AND** 后续配置响应 SHALL 脱敏 `appSecret`

#### Scenario: 拒绝不完整钉钉同步配置
- **WHEN** 授权管理员保存缺少目标组织、`appKey` 或 `appSecret` 的钉钉同步配置
- **THEN** 系统 SHALL 拒绝请求并返回指出缺失字段的验证错误

#### Scenario: 拒绝 built-in 钉钉同步目标
- **WHEN** 管理员尝试为 `built-in` 保存或执行钉钉组织同步
- **THEN** 系统 SHALL 在写入配置或创建同步 run 前拒绝请求

#### Scenario: 更新配置时保留已保存密钥
- **WHEN** 管理员更新非密钥字段并提交已脱敏密钥占位符
- **THEN** 系统 SHALL 保留原已保存 `appSecret`
- **AND** MUST NOT 把占位符当作真实密钥持久化

### Requirement: 钉钉公开通讯录 API 数据源
系统 SHALL 从钉钉公开服务端通讯录 API 构建组织同步数据，并且 SHALL NOT 依赖未公开的钉钉内部表或私有字段。

#### Scenario: 规范化钉钉部门和成员快照
- **WHEN** 钉钉客户端拉取通讯录数据
- **THEN** 客户端 SHALL 将部门标识、父部门标识、部门负责人标识、用户标识、用户部门归属、主部门、部门内负责人标记、直属上级标识和用户状态规范化为内部快照格式

#### Scenario: 连接测试不写本地组织主数据
- **WHEN** 授权管理员测试钉钉配置
- **THEN** 系统 SHALL 验证 access token、部门读取和成员读取能力
- **AND** MUST NOT 创建或更新本地 users、groups、mappings 或 sync runs

#### Scenario: 安全返回钉钉 API 错误
- **WHEN** 钉钉凭据无效、权限不足、接口限流或响应格式不符合预期
- **THEN** 系统 SHALL 返回安全错误摘要
- **AND** MUST NOT 暴露 `appSecret`、access token、原始响应体、手机号、邮箱、完整部门树、完整用户列表、Cookie 或私有 URL

### Requirement: 手动钉钉全量差异同步
系统 SHALL 允许授权管理员为目标组织手动启动一次钉钉全量差异同步。

#### Scenario: 启动钉钉全量同步
- **WHEN** 授权管理员为已启用配置请求钉钉全量同步
- **THEN** 系统 SHALL 创建钉钉同步 run 记录
- **AND** 开始拉取目标组织的钉钉部门、成员、部门负责人、直属上级关系和成员部门归属

#### Scenario: 防止重复运行钉钉同步
- **WHEN** 同一目标组织已有 running DingTalk sync run 且租约未过期
- **THEN** 系统 SHALL 以明确的进行中错误拒绝新的 run

#### Scenario: 恢复过期 running 钉钉同步
- **WHEN** 上一次 running run 的 lease 已过期
- **THEN** 系统 MAY 在启动新 run 前将该过期 run 标记为失败
- **AND** MUST NOT 使用该过期 run 参与缺失数据软禁用决策

#### Scenario: 钉钉同步不得清空重建
- **WHEN** 钉钉全量同步开始
- **THEN** 系统 MUST NOT 在应用差异变更前清空既有本地 users、groups、memberships、直属上级关系、mappings 或平台主数据

### Requirement: 钉钉同步映射持久化
系统 SHALL 在核心 Group 和 User 字段之外持久化钉钉专属部门、用户、成员部门、部门负责人和直属上级映射数据，同时保留可查询的本地关系。

#### Scenario: 持久化钉钉部门映射
- **WHEN** 钉钉部门被同步
- **THEN** 系统 SHALL 保存应用身份、部门 ID、本地 group 引用、父部门、显示名称、排序、负责人缓存、启用状态、最近可见 run 和 `last_synced_at`

#### Scenario: 持久化钉钉成员映射
- **WHEN** 钉钉成员被同步
- **THEN** 系统 SHALL 保存应用身份、钉钉用户 ID、可用时的 union ID、本地 user 引用、长度安全的外部 ID、主部门、状态、启用状态、最近可见 run 和 `last_synced_at`

#### Scenario: 持久化钉钉成员部门关系
- **WHEN** 钉钉成员属于一个或多个部门
- **THEN** 系统 SHALL 保存每个用户-部门关系及其主部门和部门负责人标记
- **AND** SHALL 只更新钉钉来源的本地部门 group memberships，并保留非钉钉 groups

#### Scenario: 持久化钉钉负责人和直属上级关系
- **WHEN** 钉钉部门或成员响应包含部门负责人或主管用户 ID
- **THEN** 系统 SHALL 将这些关系保存到专用可查询表，并记录启用状态、最近可见 run 和 `last_synced_at`

### Requirement: 钉钉组织同步持久化 schema
系统 SHALL 为钉钉同步配置、同步 run、部门映射、用户映射、成员部门映射、部门负责人和直属上级定义由 Xorm 管理的持久化对象。

#### Scenario: 创建钉钉同步表
- **WHEN** 应用初始化数据库表
- **THEN** 系统 SHALL 能通过现有 Xorm 增量式表同步路径创建或更新钉钉同步表

#### Scenario: 使用稳定唯一身份
- **WHEN** 钉钉部门、用户或关系被重复同步
- **THEN** 系统 SHALL 使用 organization、应用身份和钉钉外部 ID 作为稳定唯一身份
- **AND** SHALL NOT 为同一外部实体创建重复 mapping 或关系记录

#### Scenario: 使用真实时间和布尔字段
- **WHEN** PostgreSQL 中创建钉钉同步记录
- **THEN** timestamp 字段 SHALL 使用 Go time 字段和 `timestamptz` 语义
- **AND** boolean 字段 SHALL 使用 Go `bool` 字段和明确的 JSON/Xorm tags

### Requirement: 钉钉组织同步管理 API
系统 SHALL 暴露用于钉钉同步配置、连接测试、手动执行和同步 run 查看管理的管理员 API。

#### Scenario: 使用模块 API 命名空间
- **WHEN** 系统暴露钉钉组织同步 API
- **THEN** API SHALL 使用 `/api/dingtalk-org-sync/...`
- **AND** SHALL NOT 新增旧式 `/api/get-*`、`/api/update-*` 或 `/api/run-*` 路径

#### Scenario: 管理钉钉同步配置
- **WHEN** 授权管理员读取或更新 `/api/dingtalk-org-sync/config`
- **THEN** 系统 SHALL 返回或持久化目标组织的钉钉配置，并脱敏 `appSecret`

#### Scenario: 测试钉钉同步配置
- **WHEN** 授权管理员调用 `/api/dingtalk-org-sync/config/test`
- **THEN** 系统 SHALL 验证 token、部门和用户读取权限，并且不写入本地组织数据

#### Scenario: 启动钉钉同步
- **WHEN** 授权管理员请求 `/api/dingtalk-org-sync/runs`
- **THEN** 系统 SHALL 返回已创建的同步 run 身份，或返回重复运行错误

#### Scenario: 查询钉钉同步记录
- **WHEN** 授权管理员查询 `/api/dingtalk-org-sync/runs` 或 `/api/dingtalk-org-sync/runs/:runId`
- **THEN** 系统 SHALL 返回状态、触发类型、阶段、执行人、时间戳、汇总计数和安全错误摘要，且不暴露密钥

### Requirement: 钉钉组织同步管理页面
Web Admin SHALL 为基础同步流程提供紧凑的钉钉组织同步页面。

#### Scenario: 展示钉钉同步入口和页面
- **WHEN** 管理员打开身份控制台管理导航
- **THEN** 页面 SHALL 提供 `钉钉同步` 导航入口
- **AND** 路由 `/dingtalk-org-sync` SHALL 渲染钉钉同步页面

#### Scenario: 配置钉钉同步
- **WHEN** 管理员打开钉钉同步页面
- **THEN** 页面 SHALL 展示目标组织、AppKey、脱敏 AppSecret、启用状态、软禁用、定时设置、连接测试、手动同步动作和正式同步记录

#### Scenario: 钉钉同步记录保持紧凑扫读
- **WHEN** 存在钉钉同步 run
- **THEN** 表格 SHALL 将序号、状态、触发类型、阶段、执行人、开始时间、完成时间、部门影响、用户影响、关系影响和安全错误摘要作为便于扫读的独立概念展示

#### Scenario: 钉钉页面覆盖基础状态
- **WHEN** 页面加载、保存、测试、同步、无记录、收到错误或检测到来源冲突
- **THEN** 页面 SHALL 展示加载、提交中、空态、错误、冲突和禁用状态，且不产生页面级横向溢出

### Requirement: 钉钉同步 SHALL 与其他通讯录来源保持单一已配置主数据源
系统 SHALL 防止同一 Admin 业务组织在已经配置另一种通讯录同步来源时再配置钉钉组织同步。

#### Scenario: 拒绝在其他来源已配置组织中保存钉钉配置
- **WHEN** 授权管理员保存钉钉同步配置
- **AND** 同一目标组织已配置 WeCom 或 Feishu/Lark 同步配置
- **THEN** 系统 SHALL 拒绝保存，并返回能标识冲突 Provider 和目标组织的验证错误

#### Scenario: 阻止冲突钉钉同步执行
- **WHEN** 已被其他通讯录来源配置占用的目标组织请求钉钉手动同步 run
- **THEN** 系统 SHALL 在创建钉钉同步 run 记录前拒绝该 run

#### Scenario: 展示钉钉冲突提示
- **WHEN** 钉钉同步页面加载一个已被其他来源占用的目标组织
- **THEN** 页面 SHALL 展示占用来源警告
- **AND** SHALL 在占用状态下阻止保存、启用同步或启动全量同步

#### Scenario: 过滤已被其他来源占用的钉钉候选组织
- **WHEN** 钉钉同步页面收到已被其他通讯录来源占用的组织
- **THEN** 组织选择器 SHALL 从候选项中排除这些已占用组织
