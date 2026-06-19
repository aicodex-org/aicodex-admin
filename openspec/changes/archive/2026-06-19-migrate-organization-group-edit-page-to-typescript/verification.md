## 验证摘要

本 change 将 `web-admin/src/GroupEditPage.js` 保守迁移为 `GroupEditPage.tsx`，并新增 `GroupEditPage.test.tsx` 覆盖群组编辑页的加载、父群组选项、组织切换、保存、保存并退出、取消新增、删除和错误处理。

## 命令与结果

- `openspec validate migrate-organization-group-edit-page-to-typescript --strict`：通过。
- `openspec validate --changes --strict`：通过，5 个 active changes 校验通过。
- `openspec validate --specs --strict`：通过，26 个 specs 校验通过。
- `git diff --check`：通过。
- `cd web-admin; node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`：通过。
- `cd web-admin; yarn typecheck`：通过。
- `cd web-admin; yarn test --watchAll=false --runInBand --coverage --testMatch "**/src/GroupEditPage.test.tsx" --collectCoverageFrom=src/GroupEditPage.tsx --coverageReporters=text-summary --coverageReporters=json-summary`：通过，9 个测试通过。
- `cd web-admin; yarn build`：通过。

## 覆盖率

统计对象：`web-admin/src/GroupEditPage.tsx` changed-file coverage。

- Statements：98.75%（79/80）
- Functions：100%（38/38）
- Lines：98.68%（75/76）
- Branches：72.13%（44/61）

Statements、functions、lines 均高于 85% 门槛。Branches 未设为本 change 的硬门槛，缺口主要来自 legacy class 组件的条件渲染和错误路径组合。

## 已知 warning

- 聚焦 Jest 输出 React 18 既有 warning：`ReactDOM.render is no longer supported in React 18`。该 warning 来自当前测试栈和 `@testing-library/react` 版本组合，非本页面迁移引入。
- `yarn build` 输出既有 bundle size、`fs.F_OK` deprecation 和 Browserslist 数据过期提示；构建成功，未引入新的构建失败。

## 剩余风险

- 本 change 未做浏览器手工验证；页面行为由聚焦 React 测试、typecheck 和 production build 覆盖。
- 未迁移 `InvitationEditPage.js` 和其它组织账号 legacy JS 页面，后续 change 单独评估。
