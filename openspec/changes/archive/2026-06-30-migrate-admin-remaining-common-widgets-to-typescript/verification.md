## 验证摘要

本 change 将剩余 common widgets / modal / theme / select 目标文件机械迁移为 `.tsx`，并仅做 TypeScript、ESLint、Jest 和 build 所需的局部类型封边与 import 路径修正。未修改验证码、OAuth/SAML、发送验证码、分页选择、MFA notification、主题编辑、modal 确认/裁剪/人脸识别的用户可见行为或后端 API 契约。

## 命令结果

- `openspec validate migrate-admin-remaining-common-widgets-to-typescript --strict`
  - 结果：通过。
- `git diff --check origin/hfl-test-base..HEAD`
  - 结果：通过。
- `yarn typecheck`
  - 工作目录：`web-admin`
  - 结果：通过，`tsc --noEmit` 成功。
- `node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`
  - 工作目录：`web-admin`
  - 结果：通过。
- `yarn test --watchAll=false UserEditPage.test.tsx OrganizationEditPage.test.tsx ManagementPage.shell.test.tsx OrderPages.test.tsx RolePermissionEditPages.test.tsx TransactionPages.test.tsx`
  - 工作目录：`web-admin`
  - 结果：通过，6 个 suites / 70 个 tests 通过。
  - 说明：命令输出包含 React 18 下既有 `ReactDOM.render` deprecation warning，不影响本次 suite 结果。
- `yarn build`
  - 工作目录：`web-admin`
  - 结果：通过，`craco build` 编译成功并执行 `node mv.js`。
  - 说明：命令输出包含既有 `fs.F_OK` deprecation warning、`caniuse-lite` 过期提示和 bundle size warning；未出现本 change 引入的编译或 lint 失败。

## Focused Jest 选择

本批触碰文件存在调用方测试：

- `UserEditPage.test.tsx` 覆盖 `OAuthWidget`、`SamlWidget`、`AffiliationSelect`、`PasswordModal`、`ResetModal`、`CropperDivModal` 的调用面和 mock 路径。
- `OrganizationEditPage.test.tsx` 覆盖 `ThemeEditor` 调用面。
- `ManagementPage.shell.test.tsx` 覆盖 `EnableMfaNotification` mock 路径和 shell 测试入口。
- `OrderPages.test.tsx`、`RolePermissionEditPages.test.tsx`、`TransactionPages.test.tsx` 覆盖 `PaginateSelect` 调用面。

因此本 change 未使用 0-test Jest 结果作为通过证据。

## 覆盖率说明

未单独运行 coverage 命令。原因：本 change 是机械 JS -> TSX 迁移，不引入新业务分支；仓库当前没有针对这些 common widgets 的 changed-file coverage 门禁，且多数相关 focused tests 通过调用方 mock 验证模块路径和调用面。归档证据以真实 focused Jest、`yarn typecheck`、增量 TS gate 和生产 build 为主。

## Deferred 文件

无。P0 范围内 17 个目标文件均已完成迁移。

## 剩余风险

- 裁剪、人脸识别、第三方 captcha 和部分 legacy backend payload 仍通过 `LegacyAny` 封边，避免为了类型化重写运行时流程；这些组件的真实摄像头、第三方脚本和外部资源行为未在本地浏览器中重新 smoke。
- 本批未新增直接组件测试；回归保护主要来自调用方 focused Jest、类型检查、增量 TS gate 和生产 build。

## 脱敏检查

验证记录仅包含本地命令、文件名和测试结果，不包含 token、secret、Cookie、client secret、私有 URL、个人邮箱、手机号或其它敏感字段原值。
