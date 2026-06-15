## 1. OpenSpec 与启动门禁

- [x] 1.1 创建 `implement-admin-feishu-organization-sync-user-binding-conflict-console` change，完成 proposal/design/spec delta/tasks。
- [x] 1.2 运行 target OpenSpec validate、全量 changes validate 和 `git diff --check`，完成实施前 review 并修复 Blocking/Fixable 问题。

## 2. 后端诊断 read model

- [x] 2.1 先补 object 层测试，覆盖 duplicate user_id、local user 多租户、legacy identifier split、missing tenant key、endpoint mode mismatch、empty/disabled 和脱敏输出。
- [x] 2.2 新增 Feishu user binding conflict DTO、service、store/query adapter 和 risk classification。
- [x] 2.3 关联最近 run/dry-run history/sourceConnectionIdHash，并保证只读、不修改 User/Group/Platform*/Gateway facts。
- [x] 2.4 补 changed-function coverage 证据，确保关键分类和脱敏 helper 达到 85% 以上。

## 3. API、鉴权与路由

- [x] 3.1 新增 `GET /api/feishu-org-sync/user-binding-conflicts` 只读 API。
- [x] 3.2 补 controller/router/authz tests，覆盖组织边界、limit/includeOk 参数、disabled 状态和安全响应。
- [x] 3.3 确认 API 响应不包含手机号、邮箱、真实姓名、raw Feishu response、token、Cookie、私有 URL、`open_id`、`union_id`、`user_id` 明细。

## 4. 前端诊断 Console

- [x] 4.1 扩展 `FeishuOrganizationSyncBackend`，增加 user binding conflict diagnostics API 调用及测试。
- [x] 4.2 在飞书组织同步页面新增绑定冲突/身份匹配诊断区域、刷新按钮、risk table 和详情 Drawer。
- [x] 4.3 支持复制/导出脱敏 JSON，并覆盖 loading/empty/error/disabled/long text 状态。

## 5. 验证、归档与交付

- [x] 5.1 运行相关 Go tests、前端 Jest/build 或项目既有等价命令，并记录 changed-function/touched production coverage 证据。
- [x] 5.2 更新 `verification.md`，记录命令、结果、覆盖率口径、未触发真实飞书租户同步和剩余风险。
- [x] 5.3 完成 pre-archive review，修复 Blocking/Fixable 问题。
- [x] 5.4 archive change，运行 archive 前后 OpenSpec strict validate、`git diff --check`、相关测试。
- [ ] 5.5 整理为单 change commit，显式 push 工作分支；验证通过且无 blocker 时 ff-only 合入并 push `origin/hfl-test-base`，禁止 push `test`。
- [ ] 5.6 写完整回传报告并短回传协调线程。
