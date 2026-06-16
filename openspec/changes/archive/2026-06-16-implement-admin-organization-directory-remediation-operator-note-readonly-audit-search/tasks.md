## 1. OpenSpec 与实施前门禁

- [x] 1.1 运行 `openspec validate implement-admin-organization-directory-remediation-operator-note-readonly-audit-search --strict` 和 `git diff --check`，完成实施前 review。

## 2. 后端只读搜索服务

- [x] 2.1 先补 `admin/object` focused tests，覆盖有结果、无结果、blocked/readiness-only、cannotInfer、历史检索需要持久 store、脱敏 export 和 invalid filters。
- [x] 2.2 实现 operator note readonly audit search service/DTO/filter validation，只组合既有 notes/readiness/audit 派生服务，不新增 store/schema。
- [x] 2.3 补 controller query parsing tests，覆盖 note/readiness/packet/preview/draft/action/risk/status/checklist/reason/history filters。
- [x] 2.4 增加 controller/router/authz 只读 API，并保持 organization-scoped fail-closed。

## 3. 前端检索入口

- [x] 3.1 先补 `PlatformApiMappingBackend` focused tests，覆盖只读搜索 API wrapper 的安全 query 参数。
- [x] 3.2 实现前端 backend wrapper 和 `Setting.js` allowlist 常量。
- [x] 3.3 先补 `OrganizationDirectoryQualityPage` focused tests，覆盖打开检索、筛选、空态/错误态、blocked/readiness-only、cannotInfer、复制/导出脱敏 JSON/Markdown、无执行/保存按钮。
- [x] 3.4 实现组织目录质量页“备注审计检索/交接备注检索”入口、状态、详情和导出交互。

## 4. 验证与归档准备

- [x] 4.1 运行后端 focused Go tests 与 affected package coverage，记录覆盖率证据。
- [x] 4.2 运行前端 focused Jest tests 与必要 build/coverage，记录 warning 或限制。
- [x] 4.3 运行 `openspec validate`、`openspec validate --changes --strict`、`openspec validate --specs --strict`、`git diff --check` / staged check，并写 `verification.md`。
- [x] 4.4 完成 pre-archive review、archive change、同步主规格并整理本 change 提交。
