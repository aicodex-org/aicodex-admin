## 验证记录

### OpenSpec 与 diff

- `openspec validate migrate-organization-group-list-to-typescript --strict`：通过，change valid。
- `openspec validate --changes --strict`：通过，5 个 active changes 全部 valid。
- `openspec validate --specs --strict`：通过，26 个 specs 全部 valid。
- `git diff --check`：通过，无空白错误。

### 前端 TypeScript 与构建

- `cd web-admin; node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`：通过，未输出违规项。
- `cd web-admin; yarn typecheck`：通过。
- `cd web-admin; yarn build`：通过，产物生成到 `web-admin/build`。构建仅输出既有 Browserslist 过期、bundle size 与 Node deprecation warning，不影响本 change 验证结论。

### 聚焦 Jest 与覆盖率

- `cd web-admin; yarn test --runTestsByPath src/GroupListPage.test.tsx src/backend/GroupBackend.test.ts --watchAll=false --coverage --coverageReporters=text --collectCoverageFrom=src/GroupListPage.tsx --collectCoverageFrom=src/backend/GroupBackend.ts`：在 `.codex` worktree 路径下未发现测试文件，报 `No tests found`。这是当前 CRA/Jest 对该 worktree 路径的识别问题，不作为业务失败。
- 使用 direct Jest config，并仍复用 `react-scripts` 的 Babel/CSS/file transform、`setupTests.js` 和 jsdom 环境，执行 `GroupListPage.test.tsx` 与 `backend/GroupBackend.test.ts`：通过，15 tests passed。
- 覆盖率：
  - `src/GroupListPage.tsx`：Statements 94.73%，Branches 72.13%，Functions 95.23%，Lines 94.59%。
  - `src/backend/GroupBackend.ts`：Statements/Branches/Functions/Lines 均为 100%。
  - changed-file line coverage 均超过 85%。
- Jest console 中存在 React Testing Library 当前版本触发的 React 18 `ReactDOM.render` legacy warning；这是测试工具链 warning，不改变断言结果。

### JS/TS 共存兼容

- `rg -n "GroupBackend" web-admin/src/GroupTreePage.js web-admin/src/GroupEditPage.js web-admin/src/ApplicationEditPage.js web-admin/src/InvitationEditPage.js web-admin/src/LdapEditPage.js web-admin/src/PermissionEditPage.js web-admin/src/RoleEditPage.js web-admin/src/UserEditPage.js web-admin/src/backend/GroupBackend.ts`：确认其它 JS 调用方仍按 `./backend/GroupBackend` 具名导入，`GroupBackend.ts` 保留 `getGroups`、`getGroup`、`updateGroup`、`addGroup`、`deleteGroup` 导出。

## 剩余风险

- 本 change 只迁移群组列表页和 backend client；`GroupTreePage.js`、`GroupEditPage.js`、`UserListPage.js` 仍是后续独立迁移范围。
- 未做浏览器人工回归；当前验证覆盖类型检查、聚焦行为测试、生产构建和 JS 调用兼容。
