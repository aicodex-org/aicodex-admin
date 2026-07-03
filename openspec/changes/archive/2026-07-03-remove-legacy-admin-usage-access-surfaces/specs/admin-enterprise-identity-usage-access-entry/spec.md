## MODIFIED Requirements

### Requirement: 用量接入二级入口

`用量接入` 页面 SHALL 作为唯一的 `Insight Admin Provider` copy-safe metadata 交接入口，承接 Admin 身份、组织、resolver、projection/trust 和 owner evidence readiness 摘要，并生成 Insight Profile 可消费的 Admin handoff package。

#### Scenario: 入口表达为 Insight Admin Provider 交接

- **WHEN** 管理员打开 Admin 侧用量接入页面
- **THEN** 页面 SHALL 将主标题或主面板表达为 `Insight Admin Provider` 交接/状态
- **AND** 页面 SHALL 明确 Admin 只提供身份、组织、resolver、projection/trust、owner evidence 和 wrapper 能力摘要
- **AND** 页面 SHALL 默认展示交接状态、下一步、目标消费方和包类型
- **AND** 页面 SHALL 将 P0 边界说明降级为一句低噪提示或帮助说明
- **AND** 页面 SHALL NOT 表达为 API/Gateway 用量 provider 配置中心
- **AND** 页面 SHALL NOT 将旧 `服务凭据治理`、旧 handoff summary 或旧用量配置中心作为默认入口、标题、tab、按钮或高级区

### Requirement: 用量接入页面聚焦服务凭据治理

`用量接入` 页面 SHALL 以 KISS 方式展示 `Insight Admin Provider` 交接状态、能力状态和 copy-safe package 动作；旧服务凭据治理配置、诊断、修正或 provider 配置中心 UI SHALL NOT 作为默认产品 surface 保留。

#### Scenario: 页面展示交接摘要和能力状态
- **WHEN** 管理员打开 `/application-usage-access` 且 Admin owner evidence 状态或配置可用
- **THEN** 页面 SHALL 保留 `应用接入 / 用量接入 / Admin Provider` 面包屑语义，并将页面标题或主面板表达为 `Insight Admin Provider` 交接
- **AND** 页头 SHALL NOT 展示副标题说明文案，避免首屏重复解释 owner 边界
- **AND** 页头 SHALL NOT 将 API/Gateway 映射作为主操作入口，避免把 Admin 页面误导成 Gateway truth 配置中心
- **AND** 页头 SHALL NOT 重复展示可由左侧导航到达的横向快捷入口，避免分散交接包检查的主任务注意力
- **AND** 首屏 SHALL 优先展示交接状态、一个明确下一步动作、目标消费方、包类型和人可读交接能力清单
- **AND** 当存在 Admin 部署配置缺口时，主工作区 SHALL 提示需补齐 Admin env/config 后生成，不在默认层铺开技术 key
- **AND** 当不存在 Admin 部署配置缺口时，主工作区 SHALL 展示 copy-safe 交接操作，并提供 `生成 Admin 交接包` 动作
- **AND** 交接包生成后 SHALL 提供明确的 copy-safe JSON 复制动作，作为 Insight 获取 Admin provider 辅助交接材料的默认方式
- **AND** 页面 SHALL NOT 在 UI 内保存 secret、凭据引用、调用策略或运行策略修正
- **AND** 页面 SHALL NOT 展示 `服务凭据治理`、`高级修正`、旧 handoff summary、旧配置保存、旧诊断、`Dry-run/Readiness`、`Doctor`、排障详情、读取当前值或二级机器字段作为默认入口
- **AND** reason code、stable alias、handoff schema、metadata、doctor detail、evidence payload、raw payload、raw id、真实账号和完整组织树 SHALL NOT 在 UI 中展示
- **AND** copy-safe wrapper route、owner alias、source class 和缺失部署 key MAY 只在 `技术细节` 折叠区或同等低噪详情中展示

### Requirement: 用量接入覆盖基础页面状态

`用量接入` 页面 SHALL 覆盖加载、错误、无可用交接配置和窄屏状态，并保持管理员可继续前往既有应用接入、Provider、API 映射或审计入口。

#### Scenario: 加载错误和空态
- **WHEN** Insight Admin Provider 交接状态或交接配置请求加载中、失败、被拒绝或返回空治理项
- **THEN** 页面 SHALL 展示紧凑 loading、error、unavailable 或 empty state
- **AND** 页面 SHALL 保留进入 `应用接入中心`、Provider、API 映射或审计记录的低噪入口
- **AND** 页面 SHALL NOT 因局部错误阻断 Admin 壳层导航
- **AND** 页面 SHALL NOT 使用旧 `服务凭据治理配置` 或 `服务凭据治理状态` 作为用户可见错误、空态或 loading 文案
