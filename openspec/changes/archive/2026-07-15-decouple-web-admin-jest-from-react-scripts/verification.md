## 验证边界

- 本 change 只修改 `web-admin` 的 Jest/package/test 配置与测试契约，不修改生产组件、用户可见行为、API、认证协议、Vite runtime config、Go fixture/schema 或真实环境。
- 最终验证基线为 `origin/hfl-test-base` 提交 `7a5f478a1f1e8f71539e0ccfb11518d295886cf9`；已确认其 Go hermetic、MySQL compatibility、PostgreSQL integration、backend 与 linter workflow 段由本 change 原样保留。
- 未执行真实登录或浏览器业务 smoke。变更不触达 UI/runtime behavior；Vite production build、dynamic import 与 public scripts 已由自动化门禁覆盖，因此浏览器验证为 N/A。

## TDD 与配置契约

- RED：先扩展 `FrontendCiGates.test.ts`，旧 runner 下 1 suite / 7 tests 中 3 个预期失败，原因分别为旧 `react-scripts` scripts、缺失 `jest.config.cjs`、`react-scripts` 仍是 dependency；4 个既有 CI/Vite 断言继续通过。
- GREEN：显式 config/transform/mocks/scripts/dependencies 落地后，`FrontendCiGates.test.ts` 1 suite / 7 tests 通过。
- Transformer 修复：首次 GREEN 暴露 Jest 27 的 `babel-jest` CommonJS 导出位于 `.default`；验证真实 module exports 后单点修复，契约重新 GREEN。
- SVG mock RED→GREEN：行为断言确认 string `module.exports` 不能承载 `ReactComponent`；改为 `{__esModule, default, ReactComponent}` 后 7/7 通过。
- 开发 watch：PTY 执行 `yarn test --runTestsByPath src/FrontendCiGates.test.ts`，1 suite / 7 tests 通过并保持 watch 进程；输入 `q` 正常退出，exit 0。

## Discovery 对照

在同一最新 base 上对旧 React Scripts runner 与新显式 Jest config 的排序 repo-relative `--listTests` 路径集合计算 SHA-256：

| Runner | Suites | 路径集合 SHA-256 | 结果 |
| --- | ---: | --- | --- |
| 旧 `react-scripts test`（`fdd7cef0`） | 141 | `bc01b53977fc0bcd3f4031cef342bf7237b54809fe8427c00886e1e6a280ce81` | exit 0 |
| 新直接 `jest`（最终 `7a5f478a`） | 141 | `bc01b53977fc0bcd3f4031cef342bf7237b54809fe8427c00886e1e6a280ce81` | exit 0 |

- 两个集合完全相同；`fdd7cef0..7a5f478a` 只修改既有测试文件，没有新增/删除测试路径。最终 base 没有旧路径缺失，也没有新增 suite、`testPathIgnorePatterns`、`--passWithNoTests`、skip、删测或静默 omission。
- 141 个静态测试文件仍为 41 个 `.test.ts` 与 100 个 `.test.tsx`。

## Jest 回归

### 最新旧 runner 基线

- 命令：`yarn test:ci`（迁移前 React Scripts script）。
- 结果：141/141 suites、1329/1329 tests、0 snapshots，Jest `756.21s`、Yarn `761.28s`，exit 0。
- 运行前后 Git status 一致；保留既有 FakeTimers/native timer warning。

### 新显式 runner 高风险聚焦

- 覆盖 36 个 suites：全部 auth、Application、Management、Provider，以及 `FrontendCiGates`、App lazy import、runtime env、supported locales、style topology 和 4 个 fake-timer 入口。
- 结果：36/36 suites、359/359 tests、0 snapshots，Jest `275.618s`、Yarn `280.68s`，exit 0。
- CommonJS/ESM、dynamic import、jsdom globals、mocks、fake timers 与默认 timeout 均保持；Git status 前后相同。

### 新显式 runner 全量

