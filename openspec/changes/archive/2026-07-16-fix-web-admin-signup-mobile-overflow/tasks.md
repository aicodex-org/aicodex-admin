## 1. 基线与实施前门禁

- [x] 1.1 在未修复 production preview 中复现 desktop/mobile UA 的 320/360/390px overflow，记录 panel、Form、logo、模式组和 compact 的 box model owner。
- [x] 1.2 对 proposal、design、tasks 和 delta spec 完成实施前 review 循环，并通过 OpenSpec strict 与 `git diff --check`。

## 2. TDD 回归契约

- [x] 2.1 在 `SignupPage.test.tsx` 新增 Signup scoped 壳、流式 Form/logo/模式组和操作换行契约，运行旧实现并保留预期 RED。
- [x] 2.2 保持现有 Phone `Space.Compact` 顺序与 35%/65% 比例，并补 Email/Phone 切换和窄屏业务语义断言。

## 3. 最小响应式修复

- [x] 3.1 为 Signup 页面增加 scoped class 与直接拥有的局部 Less，使 panel 保持 460px 桌面上限并在窄屏受 viewport 约束。
- [x] 3.2 让 logo、Form、Email/Phone 模式组和提交/登录操作在可用内容宽度内收缩或换行，保持桌面尺寸、字段规则、验证码与跳转语义。
- [x] 3.3 运行聚焦 Signup Jest 取得 GREEN，并检查 diff 未触碰共享认证 CSS、API、依赖或并行写集。

## 4. 自动化与浏览器验证

- [x] 4.1 运行 Signup changed executable coverage，确认 statements/lines 达到 85%，且测试验证真实布局/交互契约。
- [x] 4.2 运行全量 Jest、三类 typecheck、增量 TS gate、production lint、public scripts check/build/smoke、Vite build 和 Playwright discovery 19 files/22 tests。
- [x] 4.3 使用脱敏 production preview 在 desktop/mobile UA 的 320/360/390px 与 1440px 验证 Email/Phone、长标签、校验错误、提交/登录链接、Tab/Shift+Tab、`scrollWidth` 与 console/page/request errors。
- [x] 4.4 按 `aicodex-admin-ui-review` 检查截图/DOM、触控目标、可见焦点、长文案和证据层级，并清理 build、截图、report、test-results 与浏览器进程。

## 5. 文档、归档与 Closeout

- [x] 5.1 最小更新 `docs/admin-technical-debt-baseline-2026-07-14.md`，并在中文 `verification.md` 记录 RED/GREEN、覆盖率、自动化、浏览器证据、脱敏边界与剩余风险。
- [x] 5.2 完成 pre-archive review 循环并取得 READY，运行 OpenSpec target/changes/specs strict 与 `git diff --check`。
- [x] 5.3 以 `archive_mode=sync-specs` 归档 change，复查 archive 副本和主规格语言/语义一致。
- [x] 5.4 收敛为最新 `origin/hfl-test-base` + 1 logical commit，普通非强制 push `HEAD:hfl-test-base`，核验 `origin/test` 未变。
- [x] 5.5 切回 clean/aligned `hfl-test-base`，删除本地/远端工作分支和 planning/浏览器/构建残留，回传 `RELEASED` 并释放 resource locks/lease。
