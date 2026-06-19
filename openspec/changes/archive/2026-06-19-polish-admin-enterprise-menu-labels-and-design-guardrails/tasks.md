## 1. 导航测试门禁

- [x] 1.1 在运行时导航测试中增加一级菜单命名规则断言，覆盖四字中文、专有技术词 allowlist 和抽象主入口禁用词。
- [x] 1.2 在组织导航配置树测试中复用同一规则断言，确保配置树和侧栏一致。
- [x] 1.3 运行聚焦导航测试，确认新增规则在当前菜单命名下先失败。

## 2. 菜单命名与规则固化

- [x] 2.1 更新企业认证中心一级菜单 `zh` locale，并核对 `en` locale 既有语义仍与新中文分组一致。
- [x] 2.2 更新导航测试预期和必要的配置树查找标签，保持路由 key、权限过滤和 selection 兼容。
- [x] 2.3 在根 `AGENTS.md` 和 `web-admin/AGENTS.md` 增加 Admin 前端一级菜单命名规则。

## 3. 验证与交付记录

- [x] 3.1 运行 OpenSpec strict、diff check、TS gate、typecheck、聚焦 Jest/coverage、build 和浏览器抽样验证；记录 coverage 口径和 browser tooling 状态。
- [x] 3.2 更新 `verification.md`、worker report、路线台账和 `threads.md`，说明未 archive、未 push/merge `hfl-test-base`、未触碰 `test`。
- [x] 3.3 整理为 1 个逻辑 commit 并回传 release candidate。
