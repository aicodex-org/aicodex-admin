## Context

前序 changes 已把旧 `服务凭据治理 / 用量 provider 配置中心` 页面收敛为 `Insight Admin Provider` copy-safe handoff 页面，并修复了 partial 状态下绿色 `材料已齐` 与黄色阻断并存的问题。本轮只处理产品层噪声：默认态不重复展示多个告警，展开诊断也不把技术证据作为大面积卡片铺开。

## Goals / Non-Goals

Goals:

- partial/missing 默认态只有一个醒目的阻断提示，copy-safe 操作区用中性语言说明“元数据可生成，但凭据绑定需到 Insight/manual/secretRef 完成”。
- P0 边界说明从默认视觉焦点降级为灰/信息行或诊断摘要的一部分。
- 诊断详情展开后优先给紧凑阻断表格/列表，其次是可用能力 chips，最后才是技术证据。
- 保持 390px 窄屏无横向溢出，长 alias/route 使用 wrap、chip 或二级折叠承载。

Non-Goals:

- 不新增后端字段、endpoint、下载格式或 Admin secure handoff。
- 不把 Admin 改成 API/Gateway 用量 provider 配置中心。
- 不改变 copy-safe package schema、Insight Profile 导入 contract 或真实凭据绑定流程。

## Decisions

- 继续复用现有 `handoffPackage`、`capabilityStatuses`、`blockingCapabilityStatuses` 和 `diagnosticExpanded` 状态，不引入新的 Profile 管理状态。
- 默认层只保留一个 warning 视觉焦点；copy-safe 区使用 neutral/info 样式，避免操作者把“可生成 metadata”误解成整体 ready。
- 诊断详情不再用多张大卡片承载阻断项和可用能力；使用紧凑行、表格或 chip 组合，保持 owner/reason/next action 可读。
- 技术证据仍保留 wrapper route、owner alias、source class、missing key 等排障信息，但在诊断展开后继续降噪，不出现在默认层。

## Risks / Mitigations

- 风险：降低默认告警数量后，操作者可能忽略凭据引用缺失。缓解：保留顶部状态、下一步和唯一 warning 主提示，三处语义一致。
- 风险：技术证据过度收敛后排障效率下降。缓解：诊断详情仍保留 `技术证据` 组，必要 alias/route 可复制/查看，但不作为默认扫描负担。
- 风险：英文长 route 或 alias 在 390px 撑破容器。缓解：使用 wrap、`max-width`、`word-break` 和紧凑列表样式，并做 browser smoke。
