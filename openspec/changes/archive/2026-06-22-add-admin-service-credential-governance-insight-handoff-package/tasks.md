## 1. OpenSpec 准备与审查

- [x] 1.1 完成 proposal/design/spec delta/tasks 并通过实施前 review
- [x] 1.2 运行 `openspec validate add-admin-service-credential-governance-insight-handoff-package --strict`

## 2. TDD 后端/服务层契约

- [x] 2.1 在 `ApplicationAccessCenter.test.tsx` 或相关测试中先新增 handoff package 生成的 RED 测试
- [x] 2.2 在 `ApplicationAccessServiceCredentialGovernanceBackend.ts` 新增 copy-safe handoff package 类型与生成 helper
- [x] 2.3 覆盖 fail-closed 状态、保存回读输入、diagnostic 摘要输入和敏感字段脱敏断言

## 3. TDD UI 交接包入口

- [x] 3.1 先新增 UI RED 测试：生成/查看交接包、紧凑预览、保存后使用回读配置、不影响诊断/保存/应用入口
- [x] 3.2 在 `ApplicationAccessCenter.tsx` 增加“生成/查看交接包”动作和预览状态
- [x] 3.3 覆盖加载、空态、错误态、长文本摘要和敏感材料不渲染

## 4. 验证与记录

- [x] 4.1 运行 focused Jest/coverage，确认 TDD GREEN
- [x] 4.2 运行 `node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`、`yarn typecheck` 和 `yarn build`
- [x] 4.3 运行 `openspec validate --changes --strict`、`openspec validate --specs --strict`、`git diff --check`
- [x] 4.4 补充 `verification.md`，记录命令、结果、覆盖率对象、浏览器 smoke 是否执行和剩余风险

## 5. 归档与 closeout

- [x] 5.1 运行归档前 review 并修复阻塞问题
- [x] 5.2 archive 本 change 并确认主规格同步
- [ ] 5.3 收敛为 1 个 Conventional Commit、push 工作分支、ff-only 合入并 push `hfl-test-base`
- [ ] 5.4 删除本地/远端工作分支，写 final report 并结构化回传
