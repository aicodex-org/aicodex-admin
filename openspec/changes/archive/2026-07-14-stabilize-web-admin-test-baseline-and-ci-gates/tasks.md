## 1. 固化失败基线与根因

- [x] 1.1 在目标分支聚焦重跑 6 个失败 Jest suite，记录确定性陈旧断言、单文件超时和全套件时序敏感失败的分类结果。
- [x] 1.2 对照公共组件专用测试、近期提交和当前生产实现，确认修复只调整测试契约，不回滚生产页面行为。

## 2. 修复确定性陈旧断言

- [x] 2.1 将 `AccessCredentialEditLayout.test.ts` 的 className 顺序断言改为语义 token 断言，并验证证书/密钥编辑页聚焦测试。
- [x] 2.2 更新 `GroupListPage.test.tsx`，让业务页断言与 `ListPageTable` 当前公共 wrapper 契约分层，不重复测试已经由公共组件测试覆盖的内部结构。
- [x] 2.3 更新 `TransactionPages.test.tsx` 的嵌入表格 class token 断言，保留交易列、链接和操作行为覆盖。
- [x] 2.4 更新 `StyleModuleTopology.test.ts` 的大型编辑页样式聚合清单，覆盖当前 syncer/credential 模块入口。

## 3. 收敛异步测试超时

- [x] 3.1 将 `ApplicationAccessMenuPages.test.tsx` 中跨多个对象的 add/delete 成功分支拆为职责明确的测试；证书/密钥新增验证 draft 路由契约，真实 backend 路径捕获并等待 request promise，再刷新后续 microtask，不修改生产方法返回值。
- [x] 3.2 将 `ApplicationAccessMenuPages.test.tsx` 中批量失败分支按资源、证书/密钥、webhook/event 分组拆分，减少串行 `wait()` 并保持原错误分支断言。
- [x] 3.3 在确定性红灯修复后全量复跑；仅当 `OrganizationEditPage.test.tsx` 超时再次稳定复现时，才基于新的失败证据调整其明确 UI/状态完成条件，不提高全局 timeout。
- [x] 3.4 重复运行超时相关 suite，确认全部场景在 Jest 默认 timeout 下稳定通过。
- [x] 3.5 按全量失败证据拆分 `OrganizationDirectoryQualityPage.test.tsx` 的审批包/交接备注/持久化/审计检索链路。
- [x] 3.6 移除 `PlatformApiMappingPage.test.tsx` 与 `ApplicationUsageAccessPage.test.tsx` 的 15 秒文件级豁免，并将 Platform 请求契约、局部渲染与复制行为分层到默认 timeout 下。

## 4. 增加 CI 测试入口与门禁

- [x] 4.1 在 `web-admin/package.json` 增加固定 CI、非 watch、单进程的 `test:ci` script，不修改依赖或 lockfile。
- [x] 4.2 在 `.github/workflows/build.yml` 增加与 Go tests 并行的 `frontend-checks` job，执行 frozen-lockfile install、`yarn typecheck`、事件感知的增量 TypeScript gate 和 `yarn test:ci`。
- [x] 4.3 让 frontend build 同时依赖 `go-tests` 与 `frontend-checks`，保留现有 build artifact 和 Cypress 流程。
- [x] 4.4 静态复核 workflow 的 PR base SHA、push before SHA 和 `HEAD^` 回退逻辑，确认不硬编码私有分支。

## 5. 全量验证与交付证据

- [x] 5.1 运行 6 个原失败 suite 与相关公共组件聚焦测试，确认无失败和默认 timeout 超时。
- [x] 5.2 运行 `yarn test:ci`，确认全部已提交 Jest suite 与测试通过。
- [x] 5.3 运行 `yarn typecheck`、增量 TypeScript gate、build tooling/public scripts checks 和 `yarn build`。
- [x] 5.4 运行 `openspec validate "stabilize-web-admin-test-baseline-and-ci-gates" --strict` 与 `git diff --check`，确认 `yarn.lock` 和生产组件未修改。
- [x] 5.5 创建中文 `verification.md`，记录命令、结果、测试数量、覆盖率 N/A 依据和剩余 React 18 warning 风险。

## 6. Review 与 closeout

- [x] 6.1 完成 OpenSpec 实施前 review，修复所有 proposal/design/spec/tasks 阻塞项后再实施。
- [x] 6.2 完成归档前 review 循环，修复代码、测试、CI 或验证记录阻塞项。
- [x] 6.3 Archive change、验证主规格，并把工作分支收敛为单个最终 commit 后 push 为 merged-ready。
