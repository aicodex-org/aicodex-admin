## 1. OpenSpec 与方案门禁

- [x] 1.1 完成 proposal、design、delta spec、tasks，并通过 target strict validate。
- [x] 1.2 完成实施前 review，确认 readiness-only、脱敏、fail-closed、非持久化和 owner 边界无 Blocking/Fixable。

## 2. 后端持久化准入 readiness

- [x] 2.1 先补 object/service tests，覆盖 ready-for-design-review、blocked/missing note、ready filter empty、invalid filter、idempotency key、checklist 和 export redaction。
- [x] 2.2 实现 operator note persistence readiness object/service，复用 operator notes metadata，生成稳定 readiness id/hash、权限/幂等/保留期/审计/脱敏/manual review/cannotInfer 清单、blocked reasons、safe/export summary。
- [x] 2.3 新增 controller/router/authz/Setting allowlist，保持 organization-scoped 授权与 operator-readable fail-closed 错误。
- [x] 2.4 补 controller/router focused tests，验证 endpoint、权限、参数、脱敏响应和不执行真实修复。

## 3. 前端持久化准入视图

- [x] 3.1 先补 web-admin tests，覆盖持久化准入入口、loading、empty、error、disabled、blocked、long text、copy/export JSON。
- [x] 3.2 扩展 `PlatformApiMappingBackend` 和 `Setting` allowlist，增加只读 persistence readiness API wrapper。
- [x] 3.3 扩展组织目录质量页交接备注区域，展示 `storageScope=readiness_only`、`persistenceAllowed=false`、`storeDecisionRequired=true`、idempotency key、权限/保留期/审计/manual review/cannotInfer 清单、blocked reasons 和脱敏 JSON 导出。

## 4. 验证、归档和交付

- [x] 4.1 运行 target OpenSpec strict、`openspec validate --changes --strict`、`git diff --check`。
- [x] 4.2 运行相关 Go focused tests 与 changed-function coverage；若本机 Go heavy package runner 失败，记录证据。
- [x] 4.3 运行 web-admin focused Jest/build 或项目既有等价命令，记录结果。
- [x] 4.4 完成 pre-archive review 到无 Blocking/Fixable，archive 后运行 `openspec validate --specs --strict`。
- [x] 4.5 整理单 commit，push 工作分支，ff-only 合入并 push `origin/hfl-test-base`，删除本地/远端工作分支，写入并回传最终报告。
