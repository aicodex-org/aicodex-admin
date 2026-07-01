## 验证环境

- 工作区：`D:\CodeRepo\LeagProject\aicodex-2\aicodex-admin`
- 分支：`hfl-test/stabilize-admin-identity-object-edit-layout`
- 基线：`origin/hfl-test-base`
- 验证日期：2026-07-01

## 自动化验证

- `openspec validate stabilize-admin-identity-object-edit-layout --strict`：通过。
- `openspec validate --changes --strict`：通过，4 个 active changes 全部有效。
- `openspec validate --specs --strict`：通过，30 个主规格全部有效。
- `git diff --check origin/hfl-test-base...HEAD`：通过。
- `web-admin > node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`：通过。
- `web-admin > yarn typecheck`：通过。
- `web-admin > yarn test --watchAll=false --runInBand IdentityObjectEditFormLayout.test.ts GroupEditPage.test.tsx InvitationEditPage.test.tsx RolePermissionEditPages.test.tsx ModelPages.test.tsx SystemToolsMenuPages.test.tsx`：通过，6 个 suite / 70 个 tests 通过。输出包含既有 React 18 `ReactDOM.render`、`act` 和 fake timer 警告，本次未新增失败。
- `web-admin > yarn build`：通过。输出包含既有 `fs.F_OK` deprecation、Browserslist 过期提示和 bundle size 提示。

## 覆盖率

- 命令：`web-admin > yarn test --coverage --watchAll=false --runInBand IdentityObjectEditFormLayout.test.ts GroupEditPage.test.tsx InvitationEditPage.test.tsx RolePermissionEditPages.test.tsx ModelPages.test.tsx SystemToolsMenuPages.test.tsx --collectCoverageFrom=src/GroupEditPage.tsx --collectCoverageFrom=src/RoleEditPage.tsx --collectCoverageFrom=src/PermissionEditPage.tsx --collectCoverageFrom=src/InvitationEditPage.tsx --collectCoverageFrom=src/FormEditPage.tsx --collectCoverageFrom=src/ModelEditPage.tsx`
- 结果：通过，6 个 suite / 70 个 tests 通过。
- 统计对象：本 change 触碰的 6 个实现页。
- 行覆盖率：`FormEditPage.tsx` 86.20%，`GroupEditPage.tsx` 98.68%，`InvitationEditPage.tsx` 87.25%，`ModelEditPage.tsx` 89.23%，`PermissionEditPage.tsx` 100%，`RoleEditPage.tsx` 100%。受影响实现文件均超过 85%。

## 浏览器布局 Smoke

- 工具：Playwright CLI，1280x900 viewport。
- 方式：本地 `127.0.0.1` 临时静态服务器加载脱敏静态 DOM fixture；fixture 只包含示例对象名和 `operator@example.test` 占位邮箱，不连接后端，不使用 token、Cookie、真实账号或私有 URL。
- 口径：布局 smoke，只验证 scoped CSS 下 label/control 布局和页面级 overflow；不证明实时后端保存链路。
- 结果：通过。
- DOM 指标：`documentClientWidth=1280`，`documentScrollWidth=1280`，`pageClientWidth=1280`，`pageScrollWidth=1280`，`rowCount=10`，`labelMin=184`，`labelMax=184`，`controlMin=398`，`rowOverflowMax=0`。
- 卡片指标：Group / Role / Permission / Invitation / Form / Model 六个静态卡片宽度均为 616px，card overflow 均为 0。
- Console：0 errors，0 warnings。
- 清理：已关闭 Playwright browser，停止临时静态服务器，并删除本次临时 fixture 与 CLI snapshot/log。

## 剩余风险

- 浏览器 smoke 使用静态 DOM fixture，未覆盖真实后端数据、保存 API、权限模型或对象关系链路；本 change 也未修改这些行为。
- Jest 输出中存在项目既有 React 18 测试环境警告；本次 change 未处理测试基础设施。
