## Context

`reframe-admin-enterprise-ia-visual-system` 已将路线方向纠偏为少入口、业务域导航和对象上下文承载横向能力。当前 `/` 总览已经比旧四中心堆叠更收敛，但风险列表前三项仍以“对象关系证据链 / 接入预检 / 任务中心”连续出现，容易形成新的能力目录。

## Goals / Non-Goals

**Goals:**

- 让总览首屏更像企业身份基础设施状态页，而不是横向能力入口目录。
- 保留 `/identity-assets`、`/access-wizard`、`/governance-tasks` deep link 兼容性。
- 通过聚焦测试证明显眼入口文案被降噪为状态/待办摘要。

**Non-Goals:**

- 不删除现有路由或导航稳定 key。
- 不改组织同步页、组织运营页、接入预检页、对象关系页或治理任务中心页。
- 不新增后端聚合接口、任务处理状态、真实连接测试、同步执行、OAuth/OIDC callback 或 Gateway publish/cleanup。

## Decisions

### Decision 1: 业务状态优先于能力名称

总览待处理区域优先排序审计风险、目录质量、应用变更等业务域信号，再把对象关系和接入预检作为上下文核对状态出现。这样管理员先看到“现在该关注什么”，再按需进入证据或预检工具。

### Decision 2: deep link 保留但文案降级

`/identity-assets`、`/access-wizard`、`/governance-tasks` 仍可从总览到达，但 action 文案使用“查看关联证据 / 核对接入条件 / 查看风险待办”等状态型语义，不再使用“进入身份资产关系 / 进入接入预检中心 / 进入任务中心”。

### Decision 3: 只做本页最小改动

本 change 不触碰 `App.less`。现有 `EnterpriseIdentityRiskList` 足以承载待关注摘要；本轮只调整数据、排序、文案和测试。

## Risks / Trade-offs

- 风险：文案降级后横向能力发现性下降。缓解措施：保留 deep link action 和 badge，用上下文描述解释何时使用。
- 风险：总览仍使用现有风险列表组件，视觉上还会展示多条摘要。缓解措施：通过排序和文案避免三条抽象能力连续堆叠；后续如需要更大布局调整应单独 proposal。
