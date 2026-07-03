## 1. OpenSpec

- [x] 1.1 创建 `refine-admin-handoff-status-and-diagnostics` change，并验证 proposal/design/spec/tasks 闭环。
- [x] 1.2 完成实施前 review，确认只改 Admin UI/测试/i18n，不扩大后端契约或 secure handoff 边界。

## 2. 前端实现

- [x] 2.1 用测试覆盖 partial 状态下不再同时出现黄色阻断和绿色 `材料已齐`，并保留 `生成 Admin 交接包` 主动作。
- [x] 2.2 用测试覆盖默认层区分 `交接材料元数据可生成` 与 `Profile 凭据闭环` 缺凭据引用。
- [x] 2.3 将诊断入口改为 `诊断摘要` 行加查看/收起动作，并实现 `阻断项`、`可用能力`、`技术证据` 三组详情。
- [x] 2.4 同步 zh/en i18n，确保默认层和诊断详情没有敏感值、raw alias 或旧入口回退。

## 3. 验证与收口

- [x] 3.1 运行 `openspec validate refine-admin-handoff-status-and-diagnostics --strict`。
- [x] 3.2 运行相关 Jest：`ApplicationUsageAccessPage.test.tsx`、`ApplicationAccessCenter.test.tsx`、`ManagementPage.navigation.test.tsx` 或等价受影响集合。
- [x] 3.3 运行 `node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`、`yarn typecheck`、`yarn build`。
- [x] 3.4 运行 `git diff --check`。
- [x] 3.5 做本地 mock-auth browser smoke：1440 和 390px 默认层/展开详情，确认 console error=0 且无页面级横向溢出。
- [x] 3.6 完成 pre-archive review，确认可进入 archive；archive、final gate、单逻辑 commit、普通非强制 push `HEAD:hfl-test-base` 按 closeout 流程执行，不 push/merge `test`。
