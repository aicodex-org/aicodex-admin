## ADDED Requirements

### Requirement: 企业微信组织同步 dry-run 预览
系统 SHALL 允许授权管理员运行企业微信组织同步 dry-run preview，在不提交组织数据写入的前提下计算全量同步的预期本地影响。

#### Scenario: 企业微信预览全量同步影响且不写正式数据
- **WHEN** 授权管理员为目标组织启动企业微信 dry-run preview
- **THEN** 系统 SHALL 使用已配置的企业微信通讯录来源拉取或评估 normalized snapshot
- **AND** 返回部门、用户和关系的聚合 diff summary
- **AND** MUST NOT 写入 `Group`, `User`, WeCom mapping tables, `SourceConnection`, `PlatformDepartment`, `PlatformUser`, `PlatformMembership`, `ExternalIdentity`, `OrgSyncBatch`, Gateway authorization facts 或 final sync run state

#### Scenario: 企业微信预览复用正式同步差异口径
- **WHEN** dry-run preview 比较本次企业微信 snapshot 与 Admin-owned local state
- **THEN** 部门和用户影响 SHALL 至少报告 `toCreate`, `toUpdate`, `toSoftDisable`, `unchanged`, `conflict` 和 `invalid`
- **AND** 关系影响 SHALL 以聚合计数展示用户-部门、部门负责人和直属上级关系的预期变化
- **AND** 统计口径 SHALL 与正式企业微信同步记录中部门、用户和关系变化保持一致

#### Scenario: 企业微信预览失败时 fail closed
- **WHEN** 配置缺失、配置未启用、凭据无效、企业微信通讯录权限不足、provider 响应异常或 snapshot contract 不满足同步必需字段
- **THEN** 系统 SHALL 返回 `failed` dry-run preview，并包含 safe reason alias、safe summary、可用时的 snapshot stats 和 redaction metadata
- **AND** MUST NOT 创建或更新本地组织主数据
- **AND** MUST NOT 暴露 app secret、access token、raw WeCom response body、手机号、邮箱、完整部门树、完整用户列表或私有 endpoint 细节

### Requirement: 企业微信组织同步 dry-run 历史
系统 SHALL 仅使用脱敏聚合 metadata 记录并暴露最近企业微信 dry-run preview 的轻量只读历史。

#### Scenario: 记录企业微信预览脱敏摘要
- **WHEN** 企业微信 dry-run preview 成功或 fail-closed
- **THEN** 系统 SHALL 尝试记录一条 history item，包含 status、safe source aliases、snapshot counts、department/user/relationship diff counts、reason counts、safe diagnostics summary、createdAt、operator hash、request marker hash、retention metadata 和 redaction metadata
- **AND** history 存储失败 SHALL NOT 把 fail-closed preview 转换成成功写入，也 SHALL NOT 阻断 preview response

#### Scenario: 查询企业微信预览历史列表和详情
- **WHEN** 授权管理员查询目标组织的企业微信 dry-run history list/detail
- **THEN** 系统 SHALL 执行与企业微信 sync config 和 runs 相同的组织解析与管理员鉴权
- **AND** list queries MAY 支持 time range、status、diagnostic alias、source alias、limit、topN 和 pagination filters
- **AND** detail responses SHALL 保持只读和脱敏

#### Scenario: 企业微信预览历史不返回敏感明细
- **WHEN** dry-run history 引用 provider data、本地 mappings、request markers 或 operator identity
- **THEN** response data SHALL 仅包含 stable hashes、safe aliases、aggregate counts、safe summaries、retention metadata 和 redaction metadata
- **AND** MUST NOT 返回 raw WeCom payloads、完整组织树、完整用户列表、手机号、邮箱、真实姓名、access tokens、secrets、cookies、private URLs 或超出 safe aliases 的 raw external user identifiers

### Requirement: 企业微信 dry-run preview Admin APIs
系统 SHALL 在现有 `/api/wecom-org-sync/...` 模块命名空间下暴露企业微信 dry-run preview 和轻量 preview history 的管理员 API。

#### Scenario: 企业微信预览 API 使用模块命名空间
- **WHEN** 系统暴露企业微信 dry-run preview 管理 API
- **THEN** APIs SHALL 使用 `/api/wecom-org-sync/dry-run-preview` 和 `/api/wecom-org-sync/dry-run-history`
- **AND** SHALL 使用与现有 `/api/wecom-org-sync/config` 和 `/api/wecom-org-sync/runs` 相同的目标组织解析、鉴权行为和安全错误处理

#### Scenario: 企业微信预览 API 保持只读边界
- **WHEN** 管理员调用 dry-run preview 或 dry-run history APIs
- **THEN** APIs SHALL NOT 启动正式 sync run、修改 sync configuration、更新本地 users 或 groups、写入 platform master data、发布 Gateway projection facts，或读取 API/Gateway/Insight internal stores

### Requirement: 企业微信 dry-run preview Admin UI
Web Admin 企业微信组织同步页面 SHALL 提供紧凑的 dry-run preview 和 preview history 操作，并保持简单基础流程不被打断。

#### Scenario: 企业微信页面展示预览影响入口
- **WHEN** 管理员打开已加载配置的企业微信组织同步页面
- **THEN** 页面 SHALL 在主要同步操作附近展示 `预览影响` action
- **AND** 当目标组织或启用的同步配置缺失时，action SHALL 禁用或展示可操作错误
- **AND** 启动 preview SHALL 展示 loading 和防重复点击保护

#### Scenario: 企业微信预览结果使用弹窗展示
- **WHEN** dry-run preview 返回 succeeded、failed、empty、warning 或 history-warning states
- **THEN** 页面 SHALL 在 Modal 中展示结果，并以紧凑方式呈现部门、用户和关系影响计数
- **AND** Modal SHALL 展示 safe status、safe reason summary、可用时的 redaction/retention markers 和清晰的关闭操作
- **AND** 主页面 SHALL NOT 默认渲染大型 dry-run diagnostics panel

#### Scenario: 企业微信预览历史是低频弹窗入口
- **WHEN** 管理员需要查看最近的企业微信 dry-run previews
- **THEN** 页面 SHALL 在 preview action 附近暴露 `预览历史`
- **AND** history SHALL 在 Modal 或等价二级界面中打开，而不是作为完整表格嵌入主页面
- **AND** loading、empty、error、long text 和 detail states SHALL 被覆盖，并在正常桌面宽度下避免横向溢出

## MODIFIED Requirements

### Requirement: 企业微信同步页面保持简单基础流程
Web Admin 企业微信组织同步页面 SHALL 保持组织同步的简单参考流程，同时与其他 provider 同步页面共享展示约定。

#### Scenario: Preserve simple base workflow
- **WHEN** 管理员打开企业微信组织同步页面
- **THEN** 页面 SHALL 突出目标组织、Corp ID、address book secret、sync options、schedule options、permission guidance、save、connection test、dry-run preview、manual sync 和 formal sync records
- **AND** 页面 SHALL 将企业微信 dry-run preview 和 dry-run history 保持为紧凑二级操作，而不是默认大型面板
- **AND** 页面 SHALL NOT 添加飞书专属 binding diagnostics、handoff evidence 或 acceptance checklist UI

#### Scenario: Align formal run table concepts
- **WHEN** 存在企业微信 sync runs
- **THEN** 表格 SHALL 将 run id、status、trigger type、stage、actor、started time、finished time、department impact、user impact 和 safe error summary 作为独立且便于扫描的概念展示
- **AND** 表格 SHALL 使用与飞书/Lark formal sync records 相同的基础顺序和密度，但保留企业微信没有的 provider-specific columns 差异
