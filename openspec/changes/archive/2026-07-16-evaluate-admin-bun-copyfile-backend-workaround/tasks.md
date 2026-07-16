## 1. 基线与官方证据

- [x] 1.1 记录最新base、Node/Yarn/Bun/Cypress版本、Bun backend/help、当前package/lock和两份NO-GO样本边界。
- [x] 1.2 核验Bun #33113、#32458及相关官方issue/release notes，记录状态、版本、OS、workaround和关联强度。
- [x] 1.3 固化Cypress/Web3/ethers目标manifest、入口文件、模块解析和磁盘/link-count检查清单。

## 2. copyfile主样本

- [x] 2.1 建立tracked-input短路径临时候选，固定Cypress 15.18.1、Bun guard/prebuild、`trustedDependencies`并移除临时Yarn lock。
- [x] 2.2 串行运行3个独立 `lockfile-only` + `frozen-lockfile --backend=copyfile` 主样本，记录输入/lock hash、entries、耗时、exit和ENOENT。
- [x] 2.3 逐样本验证Cypress manifest/binary/verify、基础传递依赖及Web3/ethers深层manifest、入口和模块解析完整性。
- [x] 2.4 逐样本记录node_modules/cache逻辑字节、文件数和代表文件 `nlink`，说明copyfile磁盘/性能成本。
- [x] 2.5 比较3轮lock package-key集合和目标树确定性，并按任一失败或不完整即 `NO-GO` 判定。

## 3. 诊断或成功路径门禁

- [x] 3.1 若主样本失败，运行1个独立 `copyfile --concurrent-scripts=1` 诊断样本并区分物化、提取和lifecycle并发证据。
- [x] 3.2 若3个主样本均成功且完整，运行至少3个有效冷安装性能样本和Yarn同边界control，验证20%收益及磁盘成本。（条件未满足，按设计停止。）
- [x] 3.3 仅在成功路径运行Cypress verify/19 E2E授权环境或branch CI、Jest、typecheck、lint、Vite/public scripts/build与Web3 bundle。（条件未满足，未在无效tree上伪造门禁。）
- [x] 3.4 仅在成功路径验证Docker及CI/action Bun lock可运行方案；无隔离DB时不得对60或共享数据库执行破坏性E2E。（条件未满足，未触碰共享环境或workflow。）

## 4. 决策与RC交付

- [x] 4.1 根据主样本和条件门禁输出 `NO-GO`、`BLOCKED` 或 `GO-CANDIDATE`，失败时确保正式workspace无package/lock/config/workflow/业务候选。
- [x] 4.2 编写脱敏 `verification.md`，包含样本矩阵、原因定位、官方资料、copyfile成本、质量/E2E/CI状态和剩余风险。
- [x] 4.3 运行OpenSpec target/all changes/all specs strict、incremental TS gate、`git diff --check`和pre-archive review；保持active，不archive。
- [x] 4.4 清理本任务临时根/cache/binary/log/node_modules及browser-act临时输出，不删除未知用户产物。
- [x] 4.5 收敛为单个RC commit并push工作分支，回传 `push_test=false`、`lease_release=false`、`needs_master_decision=true`。
