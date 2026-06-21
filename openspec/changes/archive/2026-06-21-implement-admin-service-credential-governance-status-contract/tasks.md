## 1. OpenSpec

- [x] 1.1 创建 proposal、design、tasks 和 spec delta，使用中文说明并保留必要英文技术名词。
- [x] 1.2 运行 `openspec validate implement-admin-service-credential-governance-status-contract --strict`。
- [x] 1.3 完成实施前 review，确认 scope、写集、安全边界、TDD 和验证计划无阻断问题。

## 2. Backend Contract

- [x] 2.1 先写 RED 后端 focused tests，覆盖四个治理分组、状态分类、敏感值不泄漏和 Gateway projection blocked 分支。
- [x] 2.2 新增 Admin-owned 只读脱敏状态 builder 和 `GET /api/application-access/service-credential-governance-status` controller。
- [x] 2.3 接入 router 和 authz GET allowlist，不新增写接口，不触发 Gateway projection publish。
- [x] 2.4 运行 focused Go tests 和受影响 package coverage。

## 3. Application Access UI

- [x] 3.1 判断 UI 接入是否保持小范围；若合理，在 Application Access 既有上下文消费新接口。
- [x] 3.2 补 focused `.test.tsx`，覆盖加载、错误、摘要展示和服务凭据值不泄漏。
- [x] 3.3 运行前端 focused Jest、增量 TypeScript gate 和 `yarn typecheck`。

## 4. Verification And Closeout

- [x] 4.1 更新 `verification.md`，记录命令、结果、覆盖率对象、脱敏说明和剩余风险。
- [x] 4.2 运行 `openspec validate --changes --strict`、`openspec validate --specs --strict`、`git diff --check`。
- [x] 4.3 完成归档前 review 并修复阻断项。
- [x] 4.4 archive change，重新验证 changes/specs strict。
- [x] 4.5 收敛为一个 change commit，push 工作分支，ff-only 合入并 push `origin/hfl-test-base`，删除本地/远端工作分支，`push_test=false`。
- [x] 4.6 写最终 report 到 vault 并回传结构化 closeout。
