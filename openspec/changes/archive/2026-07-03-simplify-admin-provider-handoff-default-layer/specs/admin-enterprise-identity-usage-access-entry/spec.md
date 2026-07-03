## MODIFIED Requirements

### Requirement: 用量接入二级入口

`用量接入` 页面 SHALL 作为唯一的 `Insight Admin Provider` copy-safe metadata 交接入口，承接 Admin 身份、组织、resolver、projection/trust 和 owner evidence readiness 摘要，并生成 Insight Profile 可消费的 Admin handoff package。

#### Scenario: 入口表达为低噪声 Insight Admin Provider 交接

- **WHEN** 管理员打开 Admin 侧用量接入页面
- **THEN** 页面 SHALL 将主标题或主面板表达为 `Insight Admin Provider` 交接/状态
- **AND** 页面 SHALL 默认展示整体交接状态、目标消费方 `Insight`、包类型 `copy-safe metadata`、下一步 action 和 `生成 Admin 交接包` 主动作
- **AND** 页面 SHALL 将 P0 边界说明降级为一句低噪提示或帮助说明
- **AND** 页面 SHALL NOT 表达为 API/Gateway 用量 provider 配置中心
- **AND** 页面 SHALL NOT 将旧 `服务凭据治理`、旧 handoff summary 或旧用量配置中心作为默认入口、标题、tab、按钮或高级区
- **AND** 页面 SHALL NOT 在默认层铺开 wrapper route、owner alias、stable alias、blocked alias、reason code 或逐项 owner evidence 明细
- **AND** 这些 wrapper/owner/capability 诊断信息 MAY 只在默认收起的 `诊断详情` 或 `技术细节` 中展示

#### Scenario: 缺失状态以单一阻断摘要表达

- **WHEN** Admin handoff 状态为 partial、missing 或 blocked
- **THEN** 页面默认层 SHALL 展示一个人可读阻断摘要
- **AND** 页面默认层 SHALL 展示一个可操作修复建议，指向 manual/secretRef binding、Admin 部署配置或外部 secret system 维护
- **AND** 页面 SHALL NOT 要求操作者先理解 `admin_outbound_resolver`、`admin_gateway_projection_producer` 或同类内部 alias 才能判断下一步

### Requirement: 用量接入页面聚焦服务凭据治理

`用量接入` 页面 SHALL 以 KISS 方式展示 `Insight Admin Provider` 交接状态和 copy-safe package 动作；旧服务凭据治理配置、诊断、修正或 provider 配置中心 UI SHALL NOT 作为默认产品 surface 保留。

#### Scenario: 页面展示交接摘要和折叠诊断

- **WHEN** 管理员打开 `/application-usage-access` 且 Admin owner evidence 状态或配置可用
- **THEN** 页面 SHALL 保留 `应用接入 / 用量接入 / Admin Provider` 面包屑语义，并将页面标题或主面板表达为 `Insight Admin Provider` 交接
- **AND** 页头 SHALL NOT 展示副标题说明文案，避免首屏重复解释 owner 边界
- **AND** 页头 SHALL NOT 将 API/Gateway 映射作为主操作入口，避免把 Admin 页面误导成 Gateway truth 配置中心
- **AND** 页头 SHALL NOT 重复展示可由左侧导航到达的横向快捷入口，避免分散交接包检查的主任务注意力
- **AND** 首屏 SHALL 优先展示交接状态、一个明确下一步动作、目标消费方、包类型和 copy-safe 交接操作
- **AND** 当存在 Admin 部署配置或凭据引用缺口时，默认层 SHALL 仅展示一条阻断摘要和一条修复建议，不在主工作区重复铺开技术 key 或多条诊断提示
- **AND** 当不存在阻断性缺口时，主工作区 SHALL 展示 `生成 Admin 交接包` 动作
- **AND** 交接包生成后 SHALL 提供明确的 copy-safe JSON 复制动作，作为 Insight 获取 Admin provider 辅助交接材料的默认方式
- **AND** 页面 SHALL NOT 在 UI 内保存 secret、凭据引用、调用策略或运行策略修正
- **AND** 页面 SHALL NOT 展示 `服务凭据治理`、`高级修正`、旧 handoff summary、旧配置保存、旧诊断、`Dry-run/Readiness`、`Doctor`、排障详情、读取当前值或二级机器字段作为默认入口
- **AND** reason code、stable alias、handoff schema、metadata、doctor detail、evidence payload、raw payload、raw id、真实账号和完整组织树 SHALL NOT 在默认层展示
- **AND** copy-safe wrapper route、owner alias、source class、capability/evidence 明细和缺失部署 key MAY 只在 `诊断详情` / `技术细节` 折叠区或同等低噪详情中展示
