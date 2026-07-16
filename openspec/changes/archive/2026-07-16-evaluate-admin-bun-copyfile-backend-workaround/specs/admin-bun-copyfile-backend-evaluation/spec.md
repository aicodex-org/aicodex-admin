## ADDED Requirements

### Requirement: copyfile主样本必须隔离且真实执行lifecycle
评估过程 MUST 使用Bun 1.3.14和Cypress 15.18.1，在3个短路径、空 `node_modules`、独立空Bun/Cypress cache的副本中串行执行lock generation与 `bun install --frozen-lockfile --backend=copyfile`，并显式信任Cypress lifecycle。

#### Scenario: 运行主样本
- **WHEN** 评估开始一个copyfile主样本
- **THEN** 样本只使用tracked输入和自己的空cache
- **AND** 不使用 `--ignore-scripts`、手工补包、Yarn依赖树/缓存、双lock或跳过Cypress binary

### Requirement: 安装成功必须同时满足依赖树完整性
每个主样本 SHALL 记录package输入hash、lock hash/entries、耗时、exit code和ENOENT，并 MUST 验证Cypress manifest/binary/verify、`bluebird`、`safer-buffer`、`execa`及Web3/ethers目标包的manifest、入口文件与模块解析。

#### Scenario: install非零退出
- **WHEN** 任一主样本install非零退出
- **THEN** 该样本判定失败且不得计入性能收益
- **AND** 最终结论必须为 `NO-GO`

#### Scenario: install零退出但树不完整
- **WHEN** install零退出但任一目标manifest、入口文件、binary、verify或模块解析失败
- **THEN** 该样本仍判定失败
- **AND** 最终结论必须为 `NO-GO`

### Requirement: lifecycle单并发仅作为失败诊断
评估过程 MAY 在主样本失败后运行一个独立的 `--backend=copyfile --concurrent-scripts=1` 样本，但 SHALL 将其与3个主样本分开报告，且不得用诊断成功覆盖主样本失败。

#### Scenario: 诊断样本改变失败表现
- **WHEN** 单并发诊断样本与主样本结果不同
- **THEN** 评估记录该差异对物化与lifecycle并发假设的支持程度
- **AND** 主样本失败判定保持不变

### Requirement: copyfile成本必须纳入决策
评估过程 SHALL 记录node_modules与cache逻辑字节、文件数、代表文件link count和安装耗时，并明确copyfile不与cache共享hardlink的磁盘成本；安装成功本身不得被视为优于Yarn。

#### Scenario: 无足够有效性能样本
- **WHEN** 少于3个完整成功且依赖树完整的copyfile冷安装样本
- **THEN** 评估不得计算或声明达到20%安装收益阈值

### Requirement: 最终结论必须匹配完整门禁
评估结果 MUST 根据3个主样本、依赖树、性能、Yarn control、Cypress/19 E2E、Jest/typecheck/lint/Vite/public scripts/build、Web3和CI/action证据输出 `NO-GO`、`BLOCKED` 或 `GO-CANDIDATE`。

#### Scenario: 任一主样本失败
- **WHEN** 任一copyfile主样本失败或树不完整
- **THEN** 结论为 `NO-GO`
- **AND** 正式workspace只保留OpenSpec评估证据

#### Scenario: 主样本成功但完整门禁未闭环
- **WHEN** 3个主样本均成功但质量、E2E、CI或20%收益任一未闭环
- **THEN** 结论为 `BLOCKED`

#### Scenario: 全部门禁通过
- **WHEN** 3个主样本和完整质量、E2E、CI及收益门禁全部通过
- **THEN** 结论 MAY 为 `GO-CANDIDATE`
- **AND** change仍保持RC active，不archive、不合入base/test，等待主控决策
