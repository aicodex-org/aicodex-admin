## MODIFIED Requirements

### Requirement: 用量接入页面聚焦服务凭据治理
`用量接入` 页面 SHALL 承接原 `应用接入中心` 中的服务凭据治理详细能力，至少覆盖 `Insight provider trust`、`Usage identity resolver`、`Gateway organization projection` 和 `Keep in env/config` 四类治理项的状态、治理配置、保存配置、诊断/预检、交接包预览、owner 边界和下一步入口。

#### Scenario: 页面展示四类治理项
- **WHEN** 管理员打开 `/application-usage-access` 且服务凭据治理状态或配置可用
- **THEN** 页面 SHALL 展示 `Insight provider trust`、`Usage identity resolver`、`Gateway organization projection` 和 `Keep in env/config` 四类治理项
- **AND** 首屏 SHALL 优先展示服务接入总状态、一个明确下一步动作和必填配置入口
- **AND** 每项 SHALL 展示脱敏的人类可读状态、缺口摘要和下一步入口
- **AND** 页面 SHALL 展示 `保存配置`、`刷新状态`、`读取配置`、`Dry-run/Readiness`、`Doctor` 和 `Handoff/Evidence` 动作
- **AND** reason code、stable alias、owner/provenance、handoff schema、metadata 和 evidence payload SHALL 默认收纳在低优先级高级信息折叠区

#### Scenario: 页面不扩成泛配置中心
- **WHEN** 管理员查看 `用量接入`
- **THEN** 页面 SHALL NOT 展示与用量链路无直接关系的 OAuth client、普通 Application 编辑、资源、证书、密钥、Webhook、Gateway API 映射或 Insight 内部配置表单作为主内容
- **AND** 这些通用入口 MAY 作为低噪上下文链接指向既有页面

### Requirement: 用量接入 copy-safe 安全边界
`用量接入` 页面 SHALL 只处理 Admin-owned 身份、组织、resolver、projection 和服务间凭据入口治理配置，不得承接 API/Gateway 或 Insight 自己的 truth，也不得执行真实下游动作。

#### Scenario: 页面保持运行态只读
- **WHEN** 页面渲染状态、诊断摘要、交接包摘要或下一步入口
- **THEN** Admin SHALL NOT 触发 resolver outbound call、Gateway publish 或 refresh、API/Gateway/Insight 写入、OAuth/OIDC callback、provider login、组织同步、DB fixture 写入或 runtime secret resolution
- **AND** 页面保存的仅为 Admin-owned 服务凭据治理配置别名、状态和策略摘要
- **AND** 页面 SHALL 明确显示 copy-safe 边界

#### Scenario: 页面保持脱敏
- **WHEN** 页面展示服务凭据治理状态、配置、诊断或交接包信息
- **THEN** UI SHALL render only sanitized group labels, human-readable statuses, copy-safe summaries, credential reference presence, caller policy presence or alias, bounded runtime policy summary, keep-in-env/cannot-infer status and next-action fields
- **AND** 首屏 MUST NOT render reason code, raw policy or boundary tags, owner/provenance details, doctor metadata, evidence payload, trace/debug fields, raw secret references, complete private URLs, token values, Authorization headers, Cookies, DSNs, client secrets, private keys, raw provider responses, raw downstream responses, raw ids, real accounts or complete organization trees
- **AND** advanced diagnostics MAY expose copy-safe aliases and metadata only inside collapsed `高级信息` or `诊断详情` sections
