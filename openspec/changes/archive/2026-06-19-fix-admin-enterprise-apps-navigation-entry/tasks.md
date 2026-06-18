## 1. OpenSpec

- [x] 1.1 新建本 change 的 proposal、design、tasks 和 delta spec，范围限定在导航语义修复
- [x] 1.2 通过 `openspec validate fix-admin-enterprise-apps-navigation-entry --strict`

## 2. 导航行为

- [x] 2.1 用聚焦 Jest 测试复现 local admin 导航中 `/apps` 被显示为应用列表的问题
- [x] 2.2 调整企业导航，使 local admin 运行时侧栏和配置树不再展示旧 `/apps` 入口
- [x] 2.3 保留非 local admin `/apps` fallback，并将可见文案改为“应用门户 / Application Portal”

## 3. 验证与交付

- [x] 3.1 运行导航聚焦测试和必要覆盖率检查，记录结果
- [x] 3.2 运行 `openspec validate --changes --strict`、`git diff --check`、增量 TypeScript 门禁、`yarn typecheck` 和 `yarn build`
- [x] 3.3 在可行时执行浏览器/Playwright 导航验证；不可行时记录 blocker 和替代验证
- [x] 3.4 更新 `verification.md` 和交付报告，形成 release candidate，不 archive、不合入共享分支
