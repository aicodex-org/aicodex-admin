## Why

既有 Linux 隔离样本表明 Bun 1.3.14 可以形成完整依赖树，但 Windows fresh workspace 仍存在 cache move/extract `EPERM`、`ENOENT` 与随机 direct dependency 缺失。用户曾条件性批准以“同一 workspace、最多 5 次 frozen 重试、依赖完整性复核”验证能否把该不稳定性收口为可采用的安装契约。

最终 Windows 主样本在固定候选、空 cache 与原生 tracked `bun.lock` 下连续 5 次失败，最终仅形成 71/72 个 direct dependency manifest，缺少 `less`。该结果直接否定采用硬门槛，因此本 change 以 NO-GO 历史评估归档，不采用 Bun、不部署候选，也不进入 60 环境。

## What Changes

- 记录候选曾实现 Bun 1.3.14 单一 lock、有界 frozen 重试、lock 漂移与依赖完整性 fail-closed 检查，以及对应聚焦测试证据。
- 记录固定 Windows 样本的 5/5 安装失败、71/72 direct manifest、缺少 `less`、lock hash 未漂移与 fail-fast 决策。
- 撤销候选对 package、lock、CI、Docker、Makefile、Playwright、local-dev、开发指引和测试的全部修改，使最终 production/tooling 状态与最新基线字节一致。
- 保持 Yarn Classic 与 `yarn.lock` 为唯一活动 package manager 真值；不提高相同重试次数、不改 backend、不继续样本 2/3，也不以 Linux 成功替代 Windows 支持路径。
- 以 `--skip-specs` 归档，只保留可复核的历史证据，不创建或修改“已采用 Bun”的主规格。

## Capabilities

### New Capabilities

- 无。该 change 的候选能力未通过采用门槛，不形成新的产品或工具链主规格。

### Modified Capabilities

- 无。最终 production、package manager、CI、Docker 与本地开发契约保持 Yarn 基线不变。

## Impact

- 最终仓库变更仅包含本 OpenSpec 历史评估与技术债路线文档。
- `web-admin/package.json`、`web-admin/yarn.lock`、CI、Docker、Makefile、Playwright、local-dev、业务代码和测试相对最新基线均无差异。
- 未访问或部署 60 环境，未修改现有服务、数据库、容器、镜像、网络或 volume。
- 下一次重评只在 Bun 新 stable 明确发布相关 Windows 修复，或另一技术方案已有独立可靠性证据时进行；切换 registry 或增加相同重试次数不构成重评依据。
