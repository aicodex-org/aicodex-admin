## 1. 基线与实施前门禁

- [x] 1.1 复核 React 18、Vite `es2020`、production browserslist、Jest/Babel/jsdom 与认证启动/回调路径的真实 owner，确认 Internet Explorer 不在支持范围且 `core-js/es`、`replaceAll` fallback 仍需保留。
- [x] 1.2 记录移除前的直接依赖数、Yarn top-level lock key 数、CRA polyfill owner/传递依赖图，以及同口径 production JS 文件数、总 raw/gzip 与入口 chunk raw/gzip。
- [x] 1.3 对 proposal、design、delta specs 与本任务清单执行 pre-implementation review，修复 Blocking/Fixable 后运行目标/changes strict validate 与 `git diff --check`，结论达到 READY。

## 2. TDD 退役 CRA polyfill

- [x] 2.1 在 `web-admin/src/FrontendCiGates.test.ts` 先新增结构契约断言：production 入口不含 CRA/IE imports、保留 `core-js/es` 与 `replaceAll` fallback、Jest 无 CRA `setupFiles`、package 无 `react-app-polyfill`、Vite target 与 production browserslist 继续排除 IE。
- [x] 2.2 运行聚焦 Jest 并记录预期 RED，确认失败只来自现存 `react-app-polyfill` production/Jest/package owner，而不是测试语法或环境错误。
- [x] 2.3 从 `web-admin/src/index.tsx` 删除 `react-app-polyfill/ie9` 与 `react-app-polyfill/stable`，保留 `core-js/es`、`replaceAll` fallback、认证入口与其它启动顺序。
- [x] 2.4 从 `web-admin/jest.config.cjs` 删除 CRA jsdom `setupFiles`，保留显式 jsdom environment、稳定本机 origin 与 `src/setupTests.ts`。
- [x] 2.5 从 `web-admin/package.json` 删除 `react-app-polyfill` 直接依赖，并使用 Yarn 1 更新 `web-admin/yarn.lock`；审计 `whatwg-fetch`、`raf`、`promise`、`object-assign`、`regenerator-runtime` 与 `core-js` 的剩余 owner，不手工误删共享条目。
- [x] 2.6 重新运行聚焦 Jest 达到 GREEN；若 fetch/auth suite 暴露真实隐式依赖，只在对应 suite 使用明确 test double，不恢复全局 CRA polyfill。

## 3. 文档与静态契约

- [x] 3.1 更新 `docs/admin-technical-debt-baseline-2026-07-14.md`，将 CRA/IE polyfill 条目标记为已完成，并记录保留 `core-js`、`replaceAll`、Jest/Babel/jsdom owner 的边界。
- [x] 3.2 全仓搜索确认 source、Jest config、package 与 lock 不再引用 `react-app-polyfill`，且未修改 Provider/Syncer/TLS/Go/schema/fixture/CI workflow、Bun 或 `test` 分支。

## 4. 自动化与构建验证

- [x] 4.1 运行 `yarn install --frozen-lockfile --non-interactive`、依赖/peer/lock owner 审计，确认 Yarn 仍为唯一真值且未升级 React、Router、Jest、AntD、Vite、Playwright 或 Bun。
- [x] 4.2 运行聚焦 Jest 与完整 `yarn test:ci`，记录 discovery、suite/test 数和 0 失败；确认移除全局 jsdom polyfill 后现有 fetch/auth 测试仍由显式 test double 支撑。
- [x] 4.3 运行 `yarn typecheck`、`yarn typecheck:build-tooling`、`yarn typecheck:e2e`、incremental TypeScript gate 与 production `yarn lint`。
- [x] 4.4 运行 `yarn public-scripts:check`、`yarn public-scripts:build`、`yarn public-scripts:smoke` 与 `yarn build`，确认 public auth scripts 和 Vite production build 通过。
- [x] 4.5 运行 `yarn test:e2e:list`，确认 Playwright discovery 保持 19 files / 22 tests。
- [x] 4.6 用与基线相同的命令和内存 gzip 算法统计最终 production JS/入口 chunk 指标，并对比直接依赖、lock entries、模块数、raw/gzip；收益未下降时如实记录 owner/维护收益。
- [x] 4.7 对本 change 的 changed executable statements 进行覆盖率判定；若仅删除 side-effect imports、Jest setup 与依赖声明且无新增/修改业务分支，记录 coverage N/A 及结构契约、全量 Jest、构建和浏览器替代证据。

## 5. 真实 Chromium 与归档前验证

- [x] 5.1 按 `aicodex-admin-ui-review` 使用真实 Chromium 验证本地 `/login` 启动、OIDC authorize 或等价登录入口、`/callback` 可达，以及 console/page error 为 0；只使用脱敏本地 fixture/拦截，不连接或写入 60。
- [x] 5.2 清理 `build`、coverage、Playwright report/test-results、截图、临时缓存与本任务进程残留，并运行目标/changes/specs strict validate、`git diff --check`、中文/TBD/脱敏/EOF 检查。
- [x] 5.3 编写中文 `verification.md`，记录 TDD RED/GREEN、依赖/lock/bundle差异、全部门禁、浏览器证据、coverage N/A 依据、证据层级与剩余风险。
- [x] 5.4 执行 pre-archive review 循环，检查最终代码、注释、测试质量、主规格同步、验证语言/脱敏和单 change 交付边界，修复 Blocking/Fixable 后达到 READY。

## 6. Self-closeout

- [x] 6.1 fetch/prune 最新 `origin/hfl-test-base`；若前进则审计与本 change/TLS 写集交集，安全 rebase 后重跑受影响门禁，保持最新 base + 1 logical commit。
- [x] 6.2 以 `sync-specs` archive 本 change，检查 archive 副本与 `openspec/specs` 主规格语言/语义一致，并运行 archive 后 changes/specs strict 与 `git diff --check`。
- [x] 6.3 收敛为最新 base + 1 个 Conventional Commit，普通非强制 push `HEAD:hfl-test-base`；不得 push/merge `test`。
- [x] 6.4 删除本地/远端工作分支，将固定 workspace 切回 clean/aligned `hfl-test-base`，完成 residue、remote hash 与资源锁释放门禁并结构化回传 `RELEASED`。
