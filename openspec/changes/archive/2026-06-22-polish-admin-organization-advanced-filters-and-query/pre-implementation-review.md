## Review 结论

状态：implementation-ready。

## 检查项

- OpenSpec artifacts：`proposal.md`、`design.md`、`tasks.md`、delta spec 和 `verification.md` 均存在，目标一致，指向组织页高级筛选真实控件、AND 查询语义和共享 toolbar 空插槽行为。
- 范围：写集限制在组织页、共享查询 toolbar、样式、聚焦测试和本 change OpenSpec；不改后端 API、Admin 服务凭据治理、workspace tabs、OIDC/auth-center/wecom 历史 active changes、API/Gateway/Insight 或 `test`。
- 设计贴合代码：已确认 `get-organizations` 在 `p/pageSize` 为空时返回未分页组织列表；高级筛选可复用该既有路径获取当前组织 scope 候选集，再在前端按非空条件 AND 过滤并按过滤后结果分页。
- Spec 可验收：delta spec 覆盖真实高级筛选输入、多字段 AND、基础查询参与 AND、重置清空、空高级筛选不渲染展开按钮和不改变后端语义。
- 测试计划：按 TDD 先补共享 toolbar 和组织页 RED 测试，再做实现；后续运行聚焦 Jest、coverage、TS gate、typecheck、build、OpenSpec 和浏览器 mock smoke。
- 安全与隐私：不输出或提交 secrets、token、Cookie、完整私有 URL、raw payload、真实账号或真实组织树。

## 验证

- `openspec validate polish-admin-organization-advanced-filters-and-query --strict`：通过。
- `openspec validate --changes --strict`：4 个 active changes 通过，历史 unrelated changes 未阻塞。
- `git diff --check`：通过。

## 剩余实现注意事项

- 高级筛选 total 必须使用过滤后结果数量，不能沿用未分页候选或后端单字段 total。
- 高级筛选全为空时必须回到基础单字段路径。
- 共享 toolbar 的“更多筛选”按钮只能在有真实 `advancedFilters` 内容时渲染。
