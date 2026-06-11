# Tasks

- [x] 1.1 确认当前分支基于 `test` 且工作区干净。
- [x] 1.2 创建 `hfl-test/stabilize-admin-gateway-projection-publishable-subject-fixture-readiness` 工作分支。
- [x] 2.1 编写 proposal/design/spec delta，限定 admin owner 范围。
- [x] 2.2 明确 active/tombstone publishable subject 前置条件。
- [x] 2.3 记录旧 `ExternalIdentity.Lineage` 和 `User.Properties` 只可作为迁移候选，不是 runtime publish 来源。
- [x] 3.1 补充 Bruno/readme 可选断言和 60 operator checklist。
- [x] 3.2 复核现有 builder 聚焦测试是否覆盖 `mapping_missing`、active publishable、tombstone publishable；如不足则补测试。
- [x] 4.1 运行 `openspec validate stabilize-admin-gateway-projection-publishable-subject-fixture-readiness --strict`。
- [x] 4.2 运行 `openspec validate --changes --strict`。
- [x] 4.3 运行 `openspec validate --specs --strict`。
- [x] 4.4 运行 `git diff --check`。
- [x] 4.5 如修改 Go 代码，运行受影响 package 聚焦测试和覆盖率；如未修改 Go 代码，在 verification 记录覆盖率 N/A。
- [x] 5.1 更新 `verification.md`，记录验证命令、未执行 60 写入原因和剩余风险。