- 命令：`yarn test:ci`。
- `fdd7cef0` 初次完整实现结果：141/141 suites、1331/1331 tests、0 snapshots，Jest `818.793s`、Yarn `823.02s`，exit 0。
- rebase 最终 `7a5f478a` 且包含 SVG mock 修复后的最终结果：141/141 suites、1335/1335 tests、0 snapshots，Jest `780.67s`、Yarn `784.90s`，exit 0。
- 相比旧 runner 的 1329 tests，2 tests 来自既有 `FrontendCiGates` suite 新增的显式 config/依赖契约，4 tests 来自 `fdd7cef0..7a5f478a` 上游 Management/Organization/User/workspaceTab 既有 suites；suite 路径集合没有变化。
- 运行前后 Git status 一致，既有 FakeTimers/native timer warning 仍出现且未被全局配置隐藏。

## 依赖与 lockfile

- `yarn install --frozen-lockfile`：`Already up-to-date`，exit 0。
- `yarn why` 确认 `jest 27.5.1`、`@jest/globals 27.5.1`、`babel-jest 27.5.1`、`babel-preset-react-app 10.0.1`、`jest-environment-jsdom 27.5.1`、`identity-obj-proxy 3.0.0`、`jest-watch-typeahead 1.1.0` 均由 `devDependencies` 直接拥有。
- `yarn why react-scripts` 输出 `We couldn't find a match!`；package 与 lock 搜索均无 `react-scripts`。
- `react-app-polyfill` 保持 production dependency，因为 `src/index.tsx` 仍直接使用；未升级 React、Router 或 Testing Library。

## 静态、public scripts 与构建门禁

- `yarn typecheck`：最终 base 复跑通过，`39.22s`。
- `yarn typecheck:build-tooling`：最终 base 复跑通过，`1.84s`。
- `node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`：通过。
- `yarn lint`：最终 base 复跑通过，`26.02s`；只有既有 Browserslist 数据提示。
- `yarn public-scripts:check`、`yarn public-scripts:build`、`yarn public-scripts:smoke`：全部通过，smoke 输出 `public auth scripts smoke passed`。
- `yarn build`：最终 base 上 Vite 8.1.4 通过，8349 modules transformed，build `7.80s`、完整 `13.58s`；运行前后 Git status 一致。
- build 保留 Vite archive 已记录的 browser-externalize、`Setting.tsx` direct eval 与大 chunk 告警；未出现 React Scripts 缺失、dynamic import、asset base 或 CommonJS 新错误。

## Workflow 与写集

- 使用 `js-yaml` 成功解析 `.github/workflows/build.yml`。
- frontend-checks 的 Jest step 仍为 `yarn test:ci` / `./web-admin`；`FrontendCiGates.test.ts` 7/7 通过。
- Go hermetic、MySQL compatibility、PostgreSQL integration jobs 与 backend `needs: [go-tests, go-tests-mysql-compatibility]` 均保留；workflow 文件相对 base 零 diff。
- 测试/public/build 前后 Git status 对照一致。已安全删除 ignored `web-admin/build`；没有 coverage、build、缓存、截图或 public 生成差异进入交付写集。

## Coverage

- Production implementation changed-file coverage：N/A。
- 判定依据：最终 diff 没有修改 `web-admin/src` production implementation、Vite config 或 public runtime scripts，只修改 Jest config/transform/mocks、package/lockfile 与测试契约。
- 替代证据：`FrontendCiGates` 7 tests、141-path discovery hash parity、36-suite/359-test 高风险聚焦、最终 141-suite/1335-test 全量，以及 typecheck/lint/public scripts/Vite build。

## 证据层级与剩余风险

