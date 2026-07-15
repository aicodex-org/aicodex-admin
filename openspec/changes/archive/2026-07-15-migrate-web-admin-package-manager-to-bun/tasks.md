## 1. 基线与提案门禁

- [x] 1.1 fetch/prune、确认固定 workspace clean/aligned，并从最新 `origin/hfl-test-base` 创建目标工作分支
- [x] 1.2 读取仓库/前端规则、技术债基线、Vite/Jest/CI/TypeScript 主规格和 package metadata
- [x] 1.3 完成 package/lock、CI、Docker、Makefile、local-dev/deploy、docs、Husky/lint-staged、public scripts、Cypress、Web3/face-api/native/postinstall 的只读 inventory
- [x] 1.4 strict validate proposal/design/spec/tasks 并完成 pre-implementation review 至 implementation-ready

## 2. 可复现 Yarn/Bun benchmark

- [x] 2.1 记录 Node/Yarn/Bun/Docker 版本、硬件/进程约束、registry 脱敏规则、隔离目录与 cache 策略
- [x] 2.2 两次独立 Bun cold frozen lifecycle install 均失败且无有效样本；完成一次同环境 Yarn frozen lifecycle control 后按 fail-fast 停止，无性能中位数
- [x] 2.3 [NO-GO 不适用] Bun 未形成有效安装，script startup、full Jest 和 Vite build 不具备等价输入，未用 `--ignore-scripts` 制造样本
- [x] 2.4 本机无 Docker CLI，且 Bun 在 build 前已失败；完成 Dockerfile/build-context 静态审计并明确真实 Docker/build benchmark 未执行
- [x] 2.5 完成 frozen lock、关键 dependency resolution、lifecycle/postinstall、Cypress、Web3/face-api/native 和 public scripts 可达性审计，记录阻断结果

## 3. GO/NO-GO 决策

- [x] 3.1 按兼容失败和有效冷安装样本不足规则记录 NO-GO；20% 收益及 Jest/Vite 回退阈值因无有效 Bun 安装而不可计算
- [x] 3.2 NO-GO 后停止迁移，保持 Yarn/`yarn.lock`，将后续 GO 实施任务标为不适用并完成证据型 RC
- [x] 3.3 [NO-GO 不适用] 不 pin Bun、不生成 tracked Bun lock、不进入 TDD 实施

## 4. 条件式 GO 实施

- [x] 4.1 [NO-GO 不适用] 未新增 Bun package manager 契约测试
- [x] 4.2 [NO-GO 不适用] 保留 Yarn package metadata 与唯一 `yarn.lock`，未提交 Bun lock
- [x] 4.3 [NO-GO 不适用] CI、Docker、Makefile、local-dev/deploy 和 public script orchestration 保持 Yarn
- [x] 4.4 [NO-GO 不适用] living docs/AGENTS 不切换 Bun，历史证据保持不变
- [x] 4.5 [NO-GO 不适用] 无实现契约 diff；确认 tracked 实现没有 Yarn/Bun 双真值

## 5. 条件式 GO 完整验证

- [x] 5.1 [NO-GO 失败证据] 两次 Bun frozen clean install 使用相同 lock 输入但均退出 1，未满足门禁
- [x] 5.2 [NO-GO 不适用] 无有效 Bun dependency tree，未运行或伪造 Jest discovery/suite/test 对照
- [x] 5.3 [NO-GO 不适用] 未修改工具链，实现层 typecheck/lint/public scripts/Vite build 回归门禁无需重复运行
- [x] 5.4 [NO-GO 失败证据] Cypress postinstall 两次失败；native/public scripts/Docker downstream 门禁不可达并已记录
- [x] 5.5 [NO-GO 不适用] 无前端实现、依赖或运行时行为变化，不执行浏览器 smoke
- [x] 5.6 Coverage N/A：最终仅修改 OpenSpec 文档，无 production implementation statements 或可统计 changed implementation

## 6. Review 与 release candidate 收口

- [x] 6.1 更新本 verification、tasks 和剩余风险，运行 OpenSpec target/changes/specs strict 与 `git diff --check`
- [x] 6.2 已确认 NO-GO archive 使用 `--skip-specs`，不创建或修改 package-manager 主规格，不修改当前 Yarn 活动命令或历史归档/dated evidence
- [x] 6.3 使用 pre-archive review 迭代至 READY，但不 archive
- [x] 6.4 fetch/rebase 最新 `origin/hfl-test-base`，重跑关键门禁并收敛为一个逻辑 commit
- [x] 6.5 只推送 `hfl-test/migrate-web-admin-package-manager-to-bun`，不合入 base/test、不删除分支、不释放 lease
- [x] 6.6 清理 benchmark/cache/build/coverage/plan/process residue，终审 workspace clean
