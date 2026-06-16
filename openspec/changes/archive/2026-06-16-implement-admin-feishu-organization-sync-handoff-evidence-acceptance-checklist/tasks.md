## 1. OpenSpec 与设计门禁

- [x] 1.1 创建 proposal/design/tasks/spec delta，明确只读、脱敏、manual-review-only 和非 provider truth 边界。
- [x] 1.2 完成实施前 review，确认不触碰 OIDC/auth center shell、WeCom login config、cleanup approval、organization remediation notes 写集。
- [x] 1.3 运行 `openspec validate implement-admin-feishu-organization-sync-handoff-evidence-acceptance-checklist --strict`。

## 2. 后端与 API

- [x] 2.1 为 Feishu handoff evidence 增加 `acceptanceChecklist` 数据结构、状态/严重级别/source/action/noFallback alias。
- [x] 2.2 从现有 evidence、本地 run/dry-run/binding/redaction/retention 元数据构建 checklist，覆盖 ready/blocked/no-run/unsupported/provider-missing/cannotInfer/noFallback。
- [x] 2.3 保持现有 `GET /api/feishu-org-sync/handoff-evidence` 只读响应，不新增真实 Feishu/Lark 调用、不触发同步、不写主数据。
- [x] 2.4 补 object/controller focused tests，断言脱敏、provider-owned missing、manual-review-only、cannotInfer/noFallback、error 状态。

## 3. 前端控制台

- [x] 3.1 在 Feishu organization sync 页面新增 acceptance checklist 区域，展示 summary、row status、provider missing、manual actions、cannotInfer/noFallback、redaction/retention。
- [x] 3.2 增加 sanitized checklist JSON/Markdown copy/export 操作，复用现有紧凑后台 UI 风格。
- [x] 3.3 覆盖 loading/empty/error/provider missing/cannotInfer/noFallback/copy/export 状态的 Jest 测试。

## 4. 验证与归档

- [x] 4.1 运行 OpenSpec target validate、`openspec validate --changes --strict`、`openspec validate --specs --strict`。
- [x] 4.2 运行 `git diff --check`、相关 Go focused tests、相关 web-admin Jest/build，并记录 changed-function/changed-file coverage。
- [x] 4.3 完成 pre-archive review，修复阻塞项，archive change 并验证主 specs。
- [x] 4.4 整理单 change commit，push 工作分支，ff-only 合入并 push `origin/hfl-test-base`，删除本地/远端工作分支，确认未 push `test`。
- [x] 4.5 写入脱敏报告并短回传主控线程。
