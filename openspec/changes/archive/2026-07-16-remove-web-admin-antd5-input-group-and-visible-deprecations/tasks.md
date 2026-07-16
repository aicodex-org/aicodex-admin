## 1. 基线与实施前门禁

- [x] 1.1 记录 latest base、active changes、4 处 `Input.Group`、7 个目标调用点、3 个 wrapper `visible` prop、11 处 `destroyOnClose`、直接测试与 CI/discovery 基线。
- [x] 1.2 完成 proposal/design/delta spec/tasks 的 strict validation 与 pre-implementation review，确认 Provider/Syncer/TLS/依赖边界无冲突。

## 2. TDD 与最小实现

- [x] 2.1 为四组输入组合补直接行为测试，覆盖 `Space.Compact` 语义、占宽、控件顺序、输入回调和表单规则，并在旧实现上确认预期 RED。
- [x] 2.2 为验证码与人脸识别 wrapper/callers 补直接测试，覆盖 `open` prop、关闭/重开、异步 loading/token 与媒体 cleanup，并在旧 `visible` 链上确认预期 RED。
- [x] 2.3 将四处 `Input.Group` 等价迁移到 `Space.Compact`，保留原布局、宽度、键盘与响应式语义。
- [x] 2.4 将三个 modal wrapper 与七个调用点端到端迁移为 `open`，删除 UserEdit 目标 warning 过滤，不修改普通业务 `visible` 字段。

## 3. 聚焦验证

- [x] 3.1 运行 Login/Signup/UserEdit/SMS/captcha/face 聚焦 Jest，确认表单输入组合、modal 开关、关闭/重开与异步状态稳定。
- [x] 3.2 运行 changed production coverage 并达到 85%，不得通过排除目标文件、弱断言或低价值 mock 制造达标。
- [x] 3.3 精确搜索证明生产目标 `Input.Group=0`、目标 wrapper/caller `visible=0`；确认 `destroyOnClose=11` 保持不变且未出现 `destroyOnHidden`、类型断言或 suppression。

## 4. 完整质量与浏览器门禁

- [x] 4.1 运行 `yarn test:ci`，确认至少 145 suites / 1371 tests、0 failure，并记录目标 deprecated warning 审计。
- [x] 4.2 运行 app/build-tooling/E2E typecheck、增量 TypeScript gate、production lint、public scripts check/build/smoke 与 Vite production build。
- [x] 4.3 运行 Playwright discovery，确认 19 files / 22 tests。
- [x] 4.4 使用本地前端与脱敏 fixture 完成登录/注册/UserEdit/captcha/face modal 的桌面与窄屏浏览器 smoke；确认键盘路径、page error 和非预期 console error 为 0。
- [x] 4.5 完成 target/all changes/all specs strict、`git diff --check`、中文/TBD/脱敏/EOF 与最终写集检查，更新 `verification.md`。

## 5. Review 与 self-closeout

- [x] 5.1 完成 pre-archive review 循环并取得 READY，确认实现、测试、coverage、浏览器证据、技术债 defer 与主规格同步无阻断项。
- [x] 5.2 fetch/rebase latest `origin/hfl-test-base`，必要时重跑受影响门禁，收敛为 latest base + 1 logical commit。
- [x] 5.3 archive change、同步并复查主规格，重跑 archive 后 OpenSpec/diff/聚焦 final gate。
- [ ] 5.4 普通非强制推送最终 HEAD 到 `hfl-test-base`，不 push/merge `test`；删除工作分支并恢复固定 workspace 为 clean/aligned base。
- [ ] 5.5 清理 build/report/browser/planning/process 残留，释放 resource locks，并回传 `lifecycle_state=RELEASED`、`push_test=false`、`lease_release=true`。
