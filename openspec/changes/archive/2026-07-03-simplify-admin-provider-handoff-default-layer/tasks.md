## 1. OpenSpec

- [x] 1.1 创建并验证 `simplify-admin-provider-handoff-default-layer` change。
- [x] 1.2 完成实施前 review，确认无后端契约或 owner 边界扩张。

## 2. 前端实现

- [x] 2.1 用测试先覆盖默认层低噪声：首屏展示状态、目标消费方、包类型、下一步和主 CTA，不默认展示 capability/evidence 明细、owner alias 或 wrapper route。
- [x] 2.2 用测试覆盖 `诊断详情` 默认收起、展开后可见必要技术细节。
- [x] 2.3 收敛 `ApplicationAccessServiceCredentialGovernancePanel` 默认布局和文案，保留 copy-safe package 生成/复制行为。
- [x] 2.4 同步 zh/en i18n 和必要样式，确保长文本、窄屏和按钮换行可控。

## 3. 验证与收口

- [x] 3.1 运行 `openspec validate simplify-admin-provider-handoff-default-layer --strict`。
- [x] 3.2 运行相关 Jest：`ApplicationUsageAccessPage.test.tsx`、`ApplicationAccessCenter.test.tsx`、`ManagementPage.navigation.test.tsx` 或等价受影响集合。
- [x] 3.3 运行 `node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`、`yarn typecheck`、`yarn build`。
- [x] 3.4 运行 `git diff --check`。
- [x] 3.5 做本地 mock-auth browser smoke：桌面与 390px 默认层/展开详情，确认 console error=0 且无页面级横向溢出。
- [x] 3.6 完成 pre-archive review、archive、final gate、单逻辑 commit、普通非强制 push `HEAD:hfl-test-base`，不 push/merge `test`。
