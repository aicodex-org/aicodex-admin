# 验证记录

## 决策摘要

- 结论：**NO-GO**。
- Cypress 15.18.1 候选在 Bun 1.3.14 下的 3 个短路径、空 `node_modules`、独立空 cache、串行 frozen lifecycle install 全部 exit 1；三轮 Cypress postinstall 均因缺失 `bluebird` 失败，均未形成 Cypress binary。
- 同一候选 `package.json` SHA-256 完全一致，但三次 lock generation 产生不同 lock hash和 package 条目数；样本 2 还缺 `safer-buffer`，Web3 深层 ENOENT 仍出现在 `@metamask` 或 `bnc-sdk` 路径。
- 原始 Yarn 1.22.22 frozen control 在独立空 Yarn/Cypress cache 中 exit 0，0 行 ENOENT，Cypress 12.15.0 manifest 与 binary 均存在。
- 正式 workspace 不保留 Cypress 15、Bun lock、package guard、config 或 workflow 候选改动；只保留本 OpenSpec 评估证据。change 保持 active RC，不 archive、不合入或 push base/test。

## 基线与环境

| 项目 | 值 |
|---|---|
| 起始/最新 base | `origin/hfl-test-base@d4e611cd143cf52ed2e539f097b41db39413be29` |
| `origin/test` | `5420c8c386de7daee84b7df41de65ba1c404bf2a`（只读，未 push/merge） |
| OS | Windows 11 x64，build `10.0.26200` |
| Node.js / npm | `v24.14.0` / `11.7.0` |
| Yarn / Bun | `1.22.22` / `1.3.14` |
| 当前 Cypress | package/binary `12.15.0`；`package.json` 声明 `^12.5.1` |
| 候选 Cypress | `15.18.1`；官方 npm `latest=15.18.1`，engines 支持 Node `>=24.0.0` |
| E2E 规模 | 19 个 `*.cy.ts`，22 个 test case |

开始门禁：workspace 起始 clean，`HEAD == origin/hfl-test-base`，`openspec list --json` 无 active change；`openspec/AGENTS.md` 不存在，已按根 `AGENTS.md` 和 `web-admin/AGENTS.md` 执行。

共享 Cypress 12 cache 的 `cypress verify` 因旧盘符与当前用户目录盘符不一致而失败。这是复用 cache 的环境噪声，不用于 Bun 判断；Yarn control 和每个 Bun 样本均使用独立空 Cypress cache。

## Cypress 12→15 迁移审计

### 官方资料

