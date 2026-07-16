## 1. 基线与实施前门禁

- [x] 1.1 记录 latest base、active change、144-suite/1369-test discovery、29 个 warning filter、依赖/peer/lock owner 与升级前 warning 计数。
- [x] 1.2 对 proposal、design、delta specs 与 tasks 完成 strict validation 和 implementation-ready review，确认 Provider/Syncer 并行写集保持只读。

## 2. TDD 与依赖升级

- [x] 2.1 新增 React 18 Testing Library 兼容性行为测试，覆盖默认 `createRoot`、`cleanup` 卸载及同步/异步 `act`，并在旧 RTL 上确认预期 RED。
- [x] 2.2 将 `@testing-library/react` 升级到 `^16.3.2`、显式增加 `@testing-library/dom ^10.4.1`，使用 Yarn 1 生成最小 lockfile 差异。
- [x] 2.3 运行 frozen install、`yarn why` 与 peer/lock 审计，确认未升级 React、ReactDOM、Jest、TypeScript、Vite、Playwright、jest-dom、user-event 或业务运行时依赖。
- [x] 2.4 运行 createRoot/cleanup/act 兼容 suite 与代表性 class/function 组件测试，确认 GREEN 且没有 legacy root warning。

## 3. 局部过滤清理与回归

- [x] 3.1 精确删除 29 个目标测试文件中的 `ReactDOM.render` warning 分支，保留其它错误转发、独立 warning 与断言语义。
- [x] 3.2 扫描并证明 Jest setup/config/目标测试中不存在 legacy root suppression、skip/only、全局 console ignore 或被删除的旧 discovery 路径。
- [x] 3.3 运行 29 文件聚焦回归和非 silent warning 审计，确认 legacy warning 为 0，记录其它 warning 前后计数且不新增隐藏逻辑。

## 4. 完整质量门禁

- [x] 4.1 运行 `yarn test:ci`，确认至少 144 suites / 1369 tests、0 failure，并对照升级前 discovery path hash。
- [x] 4.2 运行 app/build-tooling/E2E typecheck、增量 TypeScript gate、production lint、public scripts check/build/smoke 与 Vite build。
- [x] 4.3 运行 Playwright discovery，确认 19 files / 22 tests；审计 package/lock diff、依赖 owner、构建产物与临时进程残留。
- [x] 4.4 将 coverage 标记为 production implementation N/A，并以兼容 suite、聚焦/全量 Jest、静态与构建门禁作为 test-only/tooling 行为证据。
- [x] 4.5 完成 target/all changes/all specs strict、`git diff --check`、中文/TBD/脱敏/EOF 检查并更新 `verification.md`。

## 5. Review 与 self-closeout

- [x] 5.1 完成 pre-archive review 循环并取得 READY，确认注释、证据层级、主规格同步和并行 owner 边界无阻断项。
- [x] 5.2 fetch/rebase latest `origin/hfl-test-base`；若触及本 change 源码/依赖语义则重跑受影响门禁，最终收敛为 base + 1 logical commit。
- [x] 5.3 archive change、同步并复查主规格与 archive 文档，重跑 archive 后 OpenSpec/diff/聚焦 final gate。
- [x] 5.4 普通非强制推送最终 HEAD 到 `hfl-test-base`，不 push/merge `test`；删除本地/远端工作分支并将固定 workspace 恢复为 clean/aligned base。
- [x] 5.5 清理 coverage/build/report/cache/process残留，释放 resource locks，并按 controller envelope 回传 `lifecycle_state=RELEASED`、`push_test=false`、`lease_release=true`。
