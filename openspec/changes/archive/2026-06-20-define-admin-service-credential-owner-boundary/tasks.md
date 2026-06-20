## 1. 启动门禁与只读盘点

- [x] 1.1 确认固定 workspace、`hfl-test-base` 对齐状态和历史 active changes strict 可信。
- [x] 1.2 读取仓库、`web-admin` 和 `openspec` 本地规则，确认本 change 写集只限 OpenSpec 文档。
- [x] 1.3 只读盘点 Admin 当前配置 key、deploy 示例、OIDC/Application/Provider 相关 specs 和 Gateway projection/Insight provider 规格，只记录 key 名和 owner 分类。

## 2. OpenSpec artifacts

- [x] 2.1 创建 `proposal.md`、`design.md`、`tasks.md` 和 `admin-service-credential-owner-boundary` delta spec。
- [x] 2.2 明确身份应用/OIDC client、Admin provider trust 白名单、Admin outbound 服务间凭据、keep-in-env 配置和跨服务 truth owner 边界。
- [x] 2.3 完成实施前 review，确认 artifacts 闭环且不需要业务代码实现。

## 3. 验证与归档准备

- [x] 3.1 运行 `openspec validate define-admin-service-credential-owner-boundary --strict`。
- [x] 3.2 运行 `openspec validate --changes --strict` 和 `openspec validate --specs --strict`。
- [x] 3.3 运行 `git diff --check`，确认文档 diff 无空白错误。
- [x] 3.4 更新 `verification.md`，记录验证命令、覆盖率 N/A 原因、脱敏边界和剩余风险。
- [x] 3.5 完成归档前 review，确认 archive-ready。
