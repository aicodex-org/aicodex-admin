## 验证摘要

本 change 已完成低风险共享 UI primitives、select/modal/table 小组件的 TS/TSX 迁移。迁移保持 extensionless import、现有 props、表格行编辑、选择器查询、弹窗提交和测试行为兼容；未进行浏览器 smoke，因为本批为机械迁移且没有刻意改变 UI/交互语义。

## 已运行命令

- `openspec validate migrate-admin-shared-ui-primitives-to-typescript --strict`
  - 结果：通过。
- `git diff --check`
  - 结果：通过。
- `yarn typecheck`
  - 目录：`web-admin`
  - 结果：通过，`tsc --noEmit` 成功。
- `node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`
  - 目录：`web-admin`
  - 结果：通过。
- `CI=true yarn test --watchAll=false --runInBand NavItemTree.test.tsx OrganizationSelect.test.tsx TablePagination.test.tsx`
  - 目录：`web-admin`
  - 结果：通过，3 suites / 8 tests passed。
  - 备注：该命令在补充 `NavItemTree` wrapper 断言后复跑，覆盖迁移后的 existing focused test 路径。
- `CI=true yarn test --watchAll=false --runInBand --coverage --collectCoverageFrom=src/common/NavItemTree.tsx --collectCoverageFrom=src/common/select/OrganizationSelect.tsx --collectCoverageFrom=src/common/table/TablePagination.tsx NavItemTree.test.tsx OrganizationSelect.test.tsx TablePagination.test.tsx`
  - 目录：`web-admin`
  - 结果：通过，3 suites / 8 tests passed。
  - 覆盖率对象：本 change 已有 focused tests 覆盖的 `NavItemTree.tsx`、`OrganizationSelect.tsx`、`TablePagination.tsx`。
  - 覆盖率结果：All files statements 95.83%、lines 95.55%、functions 94.73%、branches 67.85%；`NavItemTree.tsx` 和 `TablePagination.tsx` lines 100%，`OrganizationSelect.tsx` lines 94.28%。
  - 备注：`OrganizationSelect.test.tsx` 输出 React 18 下 testing-library 旧 `ReactDOM.render` warning，为项目现有测试库行为，不影响断言结果。
- `yarn build`
  - 目录：`web-admin`
  - 结果：通过，CRACO production build 成功并生成 `build`。
  - 备注：输出既有 `fs.F_OK` deprecation、Browserslist outdated 和 bundle size warning；本 change 未更新依赖或 Browserslist 数据。

## Deferred 文件

以下候选文件仍保持 legacy JS，原因是迁移会牵出认证、媒体、裁剪、协议、密码或分页选择链路，超出本批低风险机械迁移边界：

- `web-admin/src/common/CaptchaWidget.js`
- `web-admin/src/common/OAuthWidget.js`
- `web-admin/src/common/SamlWidget.js`
- `web-admin/src/common/PaginateSelect.js`
- `web-admin/src/common/select/AffiliationSelect.js`
- `web-admin/src/common/modal/AgreementModal.js`
- `web-admin/src/common/modal/CropperDivModal.js`
- `web-admin/src/common/modal/FaceRecognitionCommonModal.js`
- `web-admin/src/common/modal/FaceRecognitionModal.js`
- `web-admin/src/common/modal/PasswordModal.js`
- `web-admin/src/common/modal/ResetModal.js`

## 剩余风险

- 未触碰 `ProviderTable`、`SyncerTableColumnTable`、auth 主流程、页面级业务组件、后端 wrapper、真实认证/OIDC/Gateway 行为。
- 未运行浏览器 smoke；本批验证覆盖 OpenSpec、TS 类型检查、增量 TS gate、focused Jest 和 production build。
- 覆盖率统计为已有 focused tests 对应组件的文件级覆盖，不代表所有机械迁移文件均已有高覆盖单测；其余迁移文件依赖 TypeScript、增量 TS gate、production build 和保留导出路径来验证 JS/TS 共存兼容。
