## 1. 后端诊断修复

- [x] 1.1 为 Feishu/Lark binding diagnostics 增加本地用户身份 cluster 判定，避免同步映射和扫码登录属性因 tenant alias 不同产生误判。
- [x] 1.2 补充单测覆盖同一 `user_id/open_id/union_id/lark` 跨 mapping/User 属性来源时不报 `local_user_multi_tenant`。

## 2. 前端展示降噪

- [x] 2.1 将 dry-run history 默认收起，保留摘要、刷新、展开后的表格和详情 Drawer。
- [x] 2.2 将 handoff evidence / acceptance checklist 默认展示改为 operator 决策摘要，内部 alias/hash/checklist 明细仅在展开区显示。
- [x] 2.3 更新 FeishuOrganizationSyncPage 聚焦测试，覆盖 dry-run history 默认收起、验收资料默认不暴露内部 alias、展开后仍可查看安全别名。

## 3. 验证与收尾

- [x] 3.1 运行 `openspec validate fix-admin-feishu-organization-sync-diagnostics-ux --strict` 和 `openspec validate --changes --strict`。
- [x] 3.2 运行 `git diff --check`、Go object focused tests、web-admin incremental TypeScript gate、FeishuOrganizationSyncPage Jest；按需要运行 `yarn typecheck` / `yarn build`。
- [x] 3.3 完成归档前自检；archive、提交、推送工作分支和 ff-only 合入作为交付动作继续执行，且不 push/merge `test`。
