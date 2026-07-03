## Context

`ApplicationAccessServiceCredentialGovernancePanel` 已经生成 copy-safe Admin 交接包，并在同一页展示 wrapper 能力、owner evidence 和 P0 边界。当前问题不是契约缺失，而是默认层仍把 route、owner alias、缺失 key 等技术信息铺到首屏，实施/运维需要先解析这些字段才能知道页面是否能交接。

本 change 只改 Admin 前端呈现，不改 `ApplicationAccessServiceCredentialGovernanceBackend` 类型和 API，不新增下载、secure handoff、Profile 管理或 token broker。

## Goals / Non-Goals

**Goals:**

- 默认层直接回答交接状态、下一步、目标消费方和包类型。
- 用人话能力清单呈现身份、Scope、组织树、用量身份解析、Gateway 组织投影的状态。
- 将 wrapper route、owner alias、source class、missing key 等细节收进 `技术细节`。
- 强化 `生成 Admin 交接包` 主操作及缺项提示。

**Non-Goals:**

- 不实现 Admin secure handoff。
- 不新增后端字段、下载 endpoint 或 API/Gateway/Insight contract。
- 不把 Admin 变成用量 provider 配置中心。
- 不展示 token、secret、Authorization、Cookie、DSN、完整私有 URL、raw payload、raw id、真实账号或完整组织树。

## Decisions

### Decision: 复用现有数据结构推导交接状态

使用既有 `serviceCredentialGovernanceActionRows`、`serviceCredentialGovernanceEffectiveSummary`、`serviceCredentialGovernanceNextAction` 推导 `可生成 / 部分缺失 / 不可生成`，不新增后端 readiness 字段。这样能保持 KISS，并避免把 UI polish 扩成 contract change。

### Decision: 默认能力清单用固定人话项

三条 wrapper 能力默认呈现为 `身份接口`、`Scope 接口`、`组织树接口` 的 `已就绪`；服务凭据治理项复用 existing evidence rows 映射为 `用量身份解析` 和 `Gateway 组织投影`。技术 route 和 alias 只在 `技术细节` 折叠区展示。

### Decision: 交接动作保持现有生成与复制

主按钮继续调用现有 copy-safe package builder。缺部署材料时按钮禁用并提示需补齐后生成；材料齐备时提示可生成完整 copy-safe 包；不硬做下载文件，因为当前后端不提供下载语义。

## Risks / Trade-offs

- [Risk] 技术细节收起后排障入口变深。→ 保留 `技术细节` 折叠区，并只放 copy-safe route、owner alias、缺失 key 摘要。
- [Risk] 人话状态可能掩盖真实后端运行态不确定性。→ 文案限定为 Admin copy-safe handoff 层级，不声称 Insight runtime provider 已可调用。
- [Risk] 测试断言过度依赖文案。→ 聚焦测试覆盖默认层关键语义、敏感材料不渲染和技术细节折叠，不引入额外后端 mock 复杂度。
