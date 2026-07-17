## Context

Admin 当前以 Yarn Classic、`yarn.lock` 和 Yarn-only guard 作为唯一活动 package manager 真值。此前 Linux x64 双源 6/6 冷 frozen install 成功，而 Windows Bun 1.3.14 多轮评估持续出现 cache move/extract、物化失败与随机依赖缺失。用户因此只条件性批准一个采用候选：同一 workspace 最多 5 次 frozen 重试，并在每次成功退出后复核 lock 和完整依赖树。

候选实现使用固定 commit、相同 `package.json`、唯一 tracked 原生 `bun.lock` 与独立空 cache。Windows 样本 1 连续 5 次 `bun install --frozen-lockfile` 均返回非零，总耗时约 242 秒；失败类别仍为 `EPERM`、`ENOENT`，最终 direct manifests 为 71/72，缺少公开依赖 `less`。`bun.lock` SHA-256 保持 `C984607E09CC245CB68CAFBDCCF34138964DF86BE332331ABF78EE3B1643ABBF`，说明失败不是 lock 漂移，但依赖树仍不可用。

预先约定的判定是任一 Windows 样本在 5 次内未形成完整 tree 即停止。因样本 1 已满足停止条件，样本 2/3、完整 fresh-tree 质量门禁与 60 隔离部署均未执行。主控接受 NO-GO，并要求撤销所有采用候选，只保留历史评估证据。

## Goals / Non-Goals

**Goals:**

- 准确记录有界重试候选、固定输入、失败次数、依赖完整性与 fail-fast 结论。
- 确保最终 package、lock、CI、Docker、Makefile、Playwright、local-dev、指引与测试相对最新基线无差异。
- 保持 Yarn 与 `yarn.lock` 为唯一活动真值。
- 使用 `--skip-specs` 归档，不把失败候选同步为主规格。

**Non-Goals:**

- 不继续 Windows 样本 2/3，不提高重试上限，不切换 backend、registry 或 Bun canary。
- 不访问 60，不执行 Docker candidate build/deploy，不以 Linux 成功补偿 Windows 门禁失败。
- 不保留 Bun package/lock、安装器、CI/Docker/local-dev 入口或候选测试。
- 不修改业务页面、Go 业务代码、数据库 schema、认证/Provider 契约或 `origin/test`。

## Decisions

### 1. 有界重试未达到采用可靠性门槛

候选的成功条件不是“某次命令最终退出 0”，而是 3 个独立 Windows fresh workspace 均在最多 5 次内形成完整且确定的依赖树。样本 1 的 5 次命令全部失败，且最终缺少一个 direct manifest，因此结果为 NO-GO。继续样本或增加次数不能改变这个预先定义的失败判定，反而会弱化 fail-closed 契约。

### 2. Linux 成功不替代受支持 Windows 路径

Linux 双源 6/6 成功仍是有效历史事实，但本次采用要求同一 tracked lock 同时支持 Windows 与 Linux。Windows 前置失败后没有资格进入 60 运行态阶段，故未取得共享部署锁，也未构建或启动 candidate。不得把“未执行 60”描述为 Linux 部署失败或成功。

### 3. 最终状态整体回滚到 Yarn 基线

候选曾修改 package manager、lock、安装器、Husky hook 兼容、CI、Docker、Makefile、Playwright、local-dev、活动指引与直接测试。最终 closeout 对这些明确 owner 逐项恢复最新 `origin/hfl-test-base` 内容，禁止保留双 lock、隐藏 fallback 或半迁移状态。production diff 必须为 0。

### 4. 历史评估使用 skip-specs 归档

本 change 未交付能力，delta spec 只记录评估判定，不具有现行契约效力。归档使用 `--skip-specs`，归档前后 `openspec/specs` tree 必须保持不变；不得创建 `web-admin-bun-package-manager` 或等价“已采用 Bun”主规格。

### 5. 下一次重评触发条件

只有 Bun 新 stable 明确发布与当前 Windows 症状相关的修复，或另一技术方案已通过独立 fresh workspace 可靠性证据，才重新立项评估。单纯切换 registry、重复同一实验或增加相同重试次数不构成新证据。

## Risks / Trade-offs

- [Bun 的 Linux 可用性暂未转化为跨平台采用] → 保留 6/6 历史证据，但以 Windows 支持路径的硬门槛优先。
- [未来 Bun 修复可能使结论过期] → 结论绑定 Bun 1.3.14 与当前 Windows 证据，并定义新 stable/新方案重评触发条件。
- [归档 change id 含 adopt 容易误读] → proposal、design、tasks、verification 与 archived delta spec 均明确“尝试采用但未采用”。

## Migration Plan

1. 将所有候选 production/tooling 文件恢复为最新 Yarn 基线。
2. 把 OpenSpec artifacts 改写为 NO-GO 历史评估并更新技术债路线。
3. 完成文档-only pre-archive review，验证 production diff 为 0、主规格 tree 未变化。
4. 使用 `--skip-specs` 归档，收敛为最新 base 上 1 个逻辑文档提交并普通推送 base。
5. 删除工作分支与本任务临时 worktree/cache，固定 workspace 回到 clean/aligned base。

## Open Questions

无。NO-GO、停止实验、撤销候选、Yarn 保持活动真值与 `--skip-specs` 归档均已由主控明确决定。
