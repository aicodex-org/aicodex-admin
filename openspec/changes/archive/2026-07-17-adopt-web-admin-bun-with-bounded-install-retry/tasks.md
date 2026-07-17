## 1. 候选设计与局部验证

- [x] 1.1 创建中文 OpenSpec，定义 Bun 1.3.14 单 lock、同 workspace 最多 5 次 frozen 重试、完整性检查、Windows 3 样本与 60 后置门禁。
- [x] 1.2 完成实施前审查至 READY；该结论仅表示候选可实施，不表示 Bun 已采用或可靠性门禁已通过。
- [x] 1.3 以 TDD 验证首次失败后成功、永久失败、lock 漂移、direct 缺失、错误可见性和跨平台路径；候选安装器 statements 87.79%、lines 88.55%。
- [x] 1.4 候选聚焦 Jest 4 suites 44/44、安装器 25/25、app typecheck、PowerShell 语法、OpenSpec strict 与真实 Husky pre-commit 通过；这些结果只证明候选机制，不证明 fresh install 可用。

## 2. Windows采用硬门禁

- [x] 2.1 从固定候选创建 3 个独立短路径 fresh workspace；输入 `package.json` 与 tracked `bun.lock` hash 一致，初始无 `node_modules`、无 `yarn.lock` 且 cache 为空。
- [x] 2.2 严格串行执行样本 1 的最终安装入口；同一 workspace/cache 的 5 次 frozen install 全部返回非零，失败类别为 Windows cache move/extract `EPERM`、`ENOENT`。
- [x] 2.3 确认失败后 lock hash未漂移，direct manifests 为 71/72且缺少 `less`，依赖树不完整。
- [x] 2.4 按预先 fail-fast 契约停止；不运行样本 2/3、不提高上限、不切 backend、不进入完整 fresh-tree 质量门禁或 60 部署。
- [x] 2.5 向 controller 回传 `LOCAL_GATE_FAILED`，主控接受 NO-GO并授权历史 closeout。

## 3. NO-GO收敛

- [x] 3.1 逐项恢复本 change 拥有的 package、lock、CI、Docker、Makefile、Playwright、local-dev、指引和候选测试，使 production/tooling diff 为 0。
- [x] 3.2 将 proposal、design、spec、tasks、verification改写为“尝试采用但硬门禁失败，未采用、未部署、未进入60”的中文脱敏历史记录。
- [x] 3.3 更新技术债路线：Yarn/`yarn.lock`继续作为唯一活动真值，并收紧下一次重评触发条件。
- [x] 3.4 清理3个候选 worktree及独立cache；不清理固定 workspace 既有 `node_modules`或全局Bun cache。
- [x] 3.5 完成文档-only pre-archive review至READY，覆盖率N/A，并验证OpenSpec strict、diff check、production diff为0和主规格tree不变。
- [x] 3.6 使用 `--skip-specs`归档，确认active change移除、archive存在且主规格tree未同步。
- [x] 3.7 已获得主控对latest base + 1逻辑提交、普通非强制push `hfl-test-base`、不push/merge `test`以及完成后清理分支并释放锁/lease的明确closeout授权。
