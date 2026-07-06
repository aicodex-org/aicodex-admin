## Context

前序 change 已移除默认层重复灰底说明和内部路线语言。当前缺口不是流程或契约问题，而是主决策表达还不够产品化：partial 状态下，页面应第一眼说明“可以生成的是元数据交接包；真实凭据后续在 Insight Profile 绑定”。

## Decisions

- 保持 KISS：不引入步骤向导，不改导航，不新增后端字段。
- 保持业务语义：缺 resolver credential reference 时仍允许生成脱敏元数据交接包。
- 主按钮使用 `元数据交接包` 命名，避免用户理解为真实凭据也会被打包。
- 默认层只展示第一条阻断的紧凑摘要，详细阻断、可用能力和技术证据仍保留在诊断详情中。
- `manual/secretRef` 作为技术代码词保留，但放在中文动作语序中，不使用 `binding resolver` 直译堆叠。

## Non-Goals

- 不实现 Admin secure handoff。
- 不新增 Admin secret 管理、凭据发行、撤销或 resolver 生命周期。
- 不改 API/Gateway/Insight contract。
- 不做全局标签栏、导航框架或布局重构。

## Validation

- OpenSpec strict validate。
- 聚焦 Jest 覆盖 partial 默认层主决策、按钮文案、默认可见首个阻断、旧底层/内部文案不可见、诊断按钮 aria。
- incremental TypeScript gate、`yarn typecheck`、`yarn build`、`git diff --check`。
- 如不改 CSS/布局，可不跑 browser smoke，并在 `verification.md` 说明。
