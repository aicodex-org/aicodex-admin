## MODIFIED Requirements

### Requirement: 用量接入页面聚焦服务凭据治理

`用量接入` 页面 SHALL 以 KISS 方式展示 `Insight Admin Provider` 交接状态和 copy-safe package 动作；旧服务凭据治理配置、诊断、修正或 provider 配置中心 UI SHALL NOT 作为默认产品 surface 保留。

#### Scenario: partial 默认态只保留一个主阻断提示

- **WHEN** `/application-usage-access` 的 Admin handoff 状态为 partial、missing 或 blocked，且 copy-safe metadata package 仍可生成
- **THEN** 页面默认层 SHALL 保留整体状态摘要、下一步 action 和一条 warning 主提示，说明缺少 resolver 凭据引用或同类阻断
- **AND** copy-safe 交接操作区 SHALL 使用中性或 info 语义说明 `可生成元数据交接包，导入 Insight 后再完成 manual/secretRef binding`
- **AND** 页面 SHALL NOT 在 copy-safe 操作区再渲染第二个黄色告警
- **AND** P0 边界说明 SHALL 降级为低噪信息行、帮助说明或诊断摘要文案，不得成为默认视觉焦点
- **AND** 页面 SHALL NOT 表达 Admin secure handoff 已完成或真实凭据绑定已完成

#### Scenario: 展开诊断详情使用紧凑信息结构

- **WHEN** 操作者点击 `查看诊断详情`
- **THEN** 页面 SHALL 展开 `阻断项`、`可用能力` 和 `技术证据` 三组
- **AND** `阻断项` SHALL 使用紧凑表格或列表呈现项目、状态、责任方、原因和建议动作，不得以多张大卡片堆叠为主
- **AND** `可用能力` SHALL 使用紧凑 chips 或小列表呈现可用能力名称和状态，不得以每项大卡片堆叠为主
- **AND** `技术证据` SHALL 保留 wrapper route、owner alias 和 owner evidence 等排障字段，但 SHALL 进一步降噪为 code chips、紧凑列表或二级 disclosure
- **AND** 技术 alias、route、owner evidence 和长英文字段 SHALL 在 390px 窄屏下换行或截断，不得造成页面级横向溢出
- **AND** 诊断详情 SHALL NOT 展示 token、Cookie、Authorization、client secret、DSN、raw payload、完整 private URL、真实账号或完整组织树
