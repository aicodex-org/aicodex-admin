## 验证范围

- 工作区：`aicodex-admin`，分支 `hfl-test/upgrade-web-admin-react-testing-library-for-react-18`
- 起始基线：`origin/hfl-test-base@dcf7f00902c5b4b6735caddadefdafaf801c0537`
- 本地工具链：Windows、Node `24.14.0`、Yarn `1.22.22`
- 变更性质：仅 devDependency、Jest 测试与 OpenSpec；没有生产源码、运行时依赖、API、Provider/Syncer UI 或 CI 结构改动

## 版本与依赖证据

- registry/peer 审计确认 `@testing-library/react 16.3.2` 支持 Node `>=18`、React/ReactDOM `^18 || ^19`，没有要求升级 Jest；其非可选 peer 为 `@testing-library/dom ^10`。
- 选择 `@testing-library/react ^16.3.2` 与显式 `@testing-library/dom ^10.4.1`；保留 React/ReactDOM `18.2`、Jest `27.5.1`、TypeScript `5.7.3`、Vite、Playwright、jest-dom、user-event 与 Yarn 1 真值不变。
- `yarn install --frozen-lockfile`：通过。
- `yarn why @testing-library/react`：解析为 `16.3.2`，直接 `devDependency`。
- `yarn why @testing-library/dom`：解析为 `10.4.1`，直接 `devDependency`。
- `yarn.lock` 仅新增/升级 RTL、DOM 10 及其必要依赖，并移除旧 RTL 9.5、DOM 6/9 和不再被其它 owner 持有的旧 Testing Library 类型树；没有业务运行时依赖升级。

## TDD 与聚焦回归

- RED：在 RTL 9.x 上运行新增兼容 suite，默认 render 没有调用 `ReactDOMClient.createRoot`，并出现 legacy root 告警，按预期失败。
- GREEN：升级后 `ReactTestingLibraryCompatibility.test.tsx` 的 `createRoot`、`cleanup`、同步/异步 `act` 断言通过。
- 删除 29 个目标文件中的 legacy warning 分支后，29 文件加兼容 suite 聚焦回归为 `30/30 suites`、`323/323 tests`，legacy root、act、FakeTimers 和普通 warning 均为 0。
- RTL 16 直接暴露的 7 个 suite 旧异步假设已用真实可观察条件修正；聚焦回归为 `7/7 suites`、`136/136 tests`。
- 类型收紧后的 test-only 空值与 NodeList 兼容修正聚焦回归为 `5/5 suites`、`131/131 tests`。
- 静态扫描：legacy warning suppression 为 0，`legacyRoot: true` 为 0，新增 `.only`/`.skip` 为 0；没有新增全局 `console` ignore、静默 mock 或超时放宽。

## 完整 Jest 与 warning 对比

- `yarn test:ci`：`145/145 suites`、`1371/1371 tests`、0 failure；基线为 `144/144 suites`、`1369/1369 tests`，新增仅兼容 suite 的 2 个测试。
- test-only 类型兼容修正后的最终 `yarn test:ci` 复跑仍为 `145/145 suites`、`1371/1371 tests`、0 failure，legacy root 文本为 0，保留 1 次既有 FakeTimers 提示。
- 同口径非 silent 全量 Jest：`145/145 suites`、`1371/1371 tests`、0 failure。
- discovery：当前 145 个路径，基线等价 144 个路径；missing 为 0，extra 仅 `src/ReactTestingLibraryCompatibility.test.tsx`。当前路径 SHA-256 为 `2db12bc5820b984c800b03c8d99ad1fdaccc96f50a51f35b879468262cb89ea9`，去除新增 suite 后为 `d768afb82842f97ebe780c7e2199fc7241818e538cf693d4bcf90c8d94e84816`。
- 非 silent warning 计数：legacy `ReactDOM.render` 文本 `609 -> 0`；`Warning:` 行 `689 -> 336`；FakeTimers `4 -> 1`；act warning `46 -> 310`。
- act warning 上升是 React 18 `createRoot` 将既有异步提交显式暴露的结果，主要来自组织同步页面与 AntD portal/motion；本 change 没有隐藏它们。它们不影响 0 failure 和 legacy root 退役结论，但作为独立测试债保留。

## 静态、构建与 E2E 契约

- `yarn typecheck`：通过。
- `yarn typecheck:build-tooling`：通过。
- `yarn typecheck:e2e`：通过。
- `node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`：通过。
- `yarn lint`：通过，保留 Browserslist 数据过期提示，没有在本 change 更新依赖树。
- `yarn public-scripts:check`、`yarn public-scripts:build`、`yarn public-scripts:smoke`：通过；smoke 输出 `public auth scripts smoke passed`。
- `yarn build`：通过；保留仓库既有 `fs` browser external、direct eval 与 chunk-size 提示，没有新增生产实现或 bundle owner。
- `yarn test:e2e:list`：19 files / 22 tests，保持 Playwright discovery 契约。
- `openspec validate upgrade-web-admin-react-testing-library-for-react-18 --strict`、`openspec validate --changes --strict`、`openspec validate --specs --strict`：通过。
- `git diff --check`：通过。

## Coverage

changed implementation coverage 为 N/A：本 change 没有生产实现改动。高价值行为由新增 React 18 兼容 suite、29 文件聚焦回归、直接失败 suite 回归、全量 Jest、全量/增量 typecheck、public scripts、Vite build 与 Playwright discovery 覆盖；没有用业务源码总覆盖率制造形式门槛。

## 剩余风险

- 本地 Node 为 24.14.0，hosted CI 的 Node 20.19.0 尚未在本机重建；版本选择已用 engines/peer 证据约束，最终仍需共享 CI 复核。
- 非 silent act warning 数量高于升级前，属于 createRoot 暴露的历史异步测试债；本 change 保持可见且不扩大到全仓 warning 清理。
- 构建中的 Browserslist、`fs` external、direct eval 与大 chunk 提示均为既有提示，不由 Testing Library devDependency 变更引入。
- 没有生产行为或浏览器交互改动，因此未运行真实 Playwright E2E；以 discovery 19/22、完整 Jest 和生产构建作为与本 change 风险匹配的证据。

## 归档前 Review

- 状态：READY。
- 已修复主规格冲突：用 `MODIFIED Requirements` 明确专用 React 18 测试兼容 change 可以升级 Testing Library dev dependency，并将 legacy root 从“保持语义”改为“必须退役且诊断可审计”。
- 本 change 没有生产实现、公共函数或业务字段改动，因此 implementation coverage 与生产注释门槛均为 N/A；新增测试只使用必要的 React 18 行为描述，没有需要补充的复杂业务注释。
- proposal、design、tasks、verification 与 delta specs 已检查中文、TBD、脱敏和 EOF；保留的英文为 OpenSpec 固定结构、命令、包名、API/代码标识与标准测试术语。
