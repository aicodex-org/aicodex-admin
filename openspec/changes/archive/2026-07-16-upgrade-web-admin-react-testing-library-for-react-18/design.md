## Context

当前 `web-admin/package.json` 声明 `@testing-library/react ^9.3.2`，Yarn 1 lock 实际解析为 9.5.0，并由其传递持有 `@testing-library/dom 6.16.0`。该 RTL 版本调用 React 18 的 legacy `ReactDOM.render`，最新代码因此在 29 个测试文件中分别忽略同一退役告警。Jest 已独立固定为 27.5.1，React/ReactDOM 为 18.2，TypeScript 为 5.7.3，CI Node 为 20.19.0；本 change 必须保持这些基线和 Vite、Playwright、Yarn 真值不变。

Registry 证据显示 `@testing-library/react 16.3.2` 是当前 `latest`，要求 Node `>=18`、React/ReactDOM `^18 || ^19`，并把 `@testing-library/dom ^10` 声明为非可选 peer；`@testing-library/dom 10.4.1` 是当前 latest，要求 Node `>=18`，且使用 `pretty-format ^27.0.2`。这些约束与仓库当前 React、Jest 和 CI Node 基线相容，不要求升级生产依赖或 Jest major。

冲突边界上，并行 TLS change 拥有 `ProviderEditPage*`、`SyncerEditPage*`、Provider/Syncer 字段组件及直接 UI 测试。本 change 只处理已经确认的 29 个 warning filter 文件和升级后其它非冲突直接失败测试；如果禁区测试失败，只记录证据并交由主控协调。

## Goals / Non-Goals

**Goals:**

- 让 Testing Library 默认通过 `ReactDOMClient.createRoot` 渲染 React 18 组件，并覆盖 `render`、`cleanup`、同步/异步 `act` 的关键行为。
- 删除 29 个文件中的 `ReactDOM.render` 局部过滤，同时保留各测试对其它 `console.error`、AntD 告警或 `act` 告警的既有处理语义。
- 保持至少 144 个 Jest suite / 1369 个 test、19 个 Playwright spec / 22 个 test，以及现有断言、路由和生产行为。
- 将依赖和 lockfile 变化限定到 RTL、其明确 peer 与不再被其它 owner 持有的旧传递树。

**Non-Goals:**

- 不升级 React、ReactDOM、React Router、Jest、Vite、AntD、Playwright、jest-dom 或 user-event。
- 不迁移 Vitest、Bun test 或 Bun package manager，不改 CI job 结构。
- 不修改生产组件来适配测试，不重写 Provider/Syncer UI，不处理独立 AntD deprecated API、FakeTimers 或其它历史 warning。
- 不减少、合并、skip 测试，不扩大 mock，不通过全局 console suppression 制造绿灯。

## Decisions

### 1. 采用 RTL 16.3.2 与显式 DOM 10.4.1 peer

`@testing-library/react` 使用 `^16.3.2`，并在 devDependencies 顶层增加 `@testing-library/dom ^10.4.1`。16.3.2 是 registry 当前维护版本，仍明确支持 React 18 和 Node 18+，没有 Jest 或 TypeScript peer；DOM 10.4.1 的 Node 与 `pretty-format` 约束也与当前基线相容。

不选 13.4、14.3 或 15.0 的原因是这些旧维护线虽已进入 React 18 `createRoot` 路径，但发布时间更早，且 16.3.2 不要求扩大 React/Jest/Node 迁移。DOM 10 必须显式声明，因为 RTL 16 将其作为非可选 peer；不能依赖 Yarn hoist 偶然满足。

### 2. 不联动升级 jest-dom 与 user-event

现有 `@testing-library/jest-dom 4.2.4` 与 `@testing-library/user-event 7.2.1` 较旧，但 RTL 16 没有声明与它们冲突的 peer。升级它们会扩大 API 和 matcher 行为变化，不是消除 legacy root 的必要条件；兼容性由全量 Jest、typecheck 和构建门禁证明，若出现真实 blocker 再按最小范围评估。

