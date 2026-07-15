## Context

Admin 当前使用 Cypress `^12.5.1`，`yarn.lock` 解析为 12.15.0。既有 Bun 1.3.14 评估中，两个独立 frozen lifecycle install 均出现数百个深层 `node_modules` ENOENT：Cypress postinstall 分别缺 `execa` 与 `safer-buffer`，Web3/ethers 树也不完整；同输入 Yarn frozen control 成功。Cypress 15.17.0 起声明支持 Bun CLI，但这不证明本仓库整棵依赖树或现有 E2E/CI 已兼容。

本 change 是 release-candidate-only 评估。主 workspace 只用于 OpenSpec、只读基线验证以及在证据达到 `GO-CANDIDATE` 后保留最小候选改动；安装实验全部在可清理的临时副本中进行。

## Goals / Non-Goals

**Goals:**

- 以 Cypress 15.18.1 为唯一升级候选，审计 12→15 官方 breaking changes 与现有 19 个 E2E/config/support/TypeScript 的实际迁移成本。
- 使用 Bun 1.3.14、短路径、独立空 cache 和空 `node_modules` 复现真实 lock generation + frozen lifecycle install。
- 检查 Cypress package/CLI/binary，以及历史失败点 `execa`、`safer-buffer` 和关键 Web3/ethers manifests。
- 只有安装兼容门禁通过后，继续运行仓库现有 Jest、typecheck、Vite、public scripts、增量 TypeScript 和 E2E/CI 门禁。
- 形成可审计的 `GO-CANDIDATE`、`NO-GO` 或 `BLOCKED/NEEDS_DECISION` 结论。

**Non-Goals:**

- 不把 package manager 正式迁移、Bun test、Vitest、Playwright、React/Router 或 Web3 依赖升级纳入本 change。
- 不删除/跳过 E2E，不降低 assertions，不跳过 lifecycle/Cypress binary，也不手工补包。
- 不对 60 或共享数据库执行破坏性 E2E，不 archive、不合入或 push `hfl-test-base`/`test`。

## Decisions

1. **升级兼容审计先于 Bun 性能实验。** 先核对 Cypress 12→15 migration、Node/浏览器支持、配置和 action 兼容，避免把可预见的迁移失败误判成 linker 问题。替代方案是直接改正式 lockfile，但会污染 workspace 且混淆原因。
2. **候选依赖只在 tracked-input 临时副本生成。** 每个样本复制 `git ls-files web-admin` 输入，删除 `yarn.lock`，仅在副本中将 Cypress 固定为 15.18.1、设置 `packageManager=bun@1.3.14`、将 package guard/prebuild 调整为 Bun 语义。正式 workspace 不保留双 lockfile。替代方案是复用现有 `node_modules`，但无法证明 clean install。
3. **样本严格串行、隔离。** 每个 Bun 样本使用短路径 workspace、空 `node_modules`、独立空 Bun/Cypress cache，先生成 lock，再执行 `bun install --frozen-lockfile`；任何失败样本都只用于兼容证据，不计入性能。只有至少 3 个有效样本才计算中位数。Yarn control 使用原始 package/yarn.lock 和独立空 cache，首次 binary 下载只证明可安装，不作为稳定性能中位数。
4. **完整依赖树是放行前置条件。** 安装 exit 0 后仍必须验证 Cypress CLI/binary、`execa`、`safer-buffer` 及 Web3/ethers manifests；任何关键 manifest 缺失均为 `NO-GO`，不得用后续脚本偶然成功覆盖。
5. **E2E 采用非破坏性本地/既有 CI harness。** 本地没有获准的隔离 DB 时，不运行会写共享环境的 19 个 spec；若其余门禁通过，则 push RC 工作分支并以真实 branch CI 作为最终门禁。在 branch CI 未闭环前结论只能是 `BLOCKED/NEEDS_DECISION`。
6. **CI action 必须真实识别 Bun 单一 lockfile。** 审计 `cypress-io/github-action@v5` 对 `bun.lock` 与 install/start 命令的支持；若 v5 不能识别，明确记录必要 action/workflow 迁移。不得保留 `yarn.lock` 只为让 action 误判 Yarn。
7. **失败即回退正式候选。** `NO-GO` 时 workspace 不保留 package/lock/config/workflow 候选改动，只提交 OpenSpec artifacts 与脱敏 verification；不向主规格写入“已采用 Cypress 15/Bun”。

## Risks / Trade-offs

- [Windows/Bun linker 问题具有非确定性] → 使用至少三个独立 cache/路径样本，记录 lock hash、exit code 和缺失 manifest，不通过重复同一目录掩盖失败。
- [首次 Cypress binary 下载放大耗时] → 单独标记下载噪声，只在有效且可比较的后续样本上讨论中位数。
- [Cypress 15 能安装但 E2E 行为变化] → 逐项审计 19 个 spec，运行真实 Cypress verify 与可授权 E2E；未闭环则判定 BLOCKED。
- [GitHub Action 对 Bun 支持晚于 Cypress CLI] → 将 action/lockfile 识别作为独立门禁，不把 CLI 支持等同于 workflow 支持。
- [临时副本含 registry 环境] → 不读取、不记录 endpoint、credential、header/token/Cookie；日志只保留脱敏错误摘要。
- [本机没有隔离 DB 或 Docker] → 明确记录不可执行项，不用 spec compile/build 替代 E2E/Docker 结论。

## Migration Plan

1. 在工作分支创建并严格校验评估 change，不修改正式依赖。
2. 记录 Cypress 12/Yarn 当前基线与官方迁移审计。
3. 在临时副本生成 Cypress 15.18.1 Bun 候选并执行隔离样本；失败则立即收敛 `NO-GO`。
4. 若兼容门禁通过，执行完整质量与 E2E/CI 门禁，并根据证据保留或撤销正式候选。
5. 形成单个 RC commit 并 push 工作分支，等待主控决定；本 change 保持 active。

回滚策略：临时副本与 cache 删除即可；若曾在工作分支形成候选依赖改动，`NO-GO` 时只撤销本 change 尚未交付的候选 diff，保留评估文档，不触碰其他 worker 改动。

## Open Questions

无。是否正式采用 Cypress 15/Bun 属于 RC 证据完成后的主控决策，不在本 worker 内决定。
