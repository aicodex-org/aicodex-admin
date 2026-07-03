## 1. OpenSpec

- [x] 1.1 创建并验证 `align-admin-copy-safe-package-with-insight-profile` change，固定 Admin copy-safe package 与 Insight Profile 草稿字段边界。
- [x] 1.2 归档前补充 `verification.md`，记录验证命令、覆盖率、脱敏检查和剩余风险。

## 2. Package 生成

- [x] 2.1 扩展 `ServiceCredentialGovernanceHandoffPackage` 类型和 builder，新增 Profile 可消费的 copy-safe `insightProfile` 摘要。
- [x] 2.2 在 `insightProfile` 中输出三条固定 wrapper capability、resolver/Gateway projection 凭据引用状态、bounded policy、reason aliases、nextAction、keepInEnv/cannotInfer 字段。
- [x] 2.3 页面生成包时传入已脱敏 config 和 normalized status，保持复制 JSON 语义为 copy-safe metadata + manual/secretRef binding 指引。

## 3. 测试与脱敏

- [x] 3.1 补 builder 单测，覆盖 ready、partial/missing、not_applicable、Profile 摘要字段和敏感材料脱敏。
- [x] 3.2 补页面测试，覆盖生成动作传入 config、复制包包含 Profile 摘要且不暴露 token/secret/private URL/raw id。
- [x] 3.3 运行 OpenSpec、聚焦 Jest、增量 TypeScript gate、typecheck、build、coverage 和 `git diff --check`。

## 4. 收口

- [x] 4.1 完成 pre-archive review，修复阻断问题后 archive change。
- [x] 4.2 self-closeout：收敛为一个最终逻辑 commit，普通非强制 push `HEAD:hfl-test-base`，删除工作分支并短回传主控。
