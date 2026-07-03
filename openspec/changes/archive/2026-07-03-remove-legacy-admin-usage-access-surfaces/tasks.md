## 1. OpenSpec

- [x] 1.1 创建并验证 `remove-legacy-admin-usage-access-surfaces` change，明确旧 UI/API surface cleanup 边界。
- [x] 1.2 更新 usage access、service credential owner boundary、application access center delta specs，避免旧规格继续要求旧入口。

## 2. Backend/API surface

- [x] 2.1 新增 `Insight Admin Provider handoff` 语义 endpoint，复用既有 copy-safe status/config/diagnostic 逻辑。
- [x] 2.2 旧 `/api/application-access/service-credential-governance-*` endpoint 返回稳定拒绝并指向新 endpoint，不输出敏感值。
- [x] 2.3 更新 authz/router 和后端 controller 测试，覆盖新 endpoint 可用、旧 endpoint 拒绝。

## 3. Frontend cleanup

- [x] 3.1 前端 API client 改用新 endpoint，保持 copy-safe package / Insight Profile 字段不回退。
- [x] 3.2 页面默认层、loading/error/empty 和测试断言移除旧“服务凭据治理”产品入口文案。
- [x] 3.3 保留 `Insight Admin Provider 交接`、`生成 Admin 交接包`、manual/secretRef binding 和技术细节折叠语义。

## 4. 验证与收口

- [x] 4.1 按 TDD 先补失败测试，再实现 cleanup。
- [x] 4.2 运行 OpenSpec、Go controller tests、相关 Jest、增量 TS gate、typecheck、build、coverage 和 `git diff --check`。
- [x] 4.3 完成 pre-archive review，archive change。
- [ ] 4.4 self-closeout：收敛为一个最终逻辑 commit，普通非强制 push `HEAD:hfl-test-base`，删除工作分支并短回传主控。
