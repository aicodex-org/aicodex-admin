## 1. 基线与迁移审计

- [x] 1.1 记录 Node、Yarn、Bun、Cypress 解析版本、19 个 E2E 清单及当前 config/support/CI action 基线。
- [x] 1.2 核验 Cypress 官方 issue #28722、#28962、12→15 migration/breaking changes、15.18.1 发布状态与 `cypress-io/github-action@v5` 的 Bun lockfile 支持。
- [x] 1.3 对照现有 spec/config/support/TypeScript/Node 24/Vite 8，形成逐项迁移影响、最小改动和不确定项清单。

## 2. 隔离安装兼容性

- [x] 2.1 建立 tracked-input 短路径临时副本方法，只在副本中固定 Cypress 15.18.1、切换 Bun guard/orchestration 并清除 Yarn lock。
- [x] 2.2 串行运行至少 3 个相互隔离的 Bun 1.3.14 lock generation + frozen lifecycle install 样本，记录耗时、exit code、lock hash 与有效性。
- [x] 2.3 对每个成功样本验证 Cypress package/CLI/binary、`execa`、`safer-buffer` 和关键 Web3/ethers manifests；任何失败按 fail-fast 收敛 `NO-GO`。
- [x] 2.4 使用原始 package/yarn.lock、独立空 Yarn/Cypress cache 运行 Yarn control，并隔离首次 Cypress binary 下载噪声。

## 3. 成功路径质量与 E2E 门禁

- [x] 3.1 仅在 Bun 安装兼容门禁通过后运行仓库现有 `test:ci`、typecheck、build tooling、lint、Vite build、public scripts 和增量 TypeScript gate。（安装门禁失败，成功路径按 fail-fast 记为不可达。）
- [x] 3.2 使用非破坏性本地/CI harness 验证 19 个 E2E 可执行性；没有获准隔离 DB 时不得写共享环境，并将未完成的真实 branch CI 记录为 blocker。（binary不可达且无隔离 DB，未运行共享环境；状态已记录。）
- [x] 3.3 验证 `cypress-io/github-action@v5` 是否识别 Bun 单一 lockfile及所需 install/start 命令；不保留 `yarn.lock` 作为伪兼容。

## 4. 决策、验证与 RC 交付

- [x] 4.1 根据完整证据判定 `GO-CANDIDATE`、`NO-GO` 或 `BLOCKED/NEEDS_DECISION`；`NO-GO` 时撤销正式 package/lock/config/workflow 候选改动。
- [x] 4.2 编写脱敏 `verification.md`，包含命令、版本、样本矩阵、有效/无效样本、19 E2E/CI 与质量门禁状态、剩余风险和环境限制。
- [x] 4.3 运行 OpenSpec target/all changes/all specs strict、`git diff --check` 和归档前 review；RC 阶段保持 change active，等待主控接受 `NO-GO` 后再按 skip-specs语义归档。
- [x] 4.4 清理已知临时 benchmark 副本、cache、Cypress binary/output、`node_modules`、coverage/build 产物，确认无未知用户产物被删除。
- [x] 4.5 收敛为单个 RC commit并 push 工作分支，以 `push_test=false` 和 `needs_master_decision=true` 回传主控决策。
