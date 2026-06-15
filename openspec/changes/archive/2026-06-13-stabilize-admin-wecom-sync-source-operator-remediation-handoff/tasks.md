# Tasks

- [x] 1. 创建并 review WeCom source operator remediation handoff OpenSpec artifacts。
- [x] 2. 先补 focused failing `node:test` 覆盖 blocked、needs-user-action、hard-red-line、ready 和敏感值不回显。
- [x] 3. 实现本地只读 remediation wrapper，复用现有 helper 的稳定 alias、脱敏和 fail-closed 模式。
- [x] 4. 增加 Bruno local-only 入口并更新 WeCom 同步 README/operator guidance。
- [x] 5. 更新 `wecom-organization-sync` 主规格 requirement 并完成 archive。
- [x] 6. 运行验证：focused `node --test`、相关 WeCom source helper tests、changed helper coverage、`openspec validate --specs --strict`、`openspec validate --changes --strict`、`git diff --check`。
- [x] 7. 整理为单 change commit，并按 prompt 边界推送到 `hfl-test-base`。
