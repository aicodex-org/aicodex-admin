## Context

目标组织选择和服务端校验已经存在：页面从 Admin 组织列表中过滤 `built-in`，不设置默认值，并把选中的 organization name 传给接入包创建接口。问题集中在操作编排：主 CTA 位于 workspace header，选择器在其后；生成成功只说明“已复制”，没有把本次授权目标回读给操作员。

本 change 只调整 Admin 前端展示与本地状态，不修改 grant、packageHash、runtime credential claims、审计 actor、Provider scope 或 API/Insight 契约。

## Goals / Non-Goals

**Goals:**

- 在同一操作区按 DOM、视觉和键盘顺序呈现“授权目标组织 → 生成/重新生成”。
- 显式解释目标组织控制 Insight 可读的 Admin 组织与用量范围。
- 保持无默认选择；未选择、loading、empty、error、submitting 都有可恢复反馈。
- 组织变化立即使旧成功结果失效；成功反馈显示生成时的组织展示名与 copy-safe alias。
- 1440 与 390 宽度下控件可换行，长组织名不造成页面级横向溢出。

**Non-Goals:**

- 不改变 Admin 后端目标组织校验或 secure handoff 数据模型。
- 不自动选择、持久化、恢复或从其它上下文推断目标组织。
- 不新增 manual/secretRef 入口，不显示 raw package、grant、credential、secretRef 或私有 URL。
- 不改 API、Insight、数据库、部署配置或 Provider 运行契约。

## Decisions

### 1. 将现有选择器和 CTA 组合为页内线性操作流

把主 CTA 从 workspace header 移到目标组织选择器之后；header 仅保留标题、状态说明与技术诊断入口。操作区沿用 AntD `Select`、`Button`、`Alert`、`Typography` 和既有响应式样式，不引入 modal 或 wizard。

备选是点击 CTA 后弹出组织选择 modal。该方案会保留错误的先动作后授权心智顺序，并增加焦点管理和重复确认，因此拒绝。自动选择唯一候选违反主规格，明确拒绝。

### 2. 成功反馈使用生成时组织快照

生成成功时保存已选择候选的 copy-safe `{name, displayName}` 快照；组织变化、重新加载失败或重新提交前清除旧快照和旧 package result。成功 Alert 从该快照显示“本接入包授权给”，避免把后续选择误写成既有包授权目标。

展示名和 alias 来自页面已加载的 Admin 组织候选，不读取或展示 grant/raw credential。长文本以单行省略配合 Tooltip 展示完整 copy-safe 文本。

### 3. 状态反馈靠近前置条件且不改变 capability 语义

选择器下方固定显示一句授权范围说明；未选择时显示可感知的下一步提示。loading、empty、error 继续使用现有状态来源和可操作文案；submitting 同时锁定 Select 与 CTA。runtime capability warning 继续表示扩展能力完整度，不作为接入包生成阻断。

### 4. 以页面行为测试和真实浏览器证据验收

Jest 覆盖 DOM 顺序、无默认、禁用/提交锁、loading/empty/error、成功授权摘要、组织变化清除结果与 runtime warning 非阻断。浏览器在 1440/390 检查换行、横向溢出、键盘顺序、console 与失败网络；运行态证据只记录脱敏状态。

## Risks / Trade-offs

- [Risk] 组织展示名很长或中英文文案长度差异造成窄屏溢出 → 操作区使用 `min-width: 0`、自然换行，成功摘要省略并提供 Tooltip。
- [Risk] 异步生成结果与当前选择错配 → submitting 时锁定选择器，并以发起请求时的候选快照写入成功状态。
- [Risk] UI 文案被误解为 package readiness 受 runtime capability 影响 → 保留现有“扩展能力不影响导入/启用”语义，新的说明只描述授权范围。
- [Trade-off] 页面刷新后需要重新选择，即使只有一个候选 → 这是安全契约要求，优先于减少一次点击。

## Migration Plan

纯前端兼容变更，无数据迁移。RC 构建部署到 60 Admin 后检查健康与真实认证态页面；回滚时恢复前一 Admin 镜像即可，不修改 DB 或配置。

## Open Questions

无。授权语义、写集和验收视口已由任务明确。
