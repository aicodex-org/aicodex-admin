## 1. 基线与实施前门禁

- [x] 1.1 fetch/prune 并确认 clean/aligned `origin/hfl-test-base@f955924d`、active OpenSpec 为空、`origin/test` 只读和跨 workspace 进程不接管。
- [x] 1.2 运行 frozen Yarn 并证明 lock hash 不变；在固定环境执行 non-silent、`--runInBand` 全量 Jest，记录 153 suites / 1450 tests、warning 分类和 top owner。
- [x] 1.3 运行最大 act owner与 Payment/SystemTools/AntD modal 聚焦对照，确认跨 suite 异步泄漏特征及 FakeTimers/native timer 的 `PaymentPages` owner。
- [x] 1.4 完成 proposal、design、delta specs、tasks strict validation 和 pre-implementation review，取得 READY 后再修改测试。

## 2. 分域 TDD 治理

- [x] 2.1 对 `ApplicationUsageAccessPage`、`UserEditPage` 删除 act warning 文本 suppression；先用局部不静默 guard 建立 RED，再等待可观察交互/状态完成并取得 GREEN。
- [x] 2.2 对 WeCom、DingTalk、Feishu 组织同步测试建立 promise/timer/cleanup RED，使用捕获 request promise、`findBy`/`waitFor` 和有目标的 `act` 修复跨 suite 未完成更新。
- [x] 2.3 对 `PaymentPages` 建立 native timer RED，确保 fake timer 在目标 timer 创建前启用、在 `act` 中推进/清理并恢复 real timer，取得无提示 GREEN。
- [x] 2.4 对其余可见 act owner（Provider、Role、GroupTree、Product/Plan、ApplicationEdit UI、Cert、Enforcer、Management、App）逐一定位稳定完成条件并完成聚焦 RED/GREEN；若需要生产写集则停止对应路径并请求主控决策。
- [x] 2.5 增加最小 test-only 防回退契约，证明 guard 保留原始 console、只检测治理类别、恢复 spy，且没有全局/局部 suppression、skip/only、timeout 放宽、空 `act` 或扩大 mock。

## 3. warning 与回归验收

- [x] 3.1 运行全部治理 owner 的 non-silent 聚焦/相邻 suite 回归，确认目标 act warning 与 FakeTimers/native timer 提示为 0，保留有效业务断言。
- [x] 3.2 运行固定环境 non-silent 全量 Jest，确认完整 discovery、0 failure，并量化 React act、FakeTimers/native timer、AntD/runtime 与其它 warning 前后差异。
- [x] 3.3 运行 `yarn test:ci`，确认 suite/test discovery 不低于最新变更前基线且没有 failure/timeout。
- [x] 3.4 分类记录第三方/生产 owner 保留项，证明没有通过 suppression 或 mock 使非目标 warning 消失；不提交原始长日志。

## 4. 前端与 OpenSpec 完整门禁

- [x] 4.1 重跑 `yarn install --frozen-lockfile` 并证明 `package.json` / `yarn.lock` 未变化。
- [x] 4.2 运行 app/build-tooling/E2E typecheck、增量 TypeScript gate、production lint、public scripts check/build/smoke 与 Vite build。
- [x] 4.3 运行 Playwright discovery，确认保持 19 files / 22 tests；test-only production coverage 和 browser smoke 标记 N/A 并说明依据。
- [x] 4.4 运行 target/all changes/all specs strict、`git diff --check`、中文/TBD/脱敏/EOF、warning suppression 与残留扫描，完成 `verification.md`。

## 5. Review 与 self-closeout

- [x] 5.1 完成 pre-archive review 循环并取得 READY，确认 OpenSpec、测试语义、证据层级、注释和主规格同步无阻断项。
- [x] 5.2 archive change 并同步/复查主规格与 archive 副本，重跑 archive 后 OpenSpec/diff/聚焦 final gate。
- [x] 5.3 fetch/rebase latest `origin/hfl-test-base`，保持 latest base + 1 logical commit；若测试语义受上游影响则重跑对应长门禁。
- [x] 5.4 普通非强制 push 最终 HEAD 到 `hfl-test-base`，不 push/merge `test`；删除本地/远端工作分支并恢复 fixed workspace clean/aligned。
- [x] 5.5 清理 coverage/log/build/report/process/planning residue，释放 resource locks/lease，并按 controller envelope 回传 `lifecycle_state=RELEASED`。
