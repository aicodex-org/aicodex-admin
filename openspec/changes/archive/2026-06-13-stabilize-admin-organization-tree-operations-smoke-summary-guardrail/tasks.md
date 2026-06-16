## 1. OpenSpec 与实施前门禁

- [x] 1.1 完成本 change proposal/design/spec/tasks，并运行 `openspec validate stabilize-admin-organization-tree-operations-smoke-summary-guardrail --strict`
- [x] 1.2 完成实施前 review，确认范围只覆盖 Admin 组织树运营只读 summary、Bruno 入口、README、测试和主规格同步

## 2. TDD 实现 summary 脚本

- [x] 2.1 先补 Node 失败用例，覆盖可信非空组织树返回 `ready`
- [x] 2.2 先补 Node 失败用例，覆盖 `empty_tree`、`non_empty_fixture_missing`、`read_model_untrusted`、`source_connection_stale`、`lineage_missing`、`refresh_status_unavailable` 和 `sanitization_failed`
- [x] 2.3 实现 `organizationTreeOperationsSmokeSummary.js`，输出 `ready` / `blocked` / `not_checked`、稳定 alias、counts、owner handoff、最小解除条件和不能外推边界
- [x] 2.4 新增 `40-组织树运营` Bruno 只读 summary 入口，默认调用诊断接口，可选读取私有变量中的刷新状态和组织树响应

## 3. 文档与规格同步

- [x] 3.1 更新 Bruno README，说明组织树 smoke summary 入口、稳定 alias、owner handoff、最小解除条件、dry-run 和不能外推边界
- [x] 3.2 更新 `openspec/specs/admin-organization-tree-operations/spec.md`，同步 summary guardrail 主规格
- [x] 3.3 补充 `verification.md`，记录验证命令、TDD RED/GREEN、覆盖率、剩余风险和脱敏边界

## 4. 验证、归档与合入

- [x] 4.1 运行 Node 单测、`node --check`、相关 OpenSpec strict validate、`git diff --check` 和受影响 JS summary 覆盖率检查
- [x] 4.2 完成归档前 review，确认文档语言、注释、脱敏、覆盖率和主规格同步无阻断问题
- [x] 4.3 确认主规格已手工同步，archive 将使用 `--skip-specs` 避免重复追加同一 requirement
- [x] 4.4 确认外层合入门禁：archive 后整理单个 change commit，ff-only 合入并推送 `hfl-test-base`，最后切回并清理本地工作分支
