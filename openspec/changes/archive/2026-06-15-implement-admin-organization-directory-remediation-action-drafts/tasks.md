## 1. OpenSpec

- [x] 1.1 创建 proposal、design、tasks、delta spec 和 verification 记录。
- [x] 1.2 完成实施前 review，修复 Blocking/Fixable 问题。
- [x] 1.3 通过 `openspec validate implement-admin-organization-directory-remediation-action-drafts --strict` 和 `git diff --check` 后再改生产代码。

## 2. 后端

- [x] 2.1 新增 remediation action draft query/result DTO 和只读 service。
- [x] 2.2 实现 actionAlias/reasonCode 到 draft、preconditions、operatorSteps、manual_review_only 和脱敏样例的生成逻辑。
- [x] 2.3 新增 controller 和 router：`GET /api/organization-master-data-quality/remediation-action-drafts`。
- [x] 2.4 补充 Go 聚焦测试，覆盖分类、过滤、ready 空态、无 organization、非法参数、store error、脱敏响应和 authz organization scope。

## 3. 前端

- [x] 3.1 新增 backend wrapper 和 Setting API path allowlist。
- [x] 3.2 在组织目录质量页 remediation plan 面板增加 action draft 入口和只读 Drawer。
- [x] 3.3 支持复制/导出脱敏 draft JSON，不提供真实修复执行入口。
- [x] 3.4 补充前端 backend/page/Setting 测试。

## 4. 验证与归档

- [x] 4.1 运行 OpenSpec strict、Go focused tests/coverage、前端相关测试/build、`git diff --check`。
- [x] 4.2 更新 `verification.md`，记录命令、结果、覆盖率和剩余风险。
- [x] 4.3 完成 pre-archive review 并修复阻断问题。
- [x] 4.4 archive change，验证主 specs。
- [ ] 4.5 整理为相对最新 `origin/hfl-test-base` 的单 commit，push 工作分支并 ff-only 更新 `hfl-test-base`，不触碰 `test`。
