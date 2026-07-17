# 验证记录

## 结论

- 决策：`NO-GO`
- 采用状态：未采用 Bun；Yarn 与 `yarn.lock`继续作为唯一活动真值。
- 部署状态：未进入60环境，未构建或启动production candidate。
- 归档模式：`--skip-specs`，不形成已采用Bun的主规格。

## 固定候选输入

- 候选HEAD：`8ad40f4c4161c68b6761b8c2e89fcc6e3fd63d66`
- Bun：`1.3.14`
- 三个短路径fresh workspace均来自同一候选HEAD，初始无 `node_modules`、无 `yarn.lock`，并使用各自独立空cache。
- 三个输入的 `package.json` hash一致。
- tracked原生 `bun.lock` SHA-256：`C984607E09CC245CB68CAFBDCCF34138964DF86BE332331ABF78EE3B1643ABBF`。

## Windows主样本

| 样本 | 执行结果 | 尝试次数 | 耗时 | lock | direct manifests | 结论 |
| --- | --- | ---: | ---: | --- | --- | --- |
| 1 | 失败，exit 1 | 5/5 | 242352 ms | hash未漂移 | 71/72，缺少 `less` | 依赖树不完整，触发fail-fast |
| 2 | 未执行 | 0 | N/A | 输入hash已核对一致 | N/A | 样本1已满足停止条件 |
| 3 | 未执行 | 0 | N/A | 输入hash已核对一致 | N/A | 样本1已满足停止条件 |

失败类别为Windows cache move/extract `EPERM`、`ENOENT`；没有把registry、credential、token、Cookie、DSN、私有URL或原始环境配置写入本记录。最终lock未漂移不能弥补依赖树不完整。

## 候选机制的局部验证

下列验证在候选仍存在时执行，只证明重试/完整性机制和入口切换测试可运行，不构成Bun采用、fresh install、完整质量或部署通过：

- 聚焦Jest：4 suites、44 tests通过。
- 安装器聚焦Jest：25/25通过。
- 候选安装器changed executable coverage：statements 87.79%，lines 88.55%。
- `bun run typecheck`：通过。
- 两条PowerShell local-dev脚本语法检查：通过。
- 真实Husky pre-commit与lint-staged：通过，未使用 `--no-verify`。
- OpenSpec target/all changes/all specs strict与 `git diff --check`：通过。

Windows fresh install已经失败，因此没有运行fresh tree上的全量Jest、三类typecheck、lint、public scripts、Vite build、Playwright discovery或浏览器smoke。不得把上述局部验证提升为完整质量门禁。

## 未进入60的原因

60阶段的前置条件是Windows 3/3样本成功。样本1已在固定上限内失败，故没有发送 `RUNTIME_GATE_READY`、没有获取共享部署锁，也没有访问、构建或部署60。既有Linux双源6/6成功仍是历史证据，但不能替代Windows支持路径。

## 最终回滚与文档门禁

- 本change拥有的package、lock、CI、Docker、Makefile、Playwright、local-dev、活动指引与候选测试均恢复为最新 `origin/hfl-test-base`内容。
- 最终range的production/tooling diff为0；最终只保留OpenSpec历史评估和技术债路线文档。
- 覆盖率：N/A。最终无实施代码或测试差异，候选coverage只作为历史机制证据。
- `openspec/specs`在归档前后保持相同tree；archive使用 `--skip-specs`。
- 3个候选worktree与独立cache已清理；固定workspace既有ignored `node_modules`和全局Bun cache未清理。

## 剩余风险

- Bun 1.3.14在Linux可安装而Windows仍不可靠，当前仓库继续承担Yarn Classic维护成本。
- 新stable若明确发布相关Windows修复，需要重新建立独立change和fresh workspace证据；不得沿用本次失败样本宣称永久不可用。
