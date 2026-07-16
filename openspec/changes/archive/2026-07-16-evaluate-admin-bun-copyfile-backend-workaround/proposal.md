## Why

既有评估已证明 Bun 1.3.14 在 Windows 默认 `hardlink` backend 下无法为 Admin/Cypress 15.18.1形成完整依赖树。Bun官方仍在处理 Windows hardlink专属问题，而稳定版已提供 `copyfile` backend，因此需要以隔离样本验证该 backend究竟能绕过物化问题，还是仍会被 tarball extraction或其它依赖完整性问题阻断。

## What Changes

- 复用上一轮 Cypress 15.18.1临时候选边界，在短路径、空 `node_modules`、每样本独立空 Bun/Cypress cache和真实 trusted lifecycle条件下，串行执行至少3个 `bun install --frozen-lockfile --backend=copyfile` 主样本。
- 逐样本记录 lock hash/entries、安装耗时/exit、ENOENT、Cypress manifest/binary/verify、`bluebird`/`safer-buffer`/`execa`及Web3/ethers关键文件完整性，并比较 lock/tree确定性。
- 若 copyfile主样本失败，可追加一个 `--backend=copyfile --concurrent-scripts=1` 诊断样本，仅区分依赖物化与lifecycle并发，不计入三个主样本。
- 只有3个主样本全部成功且依赖树完整，才继续 Yarn同边界control、性能阈值、Jest/typecheck/lint/Vite/public scripts/build、Web3 bundle、Cypress/19 E2E和CI/action路径门禁。
- 审计 Bun官方 issue、PR、release notes，区分相同症状、可能相同根因与弱相关证据；不安装 canary，不把开放PR写成稳定修复。
- 根据证据输出 `GO-CANDIDATE`、`BLOCKED` 或 `NO-GO`；保持 release-candidate-only，不 archive、不合入 base/test、不释放lease。
- 记录 `copyfile` 不与cache共享hardlink所带来的磁盘占用和安装性能成本；不得只因安装成功就宣称优于Yarn。

## Capabilities

### New Capabilities

- `admin-bun-copyfile-backend-evaluation`: 定义 Windows `copyfile` backend解阻评估的隔离样本、依赖树完整性、诊断分流、性能成本和决策门禁。

### Modified Capabilities

无。

## Impact

- 评估输入：当前 tracked `web-admin`、Cypress 15.18.1临时候选边界、Bun 1.3.14及既有Yarn基线。
- 所有 package/guard/lock/backend候选修改只发生在临时副本；`NO-GO` 最终 workspace只保留OpenSpec证据。
- 只有达到 `GO-CANDIDATE` 且主控需要审阅时，才允许工作分支保留最小候选；本 change仍不得 archive或合入共享分支。
- 不修改后端API、运行时配置、数据库、业务代码、共享测试环境或用户可见行为。
