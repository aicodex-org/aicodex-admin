## 1. OpenSpec

- [x] 1.1 创建 proposal、design、tasks 和 spec delta，使用中文说明并保留必要英文技术名词。
- [x] 1.2 运行 `openspec validate implement-admin-service-credential-governance-config-entry --strict`。
- [x] 1.3 完成实施前 review，确认 scope、写集、安全边界、TDD 和验证计划无阻断问题。

## 2. Backend Contract

- [x] 2.1 先写 RED 后端 focused tests，覆盖配置读取默认值、保存回读、global-admin guard、非管理员拒绝、脱敏/不泄漏、malformed payload/fail-closed。
- [x] 2.2 实现 Admin-owned 配置 DTO、copy-safe 校验、reference-only 保存、Xorm 元数据记录和脱敏回读 builder。
- [x] 2.3 新增 `GET/POST /api/application-access/service-credential-governance-config` controller、router 和 authz allowlist。
- [x] 2.4 保持既有 status endpoint 兼容；如消费配置元数据，只做字段补充，不改变 response shape。
- [x] 2.5 运行 focused Go tests 和受影响 package/function coverage。

## 3. Application Access UI

- [x] 3.1 在 Application Access 既有上下文中增加服务凭据治理配置入口，不新增一级中心或新 UI 库。
- [x] 3.2 扩展 backend client 类型和 GET/POST 调用，使用 `.ts` 类型。
- [x] 3.3 补 focused `.test.tsx`，覆盖配置加载、保存后回读、错误态、reference-only/keep-in-env 状态和敏感值不展示。
- [x] 3.4 运行前端 focused Jest/coverage、增量 TypeScript gate 和 `yarn typecheck`。

## 4. Verification And Closeout

- [x] 4.1 更新 `verification.md`，记录命令、结果、覆盖率对象、脱敏说明和剩余风险。
- [x] 4.2 运行 `openspec validate --changes --strict`、`openspec validate --specs --strict`、`git diff --check`。
- [x] 4.3 完成归档前 review 并修复阻断项。
- [x] 4.4 archive change，重新验证 changes/specs strict。
- [x] 4.5 收敛为一个 change commit，push 工作分支，ff-only 合入并 push `origin/hfl-test-base`，删除本地/远端工作分支，`push_test=false`。
- [x] 4.6 写最终 report 到 vault 并回传结构化 closeout。
