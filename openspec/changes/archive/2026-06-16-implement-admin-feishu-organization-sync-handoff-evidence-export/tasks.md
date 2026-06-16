## 1. OpenSpec 与启动门禁

- [x] 1.1 创建 `implement-admin-feishu-organization-sync-handoff-evidence-export` change，完成 proposal/design/spec delta/tasks。
- [x] 1.2 运行 target OpenSpec validate、全量 changes validate 和 `git diff --check`，完成实施前 review 并修复 Blocking/Fixable 问题。

## 2. 后端 handoff evidence read model

- [x] 2.1 先补 object 层测试，覆盖 ready、blocked、unsupported、no-run、binding conflict、cannotInfer 和脱敏输出。
- [x] 2.2 新增 Feishu handoff evidence DTO、service、source selector 和 readiness classification。
- [x] 2.3 聚合 run/dry-run history/binding diagnostics/config 元数据，并保证只读、不触发同步、不写 User/Group/Platform*/Gateway facts。
- [x] 2.4 补 changed-function 测试设计和验证记录；Go 重包 coverage 在当前 Windows/Go 环境无法形成可信 profile，已在 `verification.md` 记录复现证据和剩余风险。

## 3. API、鉴权与路由

- [x] 3.1 新增 `GET /api/feishu-org-sync/handoff-evidence` 只读 API。
- [x] 3.2 补 controller/router/authz tests，覆盖组织边界、sourceType/sourceId 参数、错误路径和安全响应。
- [x] 3.3 确认 API 响应不包含手机号、邮箱、真实姓名、raw Feishu response、token、Cookie、私有 URL、tenant secret、真实 `appId`、tenant key 或原始 run/history id。

## 4. 前端 evidence export

- [x] 4.1 扩展 `FeishuOrganizationSyncBackend`，增加 handoff evidence API 调用及测试。
- [x] 4.2 在飞书组织同步页面新增交接证据区域、source type 选择、刷新按钮和摘要视图。
- [x] 4.3 支持复制/导出脱敏 evidence JSON，并覆盖 loading/empty/error/unsupported/no-run/blocked/ready/long text 状态。

## 5. 验证、归档与交付

- [x] 5.1 运行相关前端 Jest/build、OpenSpec/diff checks，并记录 Go focused tests 在本机无法形成可信通过证据的环境复现信息。
- [x] 5.2 更新 `verification.md`，记录命令、结果、覆盖率口径、未触发真实飞书租户同步和剩余风险。
- [x] 5.3 完成 pre-archive review，修复 Blocking/Fixable 问题。
- [x] 5.4 archive change，运行 archive 前后 OpenSpec strict validate、`git diff --check`、相关测试。
- [x] 5.5 整理为单 change commit，显式 push 工作分支；验证通过且无 blocker 时 ff-only 合入并 push `origin/hfl-test-base`，禁止 push `test`。
- [x] 5.6 写完整回传报告并短回传协调线程。
