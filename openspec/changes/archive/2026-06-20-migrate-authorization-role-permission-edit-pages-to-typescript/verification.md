## 验证摘要

本 change 已完成源码级、OpenSpec 和构建级验证。验证只覆盖本地源码、测试和构建边界；未连接真实后端、真实权限环境或生产/类生产环境。

## OpenSpec 与 Diff

- `openspec validate migrate-authorization-role-permission-edit-pages-to-typescript --strict`：通过，目标 change valid。
- `openspec validate --changes --strict`：通过，5 个 active changes 全部通过。
- `openspec validate --specs --strict`：通过，26 个 specs 全部通过。
- `git diff --check`：通过，无 whitespace/error 输出。

## Web Admin

- `cd web-admin; node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`：通过，退出码 0，无新增 legacy JS/JSX 或 JS 测试违规输出。
- `cd web-admin; yarn typecheck`：通过，`tsc --noEmit` 退出码 0。
- `cd web-admin; yarn test --watchAll=false --runInBand --runTestsByPath src/RolePermissionEditPages.test.tsx`：通过，12 个 tests 全部通过；输出包含既有 React 18 `ReactDOM.render` warning。
- `cd web-admin; yarn test --coverage --coverageDirectory=coverage-role-permission-edit --watchAll=false --runInBand --runTestsByPath src/RolePermissionEditPages.test.tsx --collectCoverageFrom=src/RoleEditPage.tsx --collectCoverageFrom=src/PermissionEditPage.tsx --coverageReporters=text-summary --coverageReporters=json-summary`：通过，Statements 100%、Branches 91.28%、Functions 100%、Lines 100%；临时 coverage 目录已删除。
- `cd web-admin; yarn build`：通过，产物目录由项目脚本移动到 `build`；输出包含既有 `fs.F_OK` deprecation、Browserslist 过期提示和 bundle size 提示。

## 覆盖率对象

覆盖率统计对象为本 change 的实施代码：

- `web-admin/src/RoleEditPage.tsx`
- `web-admin/src/PermissionEditPage.tsx`

测试覆盖角色编辑加载、字段更新、保存、保存并退出、取消新增、删除、错误/空保护、移动端布局分支；覆盖权限编辑加载、模型加载、Application 资源加载、字段更新、保存、保存并退出、取消新增、删除、普通用户 submitter 限制、必填校验、审批状态、资源类型、分页选择器 fetch adapter、错误/空保护和移动端布局分支。

## 剩余风险

- focused Jest 使用 legacy React Testing Library 路径触发 React 18 `ReactDOM.render` warning；这是当前测试栈既有 warning，本 change 未升级测试基础设施。
- 构建输出提示 Browserslist 数据过期和 bundle size 偏大；这是项目既有构建提示，本 change 不修改依赖、包版本或拆包策略。
- 本 change 未做浏览器登录态或真实后端 E2E；本次迁移保持现有 API 调用边界，验证层级为源码、测试和构建。
