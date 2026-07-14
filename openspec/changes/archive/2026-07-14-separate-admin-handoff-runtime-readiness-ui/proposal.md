## Why

当前 Admin Provider 交接页把“接入包能否复制”和“Provider 运行能力是否完整”混为一个“部分缺失/阻断”状态：复制 CTA 仍可用，但管理员无法判断能否继续导入；展开后又默认暴露大量技术证据。

## What Changes

- 将接入包 readiness 与 Provider runtime capability readiness 作为独立 UI 状态轴。
- 在接入包可复制、扩展能力待配置时，明确允许继续导入，并将能力缺口从交接阻断中分离。
- 将首屏收敛为接入包状态、运行能力状态、下一步和单一复制 CTA；把常量与技术证据降级到渐进披露。
- 将一级详情限制为人可读的待配置扩展能力、影响、建议动作和可用能力；route/owner alias/source 等移入按需打开的技术诊断 Modal。
- 补齐 zh/en 文案、行为测试、窄屏和键盘可达性验证。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `admin-enterprise-identity-usage-access-entry`: 用量接入页面以两条独立 readiness 轴表达 package copy 与 Provider runtime 能力，并将诊断改为渐进披露。

## Impact

- 仅改动 `web-admin` 的 Admin owner 页面状态推导、展示、样式、测试和中英文 locale。
- 继续消费既有 Admin readback；不新增或修改 Insight/API、secure handoff package schema、grant/redeem/confirm、credential material、TTL 或 owner contract。
- 不修复 resolver、组织映射或 Gateway projection 的运行能力，只准确显示其对接入包复制或后续运行能力的影响。
