## 验证记录

### OpenSpec

- `openspec validate migrate-organization-invitation-list-to-typescript --strict`：通过。
- `openspec validate --changes --strict`：通过，5 个 active changes 全部通过。
- `openspec validate --specs --strict`：通过，26 个 specs 全部通过。
- `git diff --check`：通过。

### web-admin TypeScript / Build

- `cd web-admin; node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`：通过。
- `cd web-admin; yarn typecheck`：通过。
- `cd web-admin; yarn build`：通过，产物输出到 `build/`；仅出现项目既有 bundle size、Browserslist 和 Node deprecation 提示。

### 聚焦 Jest 与覆盖率

`craco test --runTestsByPath` 在当前 Windows `.codex` worktree 路径下生成的 CRA/Jest `testMatch` glob 未匹配到测试文件，因此使用等价 direct Jest config 验证，transform、setupFiles 和 setupTests 均来自 `react-scripts` / 项目配置：

```powershell
node node_modules/jest/bin/jest.js --config <inline react-scripts-compatible config> --runInBand --coverage --coverageReporters=text
```

结果：

- Test Suites: 2 passed, 2 total。
- Tests: 16 passed, 16 total。
- 覆盖文件：
  - `src/InvitationListPage.tsx`：Statements 100%，Branches 89.18%，Functions 100%，Lines 100%。
  - `src/backend/InvitationBackend.ts`：Statements 100%，Branches 100%，Functions 100%，Lines 100%。
- 控制台仅出现项目当前 `@testing-library/react` 旧 render API 在 React 18 下的既有 warning；未影响断言结果。

### 兼容性检查

- `InvitationEditPage.js` 仍通过 `import * as InvitationBackend from "./backend/InvitationBackend"` 使用 detail、update、delete、send 等原具名导出。
- 未迁移 `InvitationEditPage.js`，未改变 `/invitations` 路由、表格列、组织筛选、分页筛选排序、新增/删除流程或后端 endpoint 契约。

### 本地验证产物

- 为执行前端验证，本 worktree 临时安装了 `web-admin/node_modules` 并执行 build 生成了 `web-admin/build/`；两者均为 `.gitignore` 覆盖的本地产物，收口前清理。
