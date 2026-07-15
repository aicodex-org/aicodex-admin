## ADDED Requirements

### Requirement: Cypress 大版本升级必须先完成兼容审计
评估过程 SHALL 基于 Cypress 官方 migration/breaking-change 资料和仓库实际代码，覆盖现有 19 个 E2E spec、`cypress.config.ts`、support、TypeScript、Node 24、Vite 8 与 `cypress-io/github-action@v5`，且不得以删除测试、降低断言或跳过 lifecycle 规避不兼容。

#### Scenario: 发现升级破坏性变化
- **WHEN** Cypress 15 对现有配置、spec、Node/浏览器或 CI action 存在破坏性变化
- **THEN** 评估记录具体受影响文件、最小迁移成本和未闭环风险
- **AND** 在实际迁移与门禁完成前不得输出 `GO-CANDIDATE`

### Requirement: Bun 安装样本必须真实且相互隔离
评估过程 MUST 使用 Bun 1.3.14，在短路径临时副本中以空 `node_modules`、每样本独立空 package/Cypress cache 串行执行真实 lock generation 和 frozen lifecycle install，不得使用 `--ignore-scripts`、跳过 Cypress binary、复用 Yarn `node_modules`、手工补包、双 lockfile或禁用 package guard制造通过结果。

#### Scenario: 候选安装失败
- **WHEN** 任一 Cypress 15.18.1 候选 frozen lifecycle install 非零退出
- **THEN** 该样本仅作为兼容失败证据，不计入性能收益
- **AND** 评估记录脱敏退出码、耗时和缺失依赖摘要

#### Scenario: 候选安装成功
- **WHEN** Cypress 15.18.1 候选 frozen lifecycle install 零退出
- **THEN** 评估继续验证 Cypress package/CLI/binary、`execa`、`safer-buffer` 与关键 Web3/ethers manifests
- **AND** 任一关键依赖缺失仍视为安装门禁失败

### Requirement: 性能结论必须来自至少三个有效样本
评估过程 SHALL 只在至少 3 个串行、隔离且完整安装成功的 Bun 冷安装样本上计算性能中位数，并记录独立 Yarn control；首次 Cypress binary 下载噪声 MUST 单独标注，不得作为稳定收益样本。

#### Scenario: 有效样本不足
- **WHEN** 少于 3 个 Bun 样本完成完整 frozen lifecycle install 和依赖完整性检查
- **THEN** 评估不得声明达到安装性能收益阈值

### Requirement: 最终决策必须与完整门禁对应
评估结果 MUST 依据安装、依赖完整性、Jest、typecheck、Vite/public scripts、增量 TypeScript、19 个 E2E 和 CI lockfile/action 兼容证据输出 `GO-CANDIDATE`、`NO-GO` 或 `BLOCKED/NEEDS_DECISION`。

#### Scenario: 安装或深层依赖仍失败
- **WHEN** Cypress 15 候选不能完整 Bun install，或关键 Web3/ethers 依赖仍缺失
- **THEN** 结论为 `NO-GO`
- **AND** 正式 workspace 仅保留评估证据，不保留 package/lock/workflow 候选改动

#### Scenario: 安装通过但 E2E 或 CI 未闭环
- **WHEN** Bun install 与依赖完整性通过，但 19 个 E2E 或 branch CI/action 迁移没有真实通过证据
- **THEN** 结论为 `BLOCKED/NEEDS_DECISION`

#### Scenario: 全部门禁通过
- **WHEN** Bun install、至少 3 个有效样本、完整质量门禁、19 个 E2E 与 CI lockfile/action 兼容均通过
- **THEN** 结论 MAY 为 `GO-CANDIDATE`
- **AND** change 仍保持 RC active，不 archive、不合入 base/test，等待主控决策
