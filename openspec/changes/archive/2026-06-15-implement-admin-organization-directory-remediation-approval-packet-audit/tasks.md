## 1. OpenSpec 与方案门禁

- [x] 1.1 完成 proposal、design、delta spec、tasks，并通过 target strict validate。
- [x] 1.2 完成实施前 review，确认 owner 边界、脱敏、fail-closed、非持久化 storage scope、前后端落点无 Blocking/Fixable。

## 2. 后端只读审批包审计

- [x] 2.1 先补 object/service tests，覆盖 ready、blocked、empty/missing preview、risk/status summary、export redaction、storage scope 和 invalid filter fail-closed。
- [x] 2.2 实现 remediation approval packet audit object/service，复用 approval preview 结果，生成稳定 packet audit id/hash、event/status summary、checklist digest、export summary、storage scope 和 retention policy。
- [x] 2.3 新增 controller/router/authz/setting allowlist，保持 organization-scoped 授权与 operator-readable fail-closed 错误。
- [x] 2.4 补 controller/router focused tests，验证 endpoint、权限、参数、脱敏响应和不执行真实修复。

## 3. 前端审批包审计视图

- [x] 3.1 先补 web-admin tests，覆盖审批包审计入口、loading、empty、error、disabled、blocked、long text、copy/export JSON。
- [x] 3.2 扩展 `PlatformApiMappingBackend` 和 `Setting` allowlist，增加只读 approval packet audit API wrapper。
- [x] 3.3 扩展组织目录质量页 drawer/panel，展示 derived storage scope、manual-review-only、event/status summary、risk、required approvals、checklist digest、blocked reasons、samples 和脱敏 JSON 导出，且不提供执行/修复按钮。

## 4. 验证、归档和交付

- [x] 4.1 运行 target OpenSpec strict、`openspec validate --changes --strict`、`git diff --check`。
- [x] 4.2 运行相关 Go focused tests 与 changed-function coverage，记录覆盖率结果；本地 Go 编译 `object` 大包无 stderr/stdout 退出 1，已记录环境风险，前端 focused coverage 由 Jest/build 覆盖。
- [x] 4.3 运行 web-admin focused Jest/build 或项目既有等价命令，记录结果。
- [x] 4.4 完成 pre-archive review 到无 Blocking/Fixable，archive 后运行 `openspec validate --specs --strict`。
- [ ] 4.5 整理单 commit，push 工作分支，ff-only 合入并 push `origin/hfl-test-base`，删除本地/远端工作分支，写入并回传最终报告。
