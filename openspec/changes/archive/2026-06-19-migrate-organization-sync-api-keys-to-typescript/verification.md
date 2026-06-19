## 验证摘要

- `openspec validate migrate-organization-sync-api-keys-to-typescript --strict`：通过，目标 change 有效。
- `node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`：通过，未新增违规 React `.js`、JSX `.test.js` 或纯逻辑 `.js` 文件。
- `yarn typecheck`：通过，`tsc --noEmit` 接纳 `OrganizationSyncApiKeyListPage.tsx`、`OrganizationSyncApiKeyBackend.ts` 和新增 TS 测试。
- `yarn test --watchAll=false --runInBand --coverage --collectCoverageFrom=src/OrganizationSyncApiKeyListPage.tsx --collectCoverageFrom=src/backend/OrganizationSyncApiKeyBackend.ts --testMatch "**/src/OrganizationSyncApiKeyListPage.test.tsx" --testMatch "**/src/backend/OrganizationSyncApiKeyBackend.test.ts" --coverageReporters=text-summary --coverageReporters=json-summary`：通过，2 个 test suites / 14 个 tests 通过。
- `yarn build`：通过，输出既有 bundle size、Browserslist 和 `fs.F_OK` warning；本 change 未处理这些历史构建 warning。
- `git diff --check`：通过，无 whitespace 错误。

## 覆盖率

聚焦统计对象为本 change 触碰的实施代码：

- `src/OrganizationSyncApiKeyListPage.tsx`
- `src/backend/OrganizationSyncApiKeyBackend.ts`

覆盖率结果：

- Statements: 94.77% (127/134)
- Branches: 77.92% (60/77)
- Functions: 89.55% (60/67)
- Lines: 94.77% (127/134)

该覆盖率覆盖列表脱敏展示、非 `built-in` 组织保护、草稿状态、状态 tag、日期 fallback、创建/轮换/禁用/删除成功和失败路径、一次性明文复制、未授权列表响应、backend endpoint/method/header/body。

## 证据层级与剩余风险

- 本 change 是前端 TS/TSX 迁移，不改变后端 API Key 生成、哈希、鉴权、导出或同步读取行为。
- 未执行真实组织同步密钥创建、轮换或 Gateway 拉取；这些属于 `add-organization-sync-api-keys` 功能 change 的运行态验收范围。
- Jest 输出 React 18 `ReactDOM.render` warning，属于项目当前 testing-library 版本既有 warning，本 change 未升级测试基础设施。