| 资料 | 状态/版本 | 与本评估的关系 |
|---|---|---|
| [Cypress migration guide](https://docs.cypress.io/app/references/migration-guide) | Cypress 13/14/15 breaking changes | 用于现有 config/spec 静态审计。 |
| [Cypress 15.17.0 changelog](https://docs.cypress.io/app/references/changelog#15-17-0) | 2026-06-09；新增 Bun recognized package manager | 证明 Cypress CLI 层开始支持 Bun，不证明 Admin 完整依赖树可安装。 |
| [Cypress 15.18.1](https://www.npmjs.com/package/cypress/v/15.18.1) | 2026-07-07；Node 20.1/22/24+ | Node 24.14.0 满足候选要求。 |
| [cypress-io/cypress#28722](https://github.com/cypress-io/cypress/issues/28722) | 2024-01-15 opened，2026-05-27 closed/completed；Bun 1.0.22 + Cypress 12.8.1 Docker 下载失败 | 相同“Bun 安装 Cypress 失败”大类，具体症状/版本/OS 不同，不是本次 `bluebird` 根因证据。 |
| [cypress-io/cypress#28962](https://github.com/cypress-io/cypress/issues/28962) | 2024-02-18 opened，2026-05-27 closed/completed；由 15.17.0 支持收口 | 证明官方 Bun CLI 支持落点；当前样本说明它没有解决 Admin 的 Windows 依赖链接问题。 |
| [Cypress install docs](https://docs.cypress.io/app/get-started/install-cypress) | Bun >=1.2.22；Bun 默认不运行未信任 dependency scripts | 候选配置 `trustedDependencies: ["cypress"]`，避免跳过 binary 的假成功。 |

### 仓库影响

- Cypress 13 默认 `video=false`，现有 workflow 却始终上传 `cypress/videos`。未来若保持诊断语义，需要显式 `video: true` 或明确接受不再产出视频；仓库未使用 `videoUploadOnPasses`。
- Cypress 14 的 Node/glibc/浏览器、`document.domain` 变化没有直接命中当前 E2E；仓库无 `cy.origin()`、跨 origin、resourceType intercept 或 component testing。
- Cypress 15 的 `cy.exec().code`、三参数 `cy.stub`、component dev-server 等 breaking changes未命中；Vite 8 只作为被测应用 dev server。
- 15.17+ config loader 与 15.18.1 `cy.type`/scroll 时序变化仍需真实 run；静态审计不能替代 E2E。
- 19 个 spec/22 个 test 主要使用 `visit/get/url/request` 与自定义 `cy.login()`，未发现主要已移除 API，源码迁移成本判断为低。
- 独立基线风险：Cypress config/support/spec 共 80 处指向 `localhost:7001`，而 Vite 默认端口和 CI `wait-on` 使用 `7002`。安装成功后仍必须通过真实 branch CI/隔离 harness 解释端口差异。

### GitHub Action 兼容

- [`cypress-io/github-action@v5`](https://github.com/cypress-io/github-action/blob/v5/action.yml) 使用 Node 16 runtime；其 [v5 检测逻辑](https://github.com/cypress-io/github-action/blob/v5/index.js) 只识别 Yarn/pnpm/npm lockfile，不识别 `bun.lock`/`bun.lockb`。
- [`v7.4.1`](https://github.com/cypress-io/github-action/blob/v7.4.1/action.yml) 使用 Node 24，但其 [检测逻辑](https://github.com/cypress-io/github-action/blob/v7.4.1/index.js) 仍不识别 Bun lockfile。
- 未来最小 CI 候选是显式 setup Bun + frozen install，再让较新 action 使用 `install: false`（必要时禁用 action package-manager cache）并用 `bun run start`；或显式 start/wait + `bun run cypress run`。不得保留 `yarn.lock` 让 action 误判 Yarn。

## 隔离方法

- 每个样本通过 `git archive HEAD web-admin` 复制 tracked 输入，不复用 workspace ignored `node_modules`。
- 每个 Bun 样本使用独立短路径 workspace、空 `node_modules`、独立空 `BUN_INSTALL_CACHE_DIR`/`CYPRESS_CACHE_FOLDER`，严格串行执行。
- 临时候选固定 `cypress=15.18.1`、`packageManager=bun@1.3.14`，`preinstall` 只允许 Bun，`prebuild` 使用 Bun，删除临时 `yarn.lock`，并设置 `trustedDependencies[0]=cypress`。
- 未使用 `--ignore-scripts`、跳过 binary、复用 Yarn `node_modules`、手工补包、双 lockfile 或禁用 package guard。
- 使用 ambient registry 配置，但未读取或记录 endpoint、credential、header、token、Cookie 或认证响应。

```powershell
$env:CI = "true"
$env:BUN_INSTALL_CACHE_DIR = "<empty-per-sample-cache>"
$env:CYPRESS_CACHE_FOLDER = "<empty-per-sample-cypress-cache>"
bun install --lockfile-only
bun install --frozen-lockfile
```

## Bun 样本矩阵

三个样本候选 `package.json` SHA-256 均为 `ED442141F4A2FBF4BE2A6CADDDC50C4129B7843DC9D750779CC1C0347231D34F`。

| 样本 | Lock | Frozen lifecycle install | 依赖/产物摘要 | 有效性能样本 |
|---|---|---|---|---|
| Bun-1 | 8.534s，exit 0，SHA-256 `FD967FB5C34731BA3FB4EB5A7047D0C4F3AB6483F733BCFDF7B2FBD15BFC241E`，1752 entries | 189.513s，exit 1，92 行 ENOENT | `bluebird`/binary缺失；`execa`/`safer-buffer`存在；`@metamask` 深层 ENOENT 4 行 | 否 |
| Bun-2 | 9.089s，exit 0，SHA-256 `6916EFFC667F1BA51E776AB11B29FE152CB9B936819C62F85E59DAD3DE708F90`，1731 entries | 180.496s，exit 1，87 行 ENOENT | `bluebird`/`safer-buffer`/binary缺失；`execa`存在；`bnc-sdk` 深层 ENOENT 2 行 | 否 |
| Bun-3 | 9.644s，exit 0，SHA-256 `5793153E7956A92C2D301EBE147529FE0CC9939C87E11EE0481672197DFA0A0A`，1736 entries | 176.708s，exit 1，84 行 ENOENT | `bluebird`/binary缺失；`execa`/`safer-buffer`存在；`bnc-sdk` 深层 ENOENT 2 行 | 否 |

三个 lock 的 package key 差异包含 Jest/debug、`@metamask`、`@ethersproject/providers/ws`、`@coinbase/wallet-sdk` 与 lint-staged 嵌套条目。当前证据不足以把根因唯一归到 registry、Bun resolver 或 hoist/linker，只记录“相同输入生成不同 lock”。

顶层 `ethers`、`@ethersproject/providers`、`@web3-onboard/core`、`viem` manifest 三轮均存在，但深层 Web3 ENOENT 仍出现，不能宣称 Web3 树完整。

## Yarn control

| 输入 | 结果 | 说明 |
|---|---|---|
| 原始 tracked `package.json + yarn.lock`，独立空 Yarn/Cypress cache | 541.610s，exit 0；lock SHA-256 `A0CE7681D5754C792247DEBE433C7BD1370571DC2E7AEC3A9E9F7E45D7AC02D5`；0 ENOENT；Cypress 12.15.0 manifest/binary存在 | 含首次 binary 下载，只证明当前单一真值可安装。 |

Bun 0/3 样本有效，不能计算 20% 安装收益；失败耗时不得与 Yarn control 比较。

## 公网同类问题审计

| 资料 | 版本/OS/状态 | 关联判断 |
|---|---|---|
| [oven-sh/bun#32458](https://github.com/oven-sh/bun/issues/32458) | Bun 1.3.14、Windows 11 x64、Node 24.14.0；2026-06-17 opened，当前 open，无修复版本 | **相同症状与环境，根因未证实相同**：报告 Windows 漏提取深层文件，npm正常；本次同环境出现大量深层 ENOENT，但还含整包未链接与 lifecycle失败。 |
| [oven-sh/bun#30264](https://github.com/oven-sh/bun/issues/30264) | Bun 1.3.13、Windows 11、OneDrive；2026-05-05 opened，当前 open | **弱相关**：同为 Windows hardlink 后依赖缺失，但只在 OneDrive复现；本次使用短路径原生磁盘且 install exit 1。 |
| [oven-sh/bun#33113](https://github.com/oven-sh/bun/pull/33113) | Windows hardlink serialization/copy fallback；2026-06-30 opened，当前 open，未进入稳定版 | **可能相关但未证实**：处理 Windows hardlink/目录创建/错误传播；Bun 1.3.14 不含未合并、未发布修复。 |

未找到官方 issue 精确报告“Cypress 15.18.1 + Bun 1.3.14 + Windows 缺 `bluebird`”；因此只认定可复现的 Bun Windows 依赖树不完整，不定性为 Cypress 15 自身回归。

## 质量门禁与停止点

| 门禁 | 状态 | 说明 |
|---|---|---|
| Cypress 15 package | 部分通过 | 三轮 manifest均为 15.18.1。 |
| Cypress CLI/binary verify | **失败/不可达** | postinstall 缺 `bluebird`，binary三轮均不存在。 |
| `execa` / `safer-buffer` | **不稳定** | `execa` 三轮存在；`safer-buffer` 样本 2 缺失。 |
| Web3/ethers tree | **失败** | 顶层关键 manifest存在，但深层 `@metamask`/`bnc-sdk` ENOENT仍出现。 |
| Jest/typecheck/lint/Vite/public scripts | 未执行 | 成功路径安装门禁失败；不在无效 tree 上伪造结果。 |
| Incremental TS gate | 收口时执行 | 最终无 production/TS 改动。 |
| 19 E2E | 未执行 | binary不可达；无获准隔离 DB；未对 60/共享数据库执行破坏性测试。 |
| Branch CI | 未触发 | `NO-GO` 不保留候选，action v5/Bun lock不兼容，无 implementation candidate。 |
| Changed implementation coverage | N/A | 最终只有 OpenSpec评估文档。 |

## OpenSpec、Git 与清理

- 提案实施前：target strict、all changes strict、`git diff --check` 通过。
- 收口验证：target strict通过；all changes `1/1`；all specs `45/45`；`git diff --check` 通过；incremental TypeScript gate exit 0；placeholder/敏感模式扫描无命中。
- Pre-archive review：本次审查范围内无 Blocking/Fixable 项。最终无生产实施代码，覆盖率与代码注释门槛为 N/A；proposal/design/tasks/spec/verification 以中文说明为主，保留的是 OpenSpec关键字、命令、路径和标准技术术语；验证结论没有把不可达的质量/E2E门禁写成通过。
- 主规格同步：本 change 按 release-candidate-only 保持 active，当前不 archive、不向主规格同步“已采用 Cypress 15/Bun”。
- 临时残留：唯一自建 benchmark 根目录及其 3 个 Bun样本、1 个 Yarn control、cache、binary/output、`node_modules` 和日志已整体删除；未清理 workspace既有依赖或未知用户产物。
- RC 交付：工作分支已 push；最终 HEAD 由结构化交接回传。`origin/hfl-test-base..HEAD` 仅包含本 change 的单个逻辑 commit。
- `push_test=false`、`archive=false`、`merged_push_base=false`、`lease_release=false`、`needs_master_decision=true`。

## 主控决策后的历史归档

- 2026-07-15 主控接受 `NO-GO` 并授权 self-closeout；上述 RC 状态字段是主控决策前的交付快照。
- 执行 `openspec archive evaluate-admin-cypress-15-bun-compatibility --skip-specs --yes`，CLI 明确输出 `Skipping spec updates (--skip-specs flag provided)`。
- 归档后 active change不存在，历史路径为 `openspec/changes/archive/2026-07-15-evaluate-admin-cypress-15-bun-compatibility/`。
- `openspec/specs/admin-cypress-bun-compatibility-evaluation/spec.md` 归档前后均不存在；主规格目录数归档前后均为 45，未同步“已采用 Cypress 15/Bun”的主规格。
- 归档后 `openspec validate --changes --strict` 无 active items，`openspec validate --specs --strict` 为 45/45，`git diff --check` 通过；中文、脱敏与模板占位符审计未发现阻断项。
- 最终 closeout状态以主控回传中的 base push、工作分支删除、workspace clean/aligned 和 `lease_release=true` 为准。

## Remaining Risk

- 没有有效 Cypress 15/Bun tree，因此没有 Jest/typecheck/build/E2E/branch CI 证据；这是 `NO-GO` 的直接结果。
- 无法唯一定位 lock 非确定与文件缺失发生在 resolver、tarball extraction、Windows hardlink、缓存物化或多因素交互；公网资料只支持假设，结论来自本次隔离样本。
- 即使未来 Bun 修复依赖树，Cypress 视频默认值、action 对 Bun lockfile不识别、action runtime和 7001/7002 端口差异仍需独立迁移与 branch CI。
- 只有 Bun 发布相关 Windows install修复的稳定版、或依赖树因独立合法 change变化时才适合新建评估；不得复用失败耗时宣称收益。
