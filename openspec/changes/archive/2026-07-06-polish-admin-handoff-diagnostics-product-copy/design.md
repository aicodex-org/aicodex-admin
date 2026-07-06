## Context

前序 change 已把默认主阻断提示从底层 secret 落点收敛到 Insight manual/secretRef binding。用户继续反馈默认层和展开诊断仍有技术路线语言与环境维护项，影响“真正降低运维复杂度”的产品感。

## Decisions

- 默认层边界说明只保留产品事实：Admin 交接包只包含 copy-safe 元数据/引用，不传递真实凭据。
- `keep_in_env` 是底层治理事实，不是当前页面的用户动作；从展开诊断的 owner evidence 列表中过滤，避免成为运维主路径。
- 不重构诊断详情结构，不移动 wrapper route，不新增二级 disclosure，保持小范围文案和渲染条件变更。

## Non-Goals

- 不实现 Admin secure handoff。
- 不新增 Admin secret 管理、凭据发行、撤销或 resolver 生命周期。
- 不改 API/Gateway/Insight contract。
- 不改 copy-safe package 字段或后端 owner evidence 数据。

## Validation

- OpenSpec strict validate。
- 聚焦 Jest 覆盖默认层不出现内部路线语言，展开诊断不出现环境维护项和底层 secret 落点动作。
- incremental TypeScript gate、`yarn typecheck`、`yarn build` 和 `git diff --check`。
- 本 change 不改布局样式；browser smoke 若未执行，需要在 verification 中说明依据。
