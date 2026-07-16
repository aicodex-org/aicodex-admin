## Why

前三轮 Bun 1.3.14 Windows 评估都因 cache/extraction 阶段缺文件而判定 `NO-GO`，但 Cypress 已由 Playwright 替代，Web3 钱包认证又删除了 13 个直接依赖和 291 个专属 lock 条目，当前依赖树与历史失败输入已发生实质变化。需要在最新 Yarn 基线上重新执行隔离、可复现的安装与质量门禁，判断变化是否足以解除阻断；在证据成立前不能实施 package manager 迁移。

## What Changes

- 建立 Web3 退役后 Bun package manager 的一次性重评估契约，固定最新 tracked `package.json`/`yarn.lock`、Playwright、RTL 16 与现有 Jest/Vite 为输入，不复用 Cypress/Web3 历史失败树作为当前结果。
- 在 Windows 短路径中串行运行至少 3 个相互隔离的 Bun lifecycle 主样本：每轮先生成候选 lock，再以相同输入执行 frozen install，并记录 exit、耗时、ENOENT、lock hash/entries、tree shape 和关键 manifest/binary。
- 固化 fail-fast：任一主样本失败或依赖树不完整即判定 `NO-GO`，停止性能与质量结论；只有 3/3 有效时才执行 Yarn 冷安装对照、20% 收益比较、完整 Jest 145/1371、TypeScript/lint/public scripts/Vite/Playwright discovery 与 Docker/CI 迁移可行性门禁。
- 核验当前 Bun stable、Windows install 相关官方 issue/PR/release 与 CI/action/lockfile 支持；开放问题或未发布修复只用于归因，不替代本地样本。
- 输出脱敏 `GO` 或 `NO-GO` 证据；本 change 只评估，不修改 package metadata、`yarn.lock`、workflow、Docker、Makefile、local-dev、业务代码或测试，不迁移 `bun test`。
- 保持 release-candidate-only：完成后保留 active change 和单个评估 commit，推送工作分支，等待主控决策；不 archive、不合入 base/test。

## Capabilities

### New Capabilities

- `web-admin-bun-package-manager-reevaluation`: 定义依赖树缩小后的 Bun Windows 隔离安装、可复现性、性能/质量条件门禁、官方证据和 GO/NO-GO 决策契约。

### Modified Capabilities

无。本 change 不改变现有 Yarn、Jest、Vite、Playwright、CI、Docker 或本地开发的活动契约。

## Impact

- 仓库内只新增当前 OpenSpec change 的 proposal、design、delta spec、tasks 与 verification；无生产实现、依赖、lockfile、配置、workflow 或测试 diff。
- 安装实验只在仓库外短路径临时副本中进行，使用独立 cache、lock 输出和 `node_modules`，结束后全部清理。
- 不触碰 60、共享数据库、Provider/Insight 运行时、Admin Go 后端、真实凭据或 `test` 分支。
- 若评估为 `GO`，也只说明具备后续独立迁移 change 的前置证据，不在本 change 内实施迁移。
