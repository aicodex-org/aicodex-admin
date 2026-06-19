## 验证摘要

本 change 只迁移 `web-admin/src/AuthSourceCenter` 及其测试为 TSX，不触发后端、真实 provider、OAuth/OIDC、组织同步或生产/类生产配置。

| 类型 | 命令 | 结果 |
| --- | --- | --- |
| OpenSpec target validate | `openspec validate migrate-auth-source-center-to-typescript --strict` | 通过，change valid。 |
| OpenSpec changes strict | `openspec validate --changes --strict` | 通过，5 个 active changes 均 valid。 |
| OpenSpec specs strict | `openspec validate --specs --strict` | 通过，26 个主规格均 valid。 |
| Diff whitespace | `git diff --check` | 通过，无空白错误。 |
| Incremental TypeScript gate | `cd web-admin; node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base` | 通过，无输出错误。 |
| TypeScript | `cd web-admin; yarn typecheck` | 通过，`tsc --noEmit` exit 0。 |
| 聚焦 Jest / coverage | `cd web-admin; yarn test --watchAll=false --runInBand --coverage --collectCoverageFrom=src/AuthSourceCenter.tsx --testMatch "**/src/AuthSourceCenter.test.tsx" --coverageReporters=text-summary --coverageReporters=json-summary` | 通过，1 suite / 4 tests passed。`AuthSourceCenter.tsx` coverage: statements 100%、branches 92.45%、functions 100%、lines 100%。测试输出存在项目既有 React 18 + Testing Library 旧 `ReactDOM.render` warning，不影响断言结果。 |
| Build | `cd web-admin; yarn build` | 通过，production build compiled successfully。输出仅包含既有 bundle size、Browserslist 数据过期和 `fs.F_OK` deprecation 提示。 |

## 覆盖率口径

- 统计对象：本 change 触碰的生产组件 `web-admin/src/AuthSourceCenter.tsx`。
- 覆盖率结果：statements 100%、branches 92.45%、functions 100%、lines 100%，达到 85% 门槛。
- 测试覆盖内容：provider 归类、配置完整度、敏感值不输出、已配置/待补全/未启用状态、诊断链接、空态和 loading 状态。

## 运行态验收口径

- 本 change 是前端 TSX 迁移，不改变 `/providers` 路由、Provider 表格行为、权限、后端 API 或真实身份源运行态。
- 已通过 typecheck、聚焦 Jest 和 production build 证明 JS 页面导入 TSX 组件的构建路径可用。
- 未执行真实浏览器或 60 环境验证；原因是本 change 不改可见布局和后端契约，风险由聚焦组件测试与构建覆盖。

## 验证产物清理

- `yarn test --coverage` 和 `yarn build` 生成的 ignored `web-admin/coverage/` 与 `web-admin/build/` 已在验证后删除。
