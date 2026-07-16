## ADDED Requirements

### Requirement: 重评必须固定最新依赖输入与官方版本证据
评估 SHALL 基于同一最新base提交的tracked `web-admin` 输入，并 SHALL 记录Bun、Yarn、Node、Playwright、Jest、Vite与Testing Library版本，以及Bun stable和相关Windows官方issue/PR的访问日期与状态。未发布PR、canary或开放issue SHALL NOT 被表述为stable已修复。

#### Scenario: 依赖树变化触发重评
- **WHEN** Cypress已由Playwright替代且Web3专属依赖已从tracked package/lock删除
- **THEN** 评估 SHALL 使用变化后的最新依赖树重新生成全部样本
- **AND** SHALL NOT 把旧Cypress/Web3树的失败次数计入当前主样本

#### Scenario: 官方stable没有相关已发布修复
- **WHEN** 当前Bun stable与历史评估版本相同且相关issue或PR仍未形成已发布修复
- **THEN** 评估 SHALL 把官方状态记录为归因背景
- **AND** SHALL 仍以本地3个隔离主样本裁决兼容性

### Requirement: 三个Bun主样本必须隔离并真实执行lifecycle
评估 MUST 在3个仓库外短路径副本中串行执行主样本。每个样本 MUST 使用字节相同的tracked输入、空 `node_modules`、独立空lock-generation cache与frozen-install cache，先生成候选 `bun.lock`，再以相同package输入执行 `bun install --frozen-lockfile`和真实lifecycle。

#### Scenario: 构造主样本
- **WHEN** 评估开始任一Bun主样本
- **THEN** 临时package只可调整阻止Bun运行的`preinstall` guard与有明确owner的最小`trustedDependencies`
- **AND** SHALL NOT 修改依赖范围、resolution、业务脚本、源码或tracked workspace

#### Scenario: 执行frozen lifecycle install
- **WHEN** 候选lock生成完成
- **THEN** 评估 MUST 切换到该样本自己的空install cache并确认 `node_modules` 不存在
- **AND** MUST NOT 使用 `--ignore-scripts`、手工补包、Yarn依赖树/cache、共享Bun cache或并行样本

### Requirement: 有效样本必须同时满足安装完整性与可复现性
每个主样本 SHALL 记录lock/install exit、耗时、ENOENT计数、lock hash与entry集合、tree shape、文件数/逻辑字节，以及关键manifest、入口、CLI binary和lifecycle状态。三个样本只有全部安装成功、依赖树完整且lock/tree一致时才可视为3/3有效。

#### Scenario: install非零或出现缺文件
- **WHEN** 任一主样本install非零、出现ENOENT或关键manifest/入口/binary不可用
- **THEN** 该样本 MUST 判定失败
- **AND** 最终结论 MUST 为 `NO-GO`

#### Scenario: install成功但结果不确定
- **WHEN** 三轮lock hash/entry集合或tree shape不一致，或direct dependency解析出现未批准漂移
- **THEN** 可复现性门禁 MUST 判定失败
- **AND** 最终结论 MUST 为 `NO-GO`

#### Scenario: 三轮完整且一致
- **WHEN** 三个样本均exit 0、无缺失、关键入口可执行且lock/tree一致
- **THEN** 评估 MAY 进入Yarn control、性能和质量门禁

### Requirement: 性能结论只能建立在3/3有效Bun样本上
评估 SHALL 只在3/3 Bun主样本有效后，以原始 `package.json + yarn.lock` 和独立空Yarn cache运行可比较的cold controls，并 SHALL 使用有效样本中位数计算依赖阶段收益。Bun改善不足20% MUST 判定 `NO-GO`。

#### Scenario: 任一主样本失败
- **WHEN** 少于3个Bun主样本完整成功
- **THEN** 评估 MUST 停止Yarn性能对照和收益计算
- **AND** SHALL NOT 用失败耗时或最佳单次结果声明性能收益

#### Scenario: 比较有效cold samples
- **WHEN** 三个Bun样本与三个Yarn control均有效
- **THEN** 评估 SHALL 以中位数计算 `(Yarn - Bun) / Yarn * 100%`
- **AND** 只有改善至少20%时性能门禁才可通过

### Requirement: GO必须通过完整Jest、Vite、Playwright与迁移边界门禁
只有有效Bun tree通过现有Jest runner的完整145 suites/1371 tests、app/build-tooling/E2E typecheck、增量TypeScript、production lint、public scripts、Vite production build、Playwright 19/22 discovery，以及可执行的CI/Docker迁移验证时，最终结论才 MAY 为 `GO`。评估 MUST 保持Jest与Playwright runner，不得改用 `bun test`。

#### Scenario: 在Bun tree上运行质量门禁
- **WHEN** 3/3安装与性能门禁均通过
- **THEN** 评估 SHALL 通过 `bun run`执行现有Jest、TypeScript、lint、public scripts、Vite和Playwright discovery入口
- **AND** 完整Jest与Vite相对Yarn基线的无依据回退 SHALL 各自不超过10%

#### Scenario: Docker或CI未闭环
- **WHEN** 现有Admin Docker不能以唯一 `bun.lock` 完成真实frozen install/build，或CI只安装Bun而没有执行Jest/Playwright
- **THEN** 本轮采用结论 MUST 为 `NO-GO`
- **AND** SHALL NOT 以官方通用示例、静态审计或保留 `yarn.lock` 伪装兼容

#### Scenario: 共享环境没有隔离E2E边界
- **WHEN** 没有获准的一次性SQLite或等价可回收环境
- **THEN** 评估 MUST NOT 对60或共享数据库运行破坏性Playwright E2E
- **AND** SHALL 只记录允许的discovery或本地质量证据层级

### Requirement: 评估证据与RC交付必须脱敏且无残留
评估 SHALL 只在当前change保存copy-safe摘要，并 MUST 清理仓库外workspace、cache、lock、日志、binary、process、report与临时数据库。仓库最终diff MUST 只包含当前OpenSpec artifacts。

#### Scenario: 写入verification
- **WHEN** 评估记录版本、样本、官方资料和错误摘要
- **THEN** 文档 SHALL NOT 包含registry credential、token、Cookie、账号密码、完整私有endpoint或raw日志
- **AND** SHALL 区分通过、失败、未执行和因条件不满足停止

#### Scenario: 形成release candidate
- **WHEN** GO/NO-GO证据与pre-archive review完成
- **THEN** change SHALL 保持active且不archive，并收敛为latest base之上一个逻辑评估commit后只push工作分支
- **AND** SHALL NOT push或merge base/test、删除工作分支或释放lease
