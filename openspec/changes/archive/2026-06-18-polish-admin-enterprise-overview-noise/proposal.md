## Why

60 runtime smoke 已证明企业认证中心 P0 主链路可用，但首页仍把对象关系、接入预检、治理任务中心等横向能力放在“当前最该处理”列表前段，容易让管理员先学习多个“中心”，而不是先判断身份基础设施状态和当前需要关注的业务风险。

本 change 只收敛 `/` 总览的信息噪音：保留既有 deep link，不新增导航或治理中心，不触碰组织同步页、组织运营页、认证执行链路或 Gateway 写链路。

## What Changes

- 将总览待处理区域从“能力入口目录”改为“运行状态与待关注事项”。
- 把对象关系、接入预检、治理任务相关文案改成状态/待办摘要和上下文 deep link，避免连续出现“进入对象关系 / 进入接入预检 / 进入任务中心”的入口堆叠。
- 同步聚焦测试和 `zh` / `en` locale 文案。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `admin-enterprise-identity-console-shell`: 细化总览首页降噪要求，明确横向治理能力在总览中应以运行状态、待关注事项和上下文 deep link 展示。

## Impact

- 影响的前端文件：`web-admin/src/IdentityConsoleOverview.js`、`web-admin/src/IdentityConsoleOverview.test.js`、`web-admin/src/locales/zh/data.json`、`web-admin/src/locales/en/data.json`。
- 不包含后端 API、组织同步页、组织运营页、认证/OAuth callback、Gateway projection、secrets、package、lockfile 或 `test` 分支变更。
