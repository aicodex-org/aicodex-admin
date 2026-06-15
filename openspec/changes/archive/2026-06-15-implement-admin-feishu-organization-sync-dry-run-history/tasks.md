## 1. OpenSpec 与启动门禁

- [x] 1.1 创建 `implement-admin-feishu-organization-sync-dry-run-history` change，并完成 proposal/design/spec delta/tasks。
- [x] 1.2 运行 target OpenSpec validate、全量 changes validate 和 `git diff --check`，完成实施前 review 并修复 Blocking/Fixable 问题。

## 2. 后端对象、存储与服务

- [x] 2.1 先补 object 层测试，覆盖成功 preview history 摘要、fail-closed 摘要、敏感字段不落库/不返回、history store 失败不破坏 preview 语义。
- [x] 2.2 新增 Feishu dry-run history model、store、查询条件、列表/详情 service，并接入 xorm 自动建表。
- [x] 2.3 将 dry-run preview service 接入 history 记录，生成 request marker、operator hash、source connection hash、retention/redaction metadata 和 safe diagnostics。
- [x] 2.4 补充列表/详情筛选测试，覆盖 organization、sourceConnectionIdHash、status/diagnostic alias、time range、limit/topN。

## 3. API、鉴权与路由

- [x] 3.1 新增 `/api/feishu-org-sync/dry-run-history` 列表 API 和 `/api/feishu-org-sync/dry-run-history/:historyId` 详情 API。
- [x] 3.2 补 controller/router/authz 测试，覆盖组织边界、查询参数、详情安全返回和 dry-run preview 自动记录。
- [x] 3.3 确认 API 响应不包含 raw Contact payload、完整树/用户列表、token、secret、手机号、邮箱、`open_id`、`union_id`、`user_id` 明细。

## 4. 前端 dry-run 历史

- [x] 4.1 扩展 FeishuOrganizationSyncBackend，增加 dry-run history 列表/详情 API 调用及测试。
- [x] 4.2 在飞书组织同步页面新增最近 dry-run 历史表、刷新、状态/诊断展示和详情 Drawer。
- [x] 4.3 补页面测试，覆盖 loading/empty/error/long text、详情 Drawer、成功和失败记录展示。

## 5. 验证、归档与交付

- [x] 5.1 运行相关 Go tests、前端 test/build 或项目既有等价命令，并记录 changed-function/touched production coverage 证据。
- [x] 5.2 更新 `verification.md`，记录命令、结果、覆盖率口径、未触发真实飞书租户同步和剩余风险。
- [x] 5.3 完成 pre-archive review，修复 Blocking/Fixable 问题。
- [x] 5.4 archive change，运行 archive 前后 OpenSpec strict validate、`git diff --check`、相关测试。
- [x] 5.5 整理为单 change commit，显式 push 工作分支；验证通过且无 blocker 时 ff-only 合入并 push `origin/hfl-test-base`，禁止 push `test`。
- [x] 5.6 写完整回传报告并短回传协调线程。
