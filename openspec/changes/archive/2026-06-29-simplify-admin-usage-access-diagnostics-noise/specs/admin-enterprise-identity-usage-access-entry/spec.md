## MODIFIED Requirements

### Requirement: 用量接入页面聚焦服务凭据治理
`用量接入` 页面 SHALL 承接原 `应用接入中心` 中与 Admin 服务凭据治理直接相关的交接包能力，以 KISS 方式展示 `待补配置` 或 `Admin 交接包`，并避免成为新的配置中心或诊断中心。

#### Scenario: 页面展示四类治理项
- **WHEN** 管理员打开 `/application-usage-access` 且服务凭据治理状态或配置可用
- **THEN** 页面 SHALL 保留 `应用接入 / 用量接入` 面包屑和 `用量接入` 标题
- **AND** 页头 SHALL NOT 展示副标题说明文案，避免首屏重复解释 owner 边界
- **AND** 页头 SHALL NOT 将 API/Gateway 映射作为主操作入口，避免把 Admin 页面误导成 Gateway truth 配置中心
- **AND** 页头 SHALL NOT 重复展示可由左侧导航到达的横向快捷入口，避免分散交接包检查的主任务注意力
- **AND** 首屏 SHALL 优先展示服务凭据治理总状态、一个明确下一步动作和主工作区
- **AND** 当存在 Admin 部署配置缺口时，主工作区 SHALL 展示 `待补配置`，列出需要补到 Admin env/config 或部署私有配置的 key，并提示补齐后重启 Admin 再刷新本页
- **AND** 当不存在 Admin 部署配置缺口时，主工作区 SHALL 展示 `Admin 交接包`，并提供 `生成 Admin 交接包` 动作
- **AND** 交接包生成后 SHALL 提供明确的 copy-safe JSON 复制动作，作为 Insight 获取 Admin provider 辅助交接材料的默认方式
- **AND** 页面 SHALL NOT 在 UI 内保存 secret、凭据引用、调用策略或运行策略修正
- **AND** 页面 SHALL NOT 展示 `高级修正` 折叠区，且 SHALL NOT 暴露与读取当前值语义重复的恢复回读入口
- **AND** 页面 SHALL NOT 展示 `Dry-run/Readiness`、`Doctor`、诊断详情、排障详情、保存修正、读取当前值或二级机器字段
- **AND** reason code、stable alias、owner/provenance、handoff schema、metadata、doctor detail 和 evidence payload SHALL NOT 在 UI 中展示；需要排障时以开发日志或后续专门诊断入口处理

### Requirement: 用量接入 copy-safe 安全边界
`用量接入` 页面 SHALL 只处理 Admin-owned 身份、组织、resolver、projection 和服务间凭据入口治理配置，不得承接 API/Gateway 或 Insight 自己的 truth，也不得执行真实下游动作。

#### Scenario: 页面保持脱敏
- **WHEN** 页面展示服务凭据治理状态、配置、诊断或交接包信息
- **THEN** UI SHALL render only sanitized group labels, human-readable statuses, copy-safe summaries, credential reference presence, caller policy presence or alias, bounded runtime policy summary, keep-in-env/cannot-infer status and next-action fields
- **AND** 首屏 MUST NOT render reason code, raw policy or boundary tags, owner/provenance details, doctor metadata, evidence payload, trace/debug fields, raw secret references, complete private URLs, token values, Authorization headers, Cookies, DSNs, client secrets, private keys, raw provider responses, raw downstream responses, raw ids, real accounts or complete organization trees
- **AND** UI SHALL NOT render advanced diagnostic aliases or metadata; the first version SHALL keep only copy-safe human-readable status, next action, deployment-config gap hints, and Admin handoff package generation/copy actions
- **AND** generated Admin handoff package SHALL NOT include API/Gateway usage facts or API/Gateway provider runtime truth
- **AND** groups whose status is `not_applicable` SHALL NOT be converted to runtime `ready`; UI and package summaries SHALL preserve `cannot_infer` semantics when Admin cannot infer downstream runtime truth
