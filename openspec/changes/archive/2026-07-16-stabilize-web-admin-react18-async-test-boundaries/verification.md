## 验证范围

- 工作区：`aicodex-admin`，分支 `hfl-test/stabilize-web-admin-react18-async-test-boundaries`
- 起始基线：`origin/hfl-test-base@f955924d8204b967d1aa4f922fe7deb91fd3d0d9`
- 变更性质：仅 test source、test-only helper、OpenSpec 与技术债路线文档；没有 production source、依赖/lock、Jest 全局 config/setup、API、Go、schema 或 workflow 改动
- 原始 non-silent 日志只保存在 ignored planning 目录，本文只记录脱敏计数、owner 和结论

## 基线与 warning 分类

- `yarn install --frozen-lockfile`：通过，`package.json` 与 `yarn.lock` 的 SHA-256 前后不变。
- 固定 `BABEL_ENV=test`、`NODE_ENV=test`、空 `PUBLIC_URL`、`CI=true`，执行 non-silent `jest --watchAll=false --runInBand`：变更前为 153/153 suites、1450/1450 tests、0 failure。
- 变更前共有 376 条 `Warning:` 行：326 条 React act、47 条 AntD、3 条其它 React/runtime；另有 1 组 FakeTimers/native timer 提示。
- 可见 act top owner 为 WeCom 组织同步 253、Provider 23、Role/Permission 16、GroupTree 8、DingTalk 7、Product 5、Plan/Pricing 4，其余 10 条分布在 Feishu、ApplicationEdit UI、Cert、Enforcer、Management、App。
- `ApplicationUsageAccessPage` 与 `UserEditPage` 另有 3 处按 act warning 文本直接返回的局部 suppression，变更前不计入可见 warning。

## TDD RED / GREEN

- Payment timer RED：新增“下一测试开始前 timer API 必须恢复为模块加载时 native 引用”的回归测试后，`global.clearTimeout` 身份断言失败并同时输出 native timer 提示。GREEN 将 teardown 顺序改为先 `restoreAllMocks()`、再 `useRealTimers()`；完整 Payment suite 为 10/10 tests，提示为 0。
- Suppression RED：静态契约在原始基线上精确命中 `ApplicationUsageAccessPage` 两处和 `UserEditPage` 一处文本返回。GREEN 删除 3 处 suppression；契约 + 两 owner 为 3 suites / 64 tests、0 failure，runtime act warning 为 0。
- WeCom RED：WeCom 与相邻 suite 组合稳定输出 253 条 act，局部 guard 将其收敛为 7 个失败测试。GREEN 将交互后既有 `setTimeout(0)` promise flush 放入有实际 timer 目标的 `act`，相邻 2 suites / 45 tests、act=0。
- DingTalk/Feishu RED：局部 guard 产生 5 个失败测试。GREEN 将 microtask flush 和 DingTalk polling timer 推进纳入 `act`，2 suites / 46 tests、act=0。
- 其余 owner RED：10-suite 组合为 15 个失败测试、63 条 act。GREEN 通过已有 promise helper 的定向 `act`、RTL `fireEvent`、router push `act`、App lazy shell `findBy` 和 Enforcer 子表 backend完成条件收口；10 suites / 183 tests、act=0。
- 全部治理 owner组合回归为 17 suites / 330 tests、0 failure、act=0、FakeTimers/native timer=0；随后新增的 suppression 正分支 helper 测试单独 3/3 通过。

## 最终 Jest 与 warning 对比

- 最终 non-silent 全量 Jest：154/154 suites、1454/1454 tests、0 failure，act=0、FakeTimers/native timer=0、`Warning:` 行数为 50。
- 最终 `yarn test:ci`：154/154 suites、1454/1454 tests、0 failure、0 timeout。
- Discovery 相对变更前增加 1 suite / 4 tests：3 个 test-only warning/suppression 契约和 1 个 Payment timer API 回归；没有删除、合并、skip 或 only 既有测试。
- 50 条保留 warning 均保持可见：AntD 47（InputNumber/Card/Typography/Descriptions/Table/Collapse/Spin）、unique-key 2、Provider 未挂载 class `setState` 1。这些需要 production/runtime owner，不通过 suppression 或扩大 mock 清除。

## Coverage

- Production changed implementation coverage：N/A。分支没有 production implementation 改动。
- Test-only helper coverage：`jest --coverage --coverageReporters=text --collectCoverageFrom=src/testUtils/reactAsyncWarnings.ts --runTestsByPath src/React18AsyncBoundaryContract.test.ts`，statements/branches/functions/lines 均为 100%。
- helper 测试验证 console call 分类不修改输入、允许诊断断言文本、只把目标文本附近直接 `return` 识别为 suppression。

## 静态、构建与 E2E 契约

- `yarn typecheck`、`yarn typecheck:build-tooling`、`yarn typecheck:e2e`：通过。
- `node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`：通过。
- `yarn lint`：通过；只保留既有 Browserslist 数据提示。
- `yarn public-scripts:check`、`yarn public-scripts:build`、`yarn public-scripts:smoke`：通过，smoke 输出 `public auth scripts smoke passed`。
- `yarn build`：通过；只保留既有 `fs` browser external、`Setting.tsx` direct eval 和大 chunk 提示。
- `yarn test:e2e:list`：19 files / 22 tests，Playwright discovery 契约不变。
- Browser smoke：N/A。变更仅涉及 Jest test source/test-only helper，不修改 production bundle、路由、UI 或浏览器行为；以完整 production build 和 Playwright discovery证明边界未变。

## OpenSpec 与卫生

- `openspec validate stabilize-web-admin-react18-async-test-boundaries --strict`、`openspec validate --changes --strict`、`openspec validate --specs --strict`：实施前和归档前均通过。
- `git diff --check`：实施前与归档前通过；已清除新 OpenSpec 文件的多余 EOF 空行。
- 静态 suppression 契约扫描所有 `src/**/*.test.ts(x)`；只允许契约自身的合成 warning 文本，不存在目标文本附近直接 `return`。
- 没有新增 `.skip` / `.only`、timeout 放宽、全局 warning/timer cleanup、legacy ReactDOM 或 package/lock diff。

## 归档后 final gate

- 已按 `sync-specs` 归档到 `openspec/changes/archive/2026-07-16-stabilize-web-admin-react18-async-test-boundaries`，active changes 为空。
- `openspec validate --changes --strict` 与 `openspec validate --specs --strict`：通过；主规格与 archive 副本没有 `Purpose TBD`、歧义性英文正文或敏感环境信息。
- `git diff --check`：通过；同步后的两个主规格 EOF 已复核。
- `git fetch origin --prune` 后 `origin/hfl-test-base` 仍为起始基线，当前分支保持 latest base + 1 logical commit，无需 rebase；`origin/test` 未变化。
- 归档仅改变 OpenSpec 文档，最终源码与 RC 长门禁相同，因此复用全量 Jest、typecheck、lint、public scripts、Vite build、coverage 与 Playwright discovery 证据；另以 non-silent `--runTestsByPath` 重跑全部 17 个治理 owner，结果为 17/17 suites、331/331 tests、act=0、FakeTimers/native timer=0。

## 剩余风险

- 50 条 AntD/React production/runtime warning 仍需各自生产 owner处理；本 change 保持它们可见，避免 test-only 写集越界。
- Guard 固定当前治理 owner；新测试文件仍需依靠 non-silent 全量审计和静态 suppression 契约发现新的异步债务。
- 本 change 没有浏览器或生产行为修改，因此未执行真实 E2E/共享环境 smoke；不能把 Jest、typecheck 和 build 证据表述为部署环境验收。
