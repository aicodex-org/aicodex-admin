## 1. 启动门禁与只读盘点

- [x] 1.1 确认固定 workspace、`hfl-test-base` 对齐状态和历史 active changes strict 可信。
- [x] 1.2 从最新 `origin/hfl-test-base` 创建 `hfl-test/classify-admin-service-credential-runtime-config-migration`。
- [x] 1.3 读取仓库规则和任务 prompt，确认写集只限 OpenSpec 文档、归档主规格和最终报告。
- [x] 1.4 只读盘点 deploy example、runtime settings、OpenSpec 主规格和 UI/运维文档中的 key/pattern，只记录 key 名和 owner 分类。

## 2. OpenSpec artifacts

- [x] 2.1 创建 `proposal.md`、`design.md`、`tasks.md`、`verification.md` 和 `admin-service-credential-owner-boundary` delta spec。
- [x] 2.2 将 key/pattern 分类为 `keep in env/config`、`move to Admin UI`、`move to API UI`、`move to Insight UI`、`defer/blocked`。
- [x] 2.3 明确兼容/fallback、验证路径、风险和 active change 阻塞边界。
- [x] 2.4 完成实施前 review，确认不需要业务代码实现。

## 3. 验证与归档准备

- [x] 3.1 运行 `openspec validate classify-admin-service-credential-runtime-config-migration --strict`。
- [x] 3.2 运行 `openspec validate --changes --strict` 和 `openspec validate --specs --strict`。
- [x] 3.3 运行 `git diff --check` 和脱敏清单检查。
- [x] 3.4 更新 `verification.md`，记录验证命令、覆盖率 N/A 原因、脱敏边界和剩余风险。
- [x] 3.5 完成归档前 review，确认 archive-ready。
