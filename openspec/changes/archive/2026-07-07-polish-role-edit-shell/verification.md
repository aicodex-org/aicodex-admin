## 验证摘要

本 change 验证范围聚焦 Admin 前端身份对象编辑页壳体、角色编辑页单页正文、群组/角色 cardless 路由、必填校验、dirty 取消确认和 i18n 文案。

## 自动化验证

- `openspec validate polish-role-edit-shell --strict`: 通过。
- `yarn test src/ManagementPage.shell.test.tsx --watchAll=false --runInBand`: 通过，26/26。
- `yarn test src/GroupEditPage.test.tsx --watchAll=false --runInBand`: 通过，19/19。
- `yarn test src/RolePermissionEditPages.test.tsx --watchAll=false --runInBand`: 通过，15/15。
- `yarn typecheck --pretty false`: 通过。
- `node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`: 通过。
- `git diff --check`: 通过。

测试输出仍包含现有 React 18 `ReactDOM.render` 警告和 AntD/rc-select `act(...)` 警告；本轮断言均通过，未发现由本 change 引入的失败。

## 覆盖率

运行命令：

```bash
yarn test src/ManagementPage.shell.test.tsx src/GroupEditPage.test.tsx src/RolePermissionEditPages.test.tsx --watchAll=false --runInBand --coverage --collectCoverageFrom=src/ManagementPage.tsx --collectCoverageFrom=src/GroupEditPage.tsx --collectCoverageFrom=src/RoleEditPage.tsx
```

结果：3 个测试套件通过，60/60 tests 通过。

受影响实施文件覆盖率：

- `web-admin/src/RoleEditPage.tsx`: 文件行覆盖率 99.12%，高于 85%。
- `web-admin/src/GroupEditPage.tsx`: 文件行覆盖率 94.79%，高于 85%。
- `web-admin/src/ManagementPage.tsx`: 全文件行覆盖率 48.37%。该文件是 800+ 行 Admin shell 大壳，本 change 只新增 2 行 cardless route pattern；按 coverage-final 与 `git diff --unified=0` 交叉核对，本 change 修改的可执行行 changed-line coverage 为 100%。

本 change 实际修改行覆盖率：

- `web-admin/src/RoleEditPage.tsx`: 222/222 executable changed lines，100%。
- `web-admin/src/GroupEditPage.tsx`: 31/31 executable changed lines，100%。
- `web-admin/src/ManagementPage.tsx`: 2/2 executable changed lines，100%。

`web-admin/src/App.less` 为样式文件，不进入 Jest 单元覆盖率统计；其效果由 shell/页面 class 断言和用户人工预览覆盖。

## 本地预览

- 本地 7004 前端预览入口返回 200。
- Playwright 打开 `/roles/<org>/<role>` 时因为没有可复用登录会话被重定向到登录页；console 仅观察到 React DevTools 提示、AntD 既有 warning 和登录页 autocomplete 提示，未观察到页面崩溃。
- 用户已在当前 7004 预览中人工检查群组、角色、组织编辑页壳体对齐和底部按钮位置，并确认当前视觉方向可进入收尾。

该预览记录只证明本地入口可打开、未登录路径无崩溃，以及认证后视觉由用户人工验收；不声明完整端到端认证流程或后端数据写入已由 Playwright 覆盖。

## 剩余风险

- `ManagementPage.tsx` 全文件历史覆盖率偏低，但本 change 修改的 cardless route pattern 已由 `ManagementPage.shell.test.tsx` 覆盖。
- 未执行完整生产构建；本轮代码变更由聚焦 Jest、TypeScript typecheck、增量 TypeScript gate 和人工预览覆盖。
