## ADDED Requirements

### Requirement: package manager 迁移必须先通过量化 GO 门禁
change SHALL 在修改仓库 package manager 真值前，以同一提交、同一机器、隔离 workspace/cache、交替顺序和多次样本对照 Yarn 与 Bun，并 SHALL 以中位数而不是最佳单次结果作决策。

#### Scenario: Bun 达到收益与回退阈值
- **WHEN** Bun 隔离冷安装相对 Yarn 的中位数改善至少 20%
- **THEN** 收益门禁 SHALL 判定为通过
- **AND** 完整 Jest 与 Vite build 的 Bun 中位数 SHALL 各自不比 Yarn 无依据回退超过 10%
- **AND** 原始样本、有效样本数、版本、统计公式和噪声控制 SHALL 被记录

#### Scenario: 记录真实 CI dependency 补充指标
- **WHEN** 可取得至少 3 次从 package-manager setup/cache restore 开始到 frozen install 完成结束的同边界 CI step 样本
- **THEN** verification MAY 记录 Yarn/Bun CI dependency 中位数作为补充证据
- **AND** SHALL NOT 用不完整或选择性截取的 CI 子阶段替代冷安装 GO 门禁

#### Scenario: benchmark 不达标或不可复现
- **WHEN** 冷安装收益低于 20%、Jest/Vite 无依据回退超过 10%、有效样本不足或结果不可复现
- **THEN** change SHALL 判定 NO-GO
- **AND** SHALL 停止 package manager 实现迁移并保留 Yarn 与 `yarn.lock`

### Requirement: GO 后只有一个 package manager 与 lockfile 真值
GO 路径 SHALL 精确 pin 已验证 Bun 版本，并 SHALL 让 package metadata、唯一 Bun text lock、CI cache/install、Docker、Makefile、local-dev/deploy 和当前维护文档使用同一 Bun 真值；仓库 SHALL NOT 长期保留 `yarn.lock` 或 Yarn fallback。

#### Scenario: frozen clean install
- **WHEN** 在没有 `node_modules` 的隔离副本执行 Bun frozen install
- **THEN** 安装 SHALL 使用提交的 Bun lock 成功且不改写 lockfile
- **AND** direct dependencies、React、React Router、Testing Library、Jest、Vite 和业务依赖 SHALL NOT 因迁移被升级

#### Scenario: 审计 package manager 调用方
- **WHEN** review GO candidate 的最终 diff 与仓库调用方
- **THEN** CI、Docker、Makefile、local-dev/deploy、public scripts orchestration、维护文档和契约测试 SHALL 使用 pin Bun 入口
- **AND** `yarn.lock`、Yarn install/cache 和长期 Yarn fallback SHALL 不再作为活动真值存在

### Requirement: Bun 只编排既有 Vite 与 Jest 工具链
Bun SHALL 只承担 package management 与 npm scripts orchestration；Vite SHALL 继续作为唯一默认 dev/build runner，Jest SHALL 继续作为唯一默认 unit test runner。

#### Scenario: 执行完整 Jest
- **WHEN** 开发者或 CI 通过 Bun 运行 `test:ci`
- **THEN** script SHALL 调用仓库现有 Jest 配置而不是 `bun test` 或 Vitest
- **AND** normalized discovery SHALL 保留 141 条基线路径且全部 suite/test SHALL 通过

#### Scenario: 执行 Vite production build
- **WHEN** 开发者或 CI 通过 Bun 运行 `build`
- **THEN** script SHALL 调用现有 typed Vite 配置并输出到 `web-admin/build`
- **AND** Vite 版本、端口、proxy、base path、public assets 和构建语义 SHALL 保持兼容

### Requirement: package manager 兼容门禁必须覆盖高风险依赖与脚本
GO 判定 SHALL 要求 Bun frozen install、full Jest、Vite、TypeScript、production lint、incremental TS、public scripts、Cypress、Web3/face-api/native/postinstall 和 Docker build 或明确降级的审计等价门禁均无阻断失败。

#### Scenario: 任一兼容门禁失败
- **WHEN** frozen install、dependency resolution、postinstall/native、Jest discovery、public scripts、Vite build 或高风险依赖检查出现不可接受差异
- **THEN** change SHALL 判定 NO-GO
- **AND** SHALL NOT 删除 Yarn 真值或用 `--ignore-scripts`、skip、0 tests、双 lockfile掩盖失败

#### Scenario: 本机无法执行真实 Docker build
- **WHEN** 固定 workspace 没有可用 Docker CLI/daemon
- **THEN** verification SHALL 记录 Dockerfile/build-context 静态审计与等价 clean install/build 结果
- **AND** SHALL 明确标记真实 Docker build 未执行并保留 CI/有 Docker 环境补证风险

#### Scenario: 保持 resolution 与 lifecycle 语义
- **WHEN** Bun 从 Yarn 真值生成候选 lock 并执行真实 lifecycle install
- **THEN** `rc-virtual-list` resolution、React/Router/Testing Library/Jest/Vite/Cypress/Web3/face-api 和 native platform package 的关键解析版本 SHALL 与批准基线一致
- **AND** Cypress binary、Husky hook 和必要 native install script SHALL 可验证存在或执行
- **AND** 最终兼容证明 SHALL NOT 使用全局 `--ignore-scripts` 或无边界 trusted dependency 放行

### Requirement: benchmark 与验证证据保持脱敏
benchmark、安装日志摘要、browser smoke 和 verification SHALL NOT 输出 registry credential、token、Cookie、Authorization、完整私有 endpoint、账号密码或原始认证响应。

#### Scenario: 记录工具与 registry 环境
- **WHEN** 文档记录 Node/Yarn/Bun/Docker 版本和网络噪声控制
- **THEN** SHALL 只记录非敏感版本、开关和脱敏环境类别
- **AND** SHALL NOT 回显 registry URL 中的 credential、认证 header 或私有 endpoint 全值
