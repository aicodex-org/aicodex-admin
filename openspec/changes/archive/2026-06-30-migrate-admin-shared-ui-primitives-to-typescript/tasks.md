## 1. OpenSpec

- [x] 1.1 创建 `migrate-admin-shared-ui-primitives-to-typescript` 的 proposal、design、tasks 和 spec delta。
- [x] 1.2 完成实施前 review，并修复 proposal/design/tasks/spec 中清晰可修的问题。

## 2. 组件迁移

- [x] 2.1 将 `web-admin/src/common/select/*.js` 中低风险选择器迁移为 `.tsx`，并迁移对应 focused tests；`AffiliationSelect.js` 因牵出用户/OAuth 隶属关系链路 deferred。
- [x] 2.2 将 `web-admin/src/common/modal/*.js` 中低风险弹窗迁移为 `.tsx`，保留弹窗确认、取消、提交、加载和错误展示语义；媒体、裁剪、协议、密码和重置弹窗 deferred。
- [x] 2.3 将 `web-admin/src/common/table/*.js` 迁移为 `.tsx`，并迁移 `TablePagination` focused test。
- [x] 2.4 将 `web-admin/src/common/*.js` 中低耦合 UI primitives 迁移为 `.tsx`，保留现有 props、导出和调用方兼容；OAuth/SAML、PaginateSelect 和 CaptchaWidget deferred。
- [x] 2.5 将 `web-admin/src/table/*.js` 中低耦合配置表组件迁移为 `.tsx`，保留行数据、字段回写、删除/新增和 disabled 语义。
- [x] 2.6 明确 deferred 文件及原因，特别是 Provider、Syncer、auth 主链路、页面级业务或高成本类型洞。

## 3. 测试

- [x] 3.1 迁移本次触碰且包含 JSX 的 existing tests 到 `.test.tsx`。
- [x] 3.2 运行 focused Jest，至少覆盖 `NavItemTree.test`、`OrganizationSelect.test`、`TablePagination.test`；未触碰 Provider 表相关文件，因此未运行 `ProviderTable.test`。
- [x] 3.3 测试只断言用户可观察输出、回调和现有行为，不调用真实 provider、认证链路、密钥或生产/类生产环境。

## 4. 验证

- [x] 4.1 运行 `openspec validate migrate-admin-shared-ui-primitives-to-typescript --strict`。
- [x] 4.2 运行 `git diff --check`；最终提交后补充 `git diff --check origin/hfl-test-base..HEAD`。
- [x] 4.3 在 `web-admin` 运行 `yarn typecheck`。
- [x] 4.4 在 `web-admin` 运行 `node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`。
- [x] 4.5 在 `web-admin` 运行 `yarn build`。
- [x] 4.6 在 `verification.md` 记录命令、结果、deferred 文件和剩余风险，验证记录保持脱敏。

## 5. 收口

- [x] 5.1 完成归档前 review，确认代码、文档、spec、测试和验证记录无阻塞问题。
- [x] 5.2 archive change 后收敛为单 change commit，rebase 到最新 `origin/hfl-test-base`，ff-only 合入并 push `hfl-test-base`，删除本地/远端工作分支。
