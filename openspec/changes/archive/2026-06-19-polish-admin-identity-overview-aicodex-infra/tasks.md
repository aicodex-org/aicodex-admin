## 1. 范围与规格

- [x] 1.1 创建 OpenSpec proposal、design、tasks 和 `admin-enterprise-identity-console-shell` delta spec。
- [x] 1.2 完成 implementation-ready review，并运行 `openspec validate polish-admin-identity-overview-aicodex-infra --strict`、`git diff --check`、`openspec validate --changes --strict`。

## 2. TDD 与实现

- [x] 2.1 先写聚焦 RED 测试，覆盖 AICodex 四产品域、标题/面包屑、待核对状态、旧入口堆叠消失、内部实现术语不出现在总览。
- [x] 2.2 更新 `IdentityConsoleOverview` 首屏结构、只读状态模型和必要样式，优先复用 AntD 与现有身份控制台布局。
- [x] 2.3 更新企业导航首组命名和快捷操作降噪逻辑，保持稳定 route key 和非 local admin `/apps` 兼容 fallback。
- [x] 2.4 同步维护 `zh` / `en` locale 和导航/配置树测试。
- [x] 2.5 将确认稿图片和简短设计说明保留到仓库 `docs/design/admin-identity-console`。
- [x] 2.6 更新 `web-admin/AGENTS.md` 或现有前端规范，固化 Admin 身份控制台 UI 规则和渐进 TS 约束。

## 3. 验证

- [x] 3.1 运行聚焦 Jest/coverage，覆盖 `IdentityConsoleOverview` 与新增或修改的 TS/TSX 抽象，受影响实现代码覆盖率目标 85%。
- [x] 3.2 运行 `openspec validate polish-admin-identity-overview-aicodex-infra --strict`、`openspec validate --changes --strict`、`git diff --check`。
- [x] 3.3 运行 `cd web-admin; node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`、`yarn typecheck`、`yarn build`。
- [x] 3.4 使用本地 production build + Playwright 验证桌面 `/`，并通过导航或链接确认 `/applications`、`/providers`、`/records` 未被破坏。
- [x] 3.5 使用移动 UA `390x844` 验证 `/` 无页面级横向溢出、无超高顶部空白，console warning/error=0、pageerror=0。

## 4. 收口

- [x] 4.1 写入 `verification.md`，记录命令、覆盖率、浏览器证据、剩余风险并脱敏。
- [x] 4.2 完成归档前 review，archive OpenSpec change 并同步主规格。
- [x] 4.3 收敛为 `origin/hfl-test-base + 1 个本 change commit`，fetch/rebase 最新基线并重跑关键验证。
- [x] 4.4 普通非强制 push 到 `hfl-test-base`，不 push `test`。
- [x] 4.5 删除本地/远端工作分支，清理临时 worktree 或记录保留原因。
- [x] 4.6 写最终 report 和 processed 记录，向主控短回传。
