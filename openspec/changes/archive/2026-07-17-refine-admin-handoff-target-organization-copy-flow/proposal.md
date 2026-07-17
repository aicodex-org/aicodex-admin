## Why

Admin 已要求操作员显式选择业务目标组织后生成 Insight Admin 接入包，但当前页面把“复制/重新复制接入包”主按钮放在选择器之前。用户会先看到不可用动作，直到操作时才理解授权前置条件，也难以从成功结果确认接入包实际授权给哪个组织。

## What Changes

- 将“授权目标组织”必填选择器与唯一主 CTA 收敛到同一操作区，视觉顺序与键盘顺序固定为“选择组织 → 生成/重新生成接入包”。
- 在选择器附近说明目标组织决定 Insight 可读取的 Admin 组织与用量范围；未选择时禁用 CTA 并给出可恢复的 loading、empty、error 与下一步提示。
- 选择变化后立即清除旧接入包成功结果，要求按新授权目标重新生成。
- 成功反馈显示本次接入包授权组织的 copy-safe 展示名与 alias，并处理长文本和窄屏布局。
- 保持服务端目标组织校验、secure handoff grant/runtime credential、安全脱敏和 Provider scope 契约不变。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `admin-secure-handoff-grant`: 明确目标组织选择、生成 CTA、成功授权摘要与响应式/可访问状态的操作顺序和反馈契约。

## Impact

- 前端：`ApplicationAccessServiceCredentialGovernancePanel.tsx`、其页面测试、中英文 locale，以及必要的同页样式。
- OpenSpec：补充 `admin-secure-handoff-grant` 的 UI 场景。
- 不影响 Admin 后端、API/Insight、数据库、运行凭据 claims、packageHash、审计 subject 或 secure handoff 生命周期。
