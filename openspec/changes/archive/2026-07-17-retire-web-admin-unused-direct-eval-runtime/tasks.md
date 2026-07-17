## 1. 基线与实施前门禁

- [x] 1.1 记录 latest `origin/hfl-test-base`、`origin/test`、active changes、目标分支与 write-set 门禁，确认上游新增提交不触碰本 change 文件。
- [x] 1.2 使用限定扩展名的 `rg`/AST 盘点证明 `parseObject` 全仓只有定义、production direct `eval` 只有 `Setting.tsx` 一处、`new Function` 为 0。
- [x] 1.3 在未修改源码时运行 `yarn build`，记录成功构建中的一条 `[EVAL]` 与其它既有 warning 分类。
- [x] 1.4 完成 proposal、design、delta spec、tasks 的 target/changes strict 与 `git diff --check`，执行 pre-implementation review循环并取得 READY。

## 2. TDD 删除运行时字符串执行入口

- [x] 2.1 新建 `web-admin/src/RuntimeCodeExecutionSafety.test.ts`，使用 TypeScript AST 扫描 production `.ts/.tsx` 的 direct `eval` 和 `new Function`，先运行 focused Jest 并确认因 `Setting.tsx` 唯一命中而 RED。
- [x] 2.2 在 `web-admin/src/Setting.test.tsx` 增加 `parseJson` 空串、合法 JSON、非法 JSON 行为测试，确认删除前行为基线为 GREEN。
- [x] 2.3 仅从 `web-admin/src/Setting.tsx` 删除零调用的 `parseObject`，不新增 parser、shim、动态执行或无关重构。
- [x] 2.4 重跑两个 focused test文件取得 GREEN，复核全仓 `parseObject`、production direct `eval` 与 `new Function` 计数均为 0。

## 3. 覆盖率与完整前端验证

- [x] 3.1 运行 focused coverage；记录删除行导致 changed production executable statements 为 0，并从 coverage JSON证明相邻保留的 `parseJson` 三类行为均被执行，不用 `Setting.tsx` 全文件平均值掩盖口径。
- [x] 3.2 运行 `yarn install --frozen-lockfile`，证明 `package.json` 与 `yarn.lock` 未变化。
- [x] 3.3 运行 `yarn typecheck`、`yarn typecheck:build-tooling`、`yarn typecheck:e2e` 和 incremental TypeScript gate。
- [x] 3.4 运行 `yarn lint`、`yarn public-scripts:check`、`yarn public-scripts:build`、`yarn public-scripts:smoke`。
- [x] 3.5 运行完整 `yarn test:ci`，保持最新完整 discovery、0 failure、无 skip/only 或 warning suppression 回退。
- [x] 3.6 运行 `yarn build`，确认 `[EVAL]`/direct-eval warning 为 0，并分类记录保留的 `fs` external 与 chunk-size warning。
- [x] 3.7 运行 Playwright discovery并做最小本地 build smoke：加载静态 `index.html`/关键入口，检查 HTTP成功、页面可达且无本 change引入的 console/page error；不访问60、不改服务。

## 4. OpenSpec、Review 与 self-closeout

- [x] 4.1 创建中文 `verification.md`，记录 RED/GREEN、调用证明、coverage口径、完整门禁、浏览器/build证据、warning分类与脱敏边界。
- [x] 4.2 运行 target/changes/specs strict、`git diff --check`、中文/TBD/脱敏/EOF、direct-eval与残留扫描，完成 pre-archive review循环并取得 READY。
- [x] 4.3 按 `sync-specs` archive change，同步并复查 `web-admin-runtime-code-execution-safety` 主规格与 archive副本，重跑 archive后 strict/diff/focused final gate。
- [x] 4.4 fetch/rebase latest `origin/hfl-test-base`，若写集或构建语义受上游影响则重跑相应长门禁；收敛为 latest base + 1 logical commit。
- [x] 4.5 普通非强制 push最终 HEAD到 `hfl-test-base`，不 push/merge `test`；删除本地/远端工作分支，清理 build/coverage/report/log/process残留并恢复固定 workspace clean/aligned。
