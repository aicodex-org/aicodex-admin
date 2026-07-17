## ADDED Requirements

### Requirement: Admin 接入包目标组织操作流

Admin UI SHALL 在同一操作区以显式、可访问且可恢复的流程，让 operator 先选择授权目标组织，再生成 Insight Admin 接入包。

#### Scenario: 选择先于唯一主操作

- **WHEN** operator 打开 Insight Admin 接入包操作区
- **THEN** UI SHALL 在视觉、DOM 与键盘顺序上先呈现必填“授权目标组织”选择器，再呈现唯一生成主 CTA
- **AND** UI SHALL 紧邻选择器说明该组织决定 Insight 可读取的 Admin 组织与用量范围
- **AND** 技术诊断入口 SHALL NOT 取代或打断该主操作顺序

#### Scenario: 不静默选择目标组织

- **WHEN** eligible target organization 列表完成加载
- **THEN** UI SHALL 保持选择为空，即使仅有一个 eligible organization
- **AND** UI SHALL NOT 持久化或跨刷新恢复上一次选择
- **AND** 未选择时生成 CTA SHALL disabled，并显示指向选择组织的下一步提示

#### Scenario: 状态可恢复

- **WHEN** target organization 列表处于 loading、empty、error 或 access package 正在 submitting
- **THEN** UI SHALL 显示对应可感知状态和可操作恢复提示
- **AND** UI SHALL 在没有有效选择或 submitting 时禁止重复生成
- **AND** empty 与 error 状态 SHALL NOT 回退到 `built-in`、创建者 owner 或其它推断目标

#### Scenario: 组织变化作废旧结果

- **WHEN** operator 在接入包生成成功后改变 target organization
- **THEN** UI SHALL 立即清除旧 package success/result
- **AND** UI SHALL 要求 operator 为新目标重新生成接入包

#### Scenario: 成功反馈确认授权组织

- **WHEN** Admin 为所选 target organization 成功生成接入包
- **THEN** UI SHALL 显示“本接入包授权给”以及生成时的组织展示名
- **AND** UI MAY 显示 copy-safe organization alias
- **AND** 长展示名或 alias SHALL 省略并通过 Tooltip 或等效方式可读
- **AND** UI SHALL NOT 显示 raw grant、token、credential、完整 secretRef、私有 URL 或 raw package

#### Scenario: 响应式与键盘操作

- **WHEN** operator 在 1440 或 390 宽度使用该操作区
- **THEN** selector、说明、CTA 与反馈 SHALL 不重叠且 SHALL NOT 造成页面级横向溢出
- **AND** selector 与 CTA SHALL 在窄屏自然换行
- **AND** selector SHALL 有可访问名称，Tab 与 Enter SHALL 可操作，成功和错误反馈 SHALL 可感知

#### Scenario: 扩展能力提示不阻断接入包

- **WHEN** secure handoff 接入包前置条件已满足但 runtime extension capability 仍有 warning
- **THEN** UI SHALL 允许 operator 选择目标组织并生成接入包
- **AND** UI SHALL 继续说明该 warning 不阻断 package import 与 Profile activation
