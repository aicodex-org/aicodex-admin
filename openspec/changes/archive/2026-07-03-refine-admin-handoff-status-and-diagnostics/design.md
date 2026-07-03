## Context

当前页面已把旧服务凭据治理入口收敛为 `Insight Admin Provider` copy-safe metadata handoff，但 partial 场景中默认层同时出现阻断态和绿色成功态。根因是交接操作区只根据 `actionRows.length === 0` 判断材料已齐，没有把整体 handoff partial 状态和凭据引用缺口纳入同一语义。

诊断信息已经默认收起，但入口只是 `Collapse` 文本标题，用户无法在不展开的情况下理解当前诊断规模，也不知道展开后内容结构。

## Goals / Non-Goals

**Goals:**

- partial/missing 状态下默认层只表达“可生成 copy-safe 元数据包，但凭据闭环仍缺项”，不再出现绿色“材料已齐”。
- 让诊断入口默认显示紧凑摘要，并提供明确查看/收起动作。
- 展开诊断后按阻断项、可用能力和技术证据分组，避免重新铺满无结构卡片。
- 保持 390px 窄屏无横向溢出，并继续不展示敏感值。

**Non-Goals:**

- 不新增后端字段或 endpoint。
- 不改变 Admin handoff package schema。
- 不实现 Admin secure handoff、credential issuer/revoke 生命周期或 secretRef 管理。
- 不改 API、Gateway 或 Insight 项目契约。

## Decisions

### 状态拆分在前端呈现层完成

复用现有 `serviceCredentialGovernanceHasPartialPackage`、`serviceCredentialGovernanceHasPendingMaterials`、blocking rows 和 capability rows。页面只改变默认层文案、Alert 类型和展示条件，不改变 owner evidence 数据来源。

partial 且无 pending config action rows 时，交接操作区显示 warning/info 类提示：元数据包可生成，但 Profile 凭据闭环仍需补 resolver 凭据引用。只有整体 ready 且无阻断时才显示绿色材料已齐。

### 诊断摘要使用轻量自定义 disclosure

继续使用 AntD `Button`、`Tag`、`Space`、`Alert` 等组件，避免引入新依赖。用本地 state 控制展开，摘要行默认显示：

- 阻断项数量。
- 可用能力数量。
- `Admin secure handoff 不在 P0`。
- `查看诊断详情` / `收起诊断详情` 操作。

这样比普通 `Collapse` 标题更可扫描，也更容易在 390px 下控制换行。

### 展开详情按三组组织

- `阻断项`：优先展示缺凭据引用、missing/blocked/partial owner evidence，展示 owner、原因和下一步。
- `可用能力`：只展示能力名称和状态，不展示 alias。
- `技术证据`：集中展示 wrapper route 和 owner evidence alias/source class/missing keys。

## Risks / Trade-offs

- [Risk] 仍然只使用前端现有状态推导，不新增后端 reason 聚合字段。→ Mitigation: 测试覆盖 partial、ready 和敏感字段不可见，避免推导语义回退。
- [Risk] 诊断详情内容仍可能较多。→ Mitigation: 默认只展示摘要，展开后分组且 wrapper/alias 只在技术证据组出现。
