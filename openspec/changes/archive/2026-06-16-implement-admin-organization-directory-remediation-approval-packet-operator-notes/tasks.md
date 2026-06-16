## 1. OpenSpec 与方案门禁

- [x] 1.1 完成 proposal、design、delta spec、tasks，并通过 target strict validate。
- [x] 1.2 完成实施前 review，确认 owner 边界、脱敏、fail-closed、非持久化 noteScope、前后端落点无 Blocking/Fixable。

## 2. 后端只读交接备注

- [x] 2.1 先补 object/service tests，覆盖 ready、blocked、empty/missing packet、cannotInfer、Markdown/JSON redaction、noteScope 和 invalid filter fail-closed。
- [x] 2.2 实现 approval packet operator notes object/service，复用 approval packet audit 结果，生成稳定 note id/hash、handoff/risk/status/checklist summary、cannotInfer、operator next steps、JSON/Markdown export。
- [x] 2.3 新增 controller/router/authz/setting allowlist，保持 organization-scoped 授权与 operator-readable fail-closed 错误。
- [x] 2.4 补 controller/router focused tests，验证 endpoint、权限、参数、脱敏响应和不执行真实修复。

## 3. 前端交接备注视图

- [x] 3.1 先补 web-admin tests，覆盖交接备注入口、loading、empty、error、disabled、blocked、long text、copy/export JSON/Markdown。
- [x] 3.2 扩展 `PlatformApiMappingBackend` 和 `Setting` allowlist，增加只读 approval packet operator notes API wrapper。
- [x] 3.3 扩展组织目录质量页 approval packet audit panel，展示 derived note scope、manual-review-only、handoff/risk/status/checklist summary、cannotInfer、operator next steps、samples 和脱敏 JSON/Markdown 导出，且不提供执行/修复按钮。

## 4. 验证、归档和交付

- [x] 4.1 运行 target OpenSpec strict、`openspec validate --changes --strict`、`git diff --check`。
- [x] 4.2 运行相关 Go focused tests 与 changed-function coverage；若本机 Go 环境仍失败，记录基线复现证据。
- [x] 4.3 运行 web-admin focused Jest/build 或项目既有等价命令，记录结果。
- [x] 4.4 完成 pre-archive review 到无 Blocking/Fixable，archive 后运行 `openspec validate --specs --strict`。
- [x] 4.5 整理单 commit，push 工作分支，ff-only 合入并 push `origin/hfl-test-base`，删除本地/远端工作分支，写入并回传最终报告。
