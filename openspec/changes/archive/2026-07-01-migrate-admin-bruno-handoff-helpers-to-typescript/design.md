## Context

`api-tests/bruno/aicodex-admin/scripts` 下的 Gateway projection helper 是 Admin owner 用于受控 smoke、release decision、operator handoff 和 evidence handoff 的本地 Node/Bruno 脚本。当前这些脚本以 CommonJS `.js` 形式存在，既被 Bruno pre-request 脚本 `require(...)` 消费，也被 `node --test ...*.test.js` 直接运行。

本轮选择 Gateway projection 批次，而不是一次迁移全部 Bruno helper，原因是：

- Gateway 批次文件数足够大，能验证 TS 源化策略对 handoff helper 的实际收益。
- Gateway 批次已有 `admin-gateway-organization-projection-publisher` 规格承接 owner boundary 和 evidence guardrail。
- WeCom source helper 也是类似候选，但属于另一组 source readiness / controlled smoke 边界，先 deferred 可降低一次变更的验证面。

## Goals / Non-Goals

**Goals:**

- 为 `gatewayProjection*.js` helper 建立对应 `.ts` 源文件。
- 保留提交后的 `.js` CommonJS 入口，使 Bruno 和现有 `node --test ...*.test.js` 继续可运行。
- 提供生成与一致性检查命令，证明 `.js` 输出由 `.ts` 源生成。
- 不改变 Gateway projection helper 的 alias、owner handoff、脱敏、fail-closed、red-line 和 README 安全边界。

**Non-Goals:**

- 不迁移 WeCom source helper、Cypress、public auth scripts、web build tooling 或 `web-admin/**`。
- 不改 Bruno request 文件、真实环境配置、60 环境、DB、fixture、后端 API 或 Gateway projection runtime 行为。
- 不新增生产依赖，不引入 repo-wide TS build 重构。

## Decisions

1. **采用 `.ts` 源 + 生成 `.js` CommonJS 输出。**
   - Rationale: Bruno 和现有 Node test 入口已经消费 `.js`，直接改为 TS 会破坏 `require(...)` 和 `node --test` 习惯。
   - Alternative: 改测试入口为 TS loader。该方案需要新增运行时 loader 或依赖，且 Bruno 消费路径仍需处理，风险更高。

2. **测试文件本轮保留 `.test.js`。**
   - Rationale: 用户要求现有 `node --test ...*.test.js` 入口可用或等价可用；保留测试入口能直接证明运行兼容。
   - Alternative: 同步迁移 `.test.ts` 并生成 `.test.js`。可行但增加生成面，本轮优先迁移 helper 源。

3. **生成/校验脚本只覆盖 Gateway 批次。**
   - Rationale: 避免误改 WeCom helper 或其它 Bruno helper，并让 RC review 能清楚看到 chosen batch。
   - Alternative: 通用 scripts 目录全量生成。范围过大，可能牵出非本轮文件。

4. **TypeScript 工具链复用本地已有 TypeScript 包。**
   - Rationale: 仓库已有前端 TypeScript 工具链，本轮不新增生产依赖；如果运行环境缺少该包，校验命令会明确失败并提示安装现有前端依赖。
   - Alternative: 提交独立 npm package/lock。对 Bruno helper 迁移过重。

## Risks / Trade-offs

- [Risk] 提交生成 `.js` 和 `.ts` 源会短期增加文件数。→ Mitigation: 增加一致性检查，确保 JS 不是手写漂移副本。
- [Risk] TypeScript 对动态输入类型约束不足。→ Mitigation: 先用窄边界类型和 `unknown`/record helper，不重写业务逻辑；通过既有 152 个 Gateway tests 约束语义不变。
- [Risk] 只迁 Gateway 批次会留下 WeCom JS helper。→ Mitigation: 在 tasks 和 closeout 报告中记录 deferred，等 Gateway 策略验收后再按同样模式迁移 WeCom。
- [Risk] 本地环境没有可用 TypeScript 编译器。→ Mitigation: 生成脚本优先解析 `web-admin/node_modules/typescript`，并在失败时给出清晰错误；本 RC 需要实际跑过生成/校验命令。