- 自动化证据证明测试 discovery、Jest 运行语义、静态检查、public scripts、workflow 契约与 production build；不将这些 lower-level 证据表述为真实认证端到端或部署环境验收。
- 重新安装依赖后的首次复杂 suite 需要构建新的 Babel/Jest cache，曾出现 `257.694s` 冷启动；同 suite warm-cache 降至 `20.132s`，36-suite 与全量后续稳定。冷 cache 时间受 Windows I/O/Node 24 环境影响，属于非阻断剩余风险。
- 旧 runner 全量 `756.21s`（1329 tests），最终新 runner `780.67s`（1335 tests）；两次运行跨越上游 base 的 4 个新增 tests，不能作为严格同状态 benchmark。suite 级耗时总体同量级，尚无稳定回退证据；CI 仍使用串行确定性入口，后续可基于多次 CI 数据单独评估性能。
- 既有 React 18 legacy warning、FakeTimers/native timer warning、Browserslist、browser-externalize、direct eval 与大 chunk 告警均未扩大处理范围。

## Pre-archive review 与 final gate

- **归档准备状态：READY。** 本次审查范围内未发现剩余 Blocking 或 Decision Needed；按 `release-candidate-only` 不执行 archive。
- Final fetch 确认 `origin/hfl-test-base` 仍为 `7a5f478a`；分支已收敛为正好 1 个 change commit，工作区 clean。
- 单提交收敛后，target OpenSpec strict、all changes strict、40 个主规格 strict 和 `git diff --check origin/hfl-test-base...HEAD` 全部通过。
- 收敛后 `FrontendCiGates` 1 suite / 7 tests、`yarn typecheck`（`33.66s`）、`yarn typecheck:build-tooling`（`2.61s`）、incremental TS gate 与 `yarn build`（8349 modules，Vite `5.64s`，完整 `10.36s`）全部通过；Git status 前后不变。
- 注释 Review：`jest.config.cjs`、transformer 与 asset/style/SVG mocks 均有简洁中文注释解释 owner、隔离或导出语义；没有新增生产实现或非显然业务逻辑，不存在阻断级注释缺口。
- OpenSpec/验证语言与脱敏 Review：proposal/design/tasks/verification 和 delta specs 以简体中文说明为主；固定关键字、命令、路径与技术标识保留英文。文档不含私有 URL、凭据、IP 或敏感环境信息。
- 主规格同步预期：archive 将创建 `web-admin-jest-toolchain` 主规格并合并 `web-admin-test-baseline-and-ci-gates` 的 MODIFIED requirement；本 RC 按约束保留 active change 等待主控决策。
- 产物卫生：ignored `web-admin/build` 已删除，非 ignored untracked 为 0，workspace Node/Yarn 残留进程为 0。
- RC 工作分支已推送；按 `release-candidate-only` 未 archive、未合入或推送 `hfl-test-base`/`test`，工作分支与 workspace 保留给主控决策。

## Self-closeout final gate

- 主控完成 RC 审计并授权 `self-closeout=true` 后，change 已归档到 `openspec/changes/archive/2026-07-15-decouple-web-admin-jest-from-react-scripts`，delta specs 已同步到主规格。
- 新建的 `web-admin-jest-toolchain` 主规格 `Purpose` 已改为中文；archive 与相关主规格无自动生成的 TBD 占位内容，固定标题、规范关键字、命令及 Jest/CI/Vite 等技术标识保留英文。
- `openspec validate --changes --strict` 确认无 active change；`openspec validate --specs --strict` 验证 41 个主规格全部通过，`git diff --check` 通过，archive/主规格脱敏扫描无命中。
- Post-archive `FrontendCiGates.test.ts` 为 1 suite / 7 tests 通过。Archive 后 `web-admin` 源码、Jest 配置、依赖和 lockfile 相对 RC HEAD 均无 diff，因此复用 RC 已记录的 141-suite/1335-test 全量 Jest、typecheck、build-tooling、incremental TS gate、lint、public scripts 与 Vite build 证据，不重复运行长门禁。
- Coverage 继续为 N/A：self-closeout 只移动 OpenSpec artifacts 并同步主规格，没有新增或修改 production implementation。
