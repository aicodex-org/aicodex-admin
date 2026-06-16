## 1. OpenSpec

- [x] 创建 proposal/design/tasks/spec delta/verification，范围限定为 Admin-owned cleanup approval decision draft/readiness。
- [x] 完成 `openspec-pre-implementation-review` loop，无 Blocking/Fixable 后再写生产代码。

## 2. 后端只读 decision draft/readiness

- [x] 在 publish attempt history service 中新增 decision draft/readiness DTO、query、派生逻辑和脱敏 export。
- [x] 复用 cleanup approval policy readiness、execute readiness、audit trail；不新增真实 cleanup gate、不执行 delete/update、不写 Gateway facts。
- [x] 新增 admin-only controller/router/authz GET 入口。

## 3. Web Admin

- [x] 在 `PlatformApiMappingBackend` 增加 decision draft readiness GET 方法。
- [x] 在 `PlatformApiMappingPage` cleanup approval 区域增加 decision draft 面板，覆盖 loading、empty、error、disabled 和长文本。
- [x] 支持复制/导出脱敏 decision draft JSON，并说明其不是真实 approval decision 或 runtime authorization success。

## 4. Tests

- [x] 后端 service 测试覆盖 `draft_ready`、`manual_review_required`、`blocked`、`cannot_infer`、脱敏和 publish attempt 不变性。
- [x] controller/router/authz 聚焦测试覆盖新增 endpoint。
- [x] 前端 backend/page 测试覆盖请求参数、面板展示和复制/导出。

## 5. Verification and Archive

- [x] 运行 `openspec validate implement-admin-gateway-projection-cleanup-approval-decision-draft-readiness --strict`。
- [x] 运行 `openspec validate --changes --strict`。
- [x] 运行 `openspec validate --specs --strict`。
- [x] 运行 `git diff --check` 和 staged 后 `git diff --cached --check`。
- [x] 运行相关 Go/frontend 聚焦测试、覆盖率和必要 build；如受历史本地依赖阻断，记录证据。
- [x] 更新 `verification.md`。
- [x] 完成 `openspec-pre-archive-review` loop，无 Blocking 后 archive。
- [x] 整理为单个 change commit，显式 push 工作分支；验证充分时 ff-only 合入并 push `origin/hfl-test-base`，禁止 push `test`。
