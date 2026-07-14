## Context

`ApplicationAccessServiceCredentialGovernancePanel` 已从同一份 Admin readback 同时取得交接包生成前置条件和运行能力诊断。当前代码把运行组的 `partial`、`missing`、`blocked` 以及缺少凭据引用混入交接状态，因而在复制 CTA 可用时仍显示“部分缺失/阻断项”。技术证据虽已折叠，但一级诊断仍显示 owner alias。

本 change 只改变 Admin owner UI 对既有事实的派生和表达。Insight、Admin readback API、secure handoff package schema、grant/redeem/confirm、credential material、TTL 与 owner contract 均不变。

## Goals / Non-Goals

**Goals:**

- 独立、可测试地表示 package readiness 与 runtime capability readiness。
- 接入包可复制但 runtime partial 时，使首屏明确“接入包可复制”和“`N` 项扩展能力待配置”，并保留可用 CTA。
- package blocked 时 fail-closed，提供恢复提示；把 runtime 缺口与安全说明从交接阻断计数中移除。
- 按一级业务详情与独立技术诊断 Modal 实现渐进披露，保持长文本截断、复制安全和键盘可达性。

**Non-Goals:**

- 不补算或修复 resolver、组织映射、Gateway projection 或 Insight 运行事实。
- 不增改后端字段、包内容、交接授权生命周期或真实凭据处理。
- 不显示 token、Cookie、raw package、credential、完整 secretRef、私有 URL 或 raw DB row。

## Decisions

### 1. 在前端从现有 readback 派生两个独立视图模型

- Package readiness 仅由既有生成前置条件和 package 请求结果决定：可复制、加载中/未知、或阻断。真正的 issuer/store/target/package 失败保持禁用和 fail-closed。
- Runtime capability readiness 只统计“用量身份映射”和“Gateway 组织投影”两个可运营能力；固定 wrapper 接口可在可用能力中作为辅助证据，但不抬高待补齐数。
- 选择前端派生而非扩展 API，因为现有 config/status 已足以识别 package copy 与 runtime capability 的差异；这样保持 owner contract 不变。

### 2. 首屏只服务当前操作决策

- 首屏显示两个短状态、下一步和单一复制 CTA。目标消费方、包类型与“包不含真实凭据”移到紧凑说明或详情。
- package ready + runtime partial 使用 warning 语义表达后续运行能力，而不使用“部分缺失”“交接阻断”或“阻断项”。
- 选择并列状态摘要而不是重构页面为多卡片仪表盘，以保留 Admin 控制台密度并避免首屏噪音。

### 3. 业务详情与技术诊断分离

- “查看能力详情”只展示待配置扩展能力的名称、影响和建议动作，以及可用能力 Tag；不展示 owner alias、route、source class 或内部 owner hint。
- 在交接包操作区提供弱化的“查看技术诊断”入口，打开居中 Modal。Modal 桌面宽度约 800px、窄屏全宽，分为运行能力证据、Provider 路由和所有者证据；它保留 route 与 owner evidence 的 copyable、ellipsis/tooltip 安全文本。
- 技术诊断属于少数排障人员的偶发操作，不再作为“能力详情”的嵌套 Collapse，避免普通管理员在业务详情中遇到双层折叠。
- 保留 `?diagnostics=1` URL 状态以直接打开技术诊断 Modal，维持可分享的排障入口；关闭 Modal 时恢复无该参数的页面状态。

### 4. 以测试夹具覆盖三种真值组合与交互失败路径

- 为 package ready/runtime ready、package ready/runtime partial、package blocked 增加测试；partial 夹具断言“2 项扩展能力待配置”、CTA 可用和一级无技术别名。
- 继续覆盖 loading、empty、request error、permission denied、copying、success、failure、长文本和窄屏 CSS/浏览器行为。
- 选择复用 `ApplicationUsageAccessPage.test.tsx` 的 API mock 和 DOM 断言，避免为纯呈现逻辑新增后端测试或接口。

### 5. 以只读 runtime closure audit 决定 partial 文案

2026-07-14 对已授权 60 测试环境执行只读审计后，确认以下证据层级：

- Admin 当前组合包实现固定生成 copy-safe metadata 与脱敏 `secure_handoff_grant` envelope；已签发记录只按状态聚合检查，存在已确认记录，未读取或输出 grant、nonce、hash 或凭据材料。
- Insight 当前 active pointer 存在，Profile 的 `admin_owner` 与激活资格所需的另外两个组件均为 secure handoff 来源的 bound/active 状态；Dry-run 与 Doctor 记录均为 passed。secret material 只在后端加密存储，不进入 UI/readback。
- 但该 active Profile 缺少最近验证时间戳和激活事件；因此不能把本次 Admin UI 验证表述为 Insight 的新鲜激活验收。它是 Insight owner 的独立重新验证风险，不能由绿色或黄色 Admin 文案掩盖。

按当前 Insight 激活资格实现，只有 API usage、Admin owner、Gateway authorization 三类绑定与新鲜 Dry-run/Doctor 进入 Profile activation gate；用量身份映射和 Gateway 组织投影不在该 gate 中。两项能力均不影响 package 生成、复制、导入或 Profile 启用前置检查，但分别可能影响用量身份映射完整度和 Gateway 组织投影完整度。因此 package ready + runtime partial 的 warning 文案采用“`N` 项扩展能力待配置”，并明确“不影响接入包导入与 Profile 启用”；warning 色保留，不把整体状态刷绿。

## Risks / Trade-offs

- [既有 readback 无法精确表达 package 前置失败] → 只沿用当前 fail-closed 条件与后端 package 错误；若未来需要更细分原因，再由 Admin owner contract 独立变更。
- [术语变化可能影响现有测试或运营文档] → 同步 zh/en locale 与 DOM 测试，保留技术诊断 Modal 作为排障后备。
- [技术证据干扰普通交接] → 一级详情不用 owner/route 列，技术信息仅在 Modal 中按需显示；技术值使用 wrapping、ellipsis 与 tooltip；浏览器检查 390px 页面级 overflow。

## Migration Plan

1. 将 UI、locale 和测试作为同一 RC change 发布；无需数据迁移或 API rollout。
2. 如需回滚，回退该单一前端 change commit 即恢复原有状态展示；不影响已生成交接包或交接授权。
3. 在本地前端代理到已批准的 60 测试后台完成浏览器验证；不部署、不 archive、不合入基线。

## Open Questions

无。现有 readback 已支持本 change 的保守派生，运行能力真实修复仍由各自 owner 后续处理。