### 3. 用行为测试证明 createRoot、cleanup 与 act，而不是检查实现 token

新增一个 test-only React 18 兼容 suite：通过 spy 观察 `ReactDOMClient.createRoot` 被默认 `render` 调用，验证 `cleanup` 会卸载并清空容器，并验证 `act` 包裹的同步与异步更新可稳定提交。RED 阶段在旧 RTL 上应因未调用 `createRoot` 或出现 legacy warning 失败；GREEN 阶段在依赖升级后通过。

测试不检查 RTL 源码字符串，也不 mock 掉 ReactDOM warning。新增 suite/test 只能增加 discovery，最终不得低于当前 144/1369 基线。

### 4. 精确删除局部 legacy warning 分支

对 29 个目标文件逐个删除仅匹配 `ReactDOM.render is no longer supported` 的条件分支。原 spy 若还负责让其它 `console.error` 失败、转发原始错误或过滤既有独立告警，则保留其余逻辑；不会把这些逻辑迁到 `setupTests.ts` 或 Jest 全局配置。

升级前后使用非 silent Jest 命令记录 `ReactDOM.render`、`act`、FakeTimers 与普通 Warning 计数；现有 `test:ci --silent` 契约不修改，但额外 warning 审计不得隐藏其它类别。

### 5. 依赖锁与并行写集 fail-closed

使用 Yarn 1 生成最小 lockfile 变化，再用 `yarn install --frozen-lockfile`、`yarn why` 和 package/lock diff 确认 owner。若 lockfile 出现与 RTL/DOM peer 无关的大范围升级，停止并重建最小 lock 变化。

若 RTL 升级只使 `ProviderEditPage*`、`SyncerEditPage*` 或其直接字段测试失败，不修改这些文件；保存脱敏失败摘要并以 `needs_master_decision` 回传。其它直接测试失败必须先区分 React 18 调度差异与既有不稳定性，禁止通过 skip、timeout 或 console ignore 绕过。

## Risks / Trade-offs

- [跨越多个 RTL major 暴露旧异步假设] → 先跑 createRoot/cleanup/act RED/GREEN，再跑代表性 class/function suites 和全量 Jest；只修复真实直接回归。
- [旧 jest-dom/user-event 与 DOM 10 存在未声明的运行时不兼容] → 不预先扩大升级；以 frozen install、全量 Jest、typecheck 和 Vite build 为门禁，出现 blocker 时停止重新评估。
- [删除过滤后暴露独立 AntD/act warning] → 保留原有非 ReactDOM 分支并记录 warning 前后计数；不把独立债务混入本 change。
- [本机 Node 24 结果不能完全代表 CI Node 20.19] → 版本选择以 engines/peer 元数据为基础，并保持 workflow Node 20.19；本地门禁不夸大为 hosted CI 运行证据。
- [并行 TLS change 触及 Provider/Syncer 测试] → 禁区文件只读，失败时按 owner 协调，不越界修复。

## Migration Plan

1. 记录当前 144-suite discovery hash、1369-test 全量基线、29 文件 inventory、warning 与依赖 owner。
2. 先新增 React 18 渲染兼容测试并在 RTL 9.x 上确认预期 RED。
3. 更新 RTL/DOM devDependencies 与最小 `yarn.lock`，执行 frozen install 后确认 peer/owner。
4. 运行兼容测试 GREEN，再精确删除 29 个 legacy warning 分支并运行代表性与全量回归。
5. 完成静态、public scripts、Vite build、Playwright discovery、OpenSpec 与 pre-archive 门禁。
6. archive 后同步主规格，最终收敛为最新 base + 1 个逻辑 commit并普通非强制推送 base。

回滚仅需 revert 单个最终 change commit，即可恢复 RTL 9.x、旧 DOM 传递树和原测试过滤；生产 bundle 与数据无需迁移或回滚。

## Open Questions

无。版本、peer、warning 处理、并行写集和 closeout 边界均已有证据化保守决策。
