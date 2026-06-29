# organization-directory-source-status Specification

## Purpose
TBD - created by archiving change unify-organization-directory-source-status. Update Purpose after archive.
## Requirements
### Requirement: 系统 SHALL 提供统一组织通讯录来源状态
系统 SHALL 为每个 Admin 业务组织提供统一的通讯录来源状态，覆盖当前已支持的 WeCom、Feishu/Lark，并预留 DingTalk source type。状态 SHALL 区分无来源、当前 Provider 独占、被另一 Provider 占用、以及同组织存在多个已配置来源的数据异常。

#### Scenario: 无已配置通讯录来源时返回可配置状态
- **WHEN** 管理员查询一个没有 WeCom、Feishu/Lark 或其他已注册通讯录来源配置的业务组织
- **THEN** 系统 SHALL 返回 `state=available`
- **AND** 响应 SHALL 不包含任何 provider secret、access token、refresh token、Cookie 或原始外部通讯录响应

#### Scenario: 当前 Provider 是唯一已配置来源
- **WHEN** 管理员在某个 Provider 同步页面查询目标组织
- **AND** 该组织只有同一 Provider 的通讯录同步配置
- **THEN** 系统 SHALL 返回 `state=owned`
- **AND** 响应 SHALL 标识 owning source type、display name、configured/enabled 状态和目标组织

#### Scenario: 另一 Provider 是唯一已配置来源
- **WHEN** 管理员在某个 Provider 同步页面查询目标组织
- **AND** 该组织只有另一 Provider 的通讯录同步配置
- **THEN** 系统 SHALL 返回 `state=occupied`
- **AND** 响应 SHALL 标识 occupying source type、display name、configured/enabled 状态和目标组织

#### Scenario: 同组织存在多个已配置来源
- **WHEN** 一个业务组织同时存在两个或更多已配置通讯录来源
- **THEN** 系统 SHALL 返回 `state=ambiguous`
- **AND** 响应 SHALL 包含脱敏 source 摘要列表
- **AND** 系统 SHALL NOT 把该状态展示或处理为普通单来源占用

### Requirement: 系统 SHALL 提供统一通讯录来源执行判定
系统 SHALL 提供统一的执行判定能力，用于保存配置、手动同步和定时同步派发前判断目标组织是否允许当前 Provider 写入或执行。

#### Scenario: 允许当前唯一来源继续保存或同步
- **WHEN** 当前 Provider 是目标组织唯一已配置通讯录来源
- **THEN** 统一判定 SHALL 返回 `allowed=true`
- **AND** 调用方 MAY 继续保存当前 Provider 配置、启动手动同步或派发定时同步

#### Scenario: 拒绝被其他来源占用的组织
- **WHEN** 目标组织已被另一个通讯录来源配置占用
- **THEN** 统一判定 SHALL 返回 `allowed=false`
- **AND** reason code SHALL 为 `source_occupied`
- **AND** 响应或错误摘要 SHALL 标识占用 Provider 和目标组织，但 MUST NOT 暴露凭据或原始 provider 响应

#### Scenario: 拒绝异常双配置组织
- **WHEN** 目标组织存在多个已配置通讯录来源
- **THEN** 统一判定 SHALL 返回 `allowed=false`
- **AND** reason code SHALL 为 `source_ambiguous`
- **AND** 调用方 SHALL fail closed，不创建同步 run、不派发定时任务、不保存新的配置覆盖

#### Scenario: 状态查询失败时 fail closed
- **WHEN** 统一状态查询无法可靠读取目标组织的通讯录来源状态
- **THEN** 统一判定 SHALL 返回 `allowed=false`
- **AND** reason code SHALL 为 `source_status_unavailable`
- **AND** 调用方 SHALL 返回安全错误或记录安全调度失败原因

### Requirement: 统一状态接口 SHALL 支持 Provider 候选组织过滤
统一状态接口 SHALL 返回当前 Provider 可选择的候选组织占用摘要，使同步页可以过滤已被其他来源占用的组织，同时保留当前已选中的异常组织用于解释只读原因。

#### Scenario: 返回当前 Provider 的被占用组织列表
- **WHEN** 同步页面请求当前 Provider 的组织候选状态
- **THEN** 系统 SHALL 返回被其他通讯录来源占用的组织列表
- **AND** 每个条目 SHALL 使用 source type、display name、organization 和 state 表达占用原因

#### Scenario: 预留 DingTalk source type
- **WHEN** 统一状态模型枚举通讯录来源类型
- **THEN** 模型 SHALL 支持 `wecom`、`lark` 和 `dingtalk` source type
- **AND** P0 SHALL NOT 要求实现 DingTalk 配置、同步、页面或调度 executor
