## 1. 范围与规格

- [x] 1.1 创建仅收敛总览噪音的 OpenSpec `proposal`、`design`、`tasks` 和 spec delta。
- [x] 1.2 使用 `openspec validate polish-admin-enterprise-overview-noise --strict` 校验本 change。

## 2. TDD 与实现

- [x] 2.1 新增聚焦 RED 测试，证明总览把对象关系、接入预检和治理任务中心文案降级为状态/待办摘要，同时保留 deep link。
- [x] 2.2 最小修改 `IdentityConsoleOverview.js`，不触碰同步页或组织运营页。
- [x] 2.3 同步维护必要的 `zh` / `en` locale 文案。

## 3. 验证

- [x] 3.1 对 `IdentityConsoleOverview` 运行聚焦 Jest/coverage。
- [x] 3.2 运行 OpenSpec strict 校验、`git diff --check`、增量 TypeScript 门禁、`yarn typecheck` 和 `yarn build`。
- [x] 3.3 在可行时使用本地 production build 检查桌面和移动端 `/`，确认无 console error 且无页面级横向溢出。
- [x] 3.4 写入脱敏 worker report，并向主控短回传供 review。
