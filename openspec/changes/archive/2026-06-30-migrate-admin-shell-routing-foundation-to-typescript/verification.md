## 验证摘要

- `openspec validate migrate-admin-shell-routing-foundation-to-typescript --strict`
  - 结果：通过，输出 `Change 'migrate-admin-shell-routing-foundation-to-typescript' is valid`。
- `git diff --check`
  - 结果：通过，无空白错误。
- `yarn test --watchAll=false --runInBand --testMatch "**/src/App.test.tsx" "**/src/ManagementPage.test.tsx" "**/src/ManagementPage.navigation.test.tsx" "**/src/Setting.test.tsx"`
  - 结果：通过。
  - Jest 真实发现并运行：`4` test suites，`15` tests，`0` snapshots。
  - 备注：`App.test.tsx` 输出 React 18 旧 Testing Library `ReactDOM.render` warning，测试通过；未出现 `0 tests`。
- `yarn typecheck`
  - 结果：通过，`tsc --noEmit` 退出 0。
- `node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`
  - 结果：通过，退出 0。
- `yarn build`
  - 结果：通过，`Compiled successfully`，构建产物输出到本地 `web-admin/build`。
  - 备注：命令输出既有 `fs.F_OK` deprecation、Browserslist outdated 和 bundle size warning；未新增构建失败。

## 覆盖率

未跑 coverage。本 change 是 root shell / routing / config foundation 的机械 TS/TSX 迁移，未引入新业务分支；已用指定聚焦 Jest、typecheck、增量 TS gate 和 production build 覆盖导入、类型和构建路径。

## Deferred / 剩余风险

- `Setting.tsx` 仍保留 `// @ts-nocheck` 作为本批 legacy boundary。该文件包含大量历史动态 helper、JSX helper 和跨页面调用，完整类型化会牵引未迁移业务页面和全局模型；本 change 仅显式标注当前外部 TSX 调用需要的导出 helper 签名。
- `ManagementPage.tsx` 对未迁移或非标准 React 类型的 legacy 页面组件使用局部 `React.createElement(Page as LegacyAny, ...)` 路由边界，避免触碰并行写集页面。
- 未做浏览器 smoke。本批未改变 root shell、登录守卫、路由 path、菜单 key 或 setting 保存行为；聚焦 Jest、typecheck 和 build 均通过。如后续发现登录或路由运行态差异，应补本地浏览器 smoke。
