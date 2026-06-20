## 验证概览

本 change 只迁移 `RoleListPage` 和 `PermissionListPage` 两个列表页到 TSX，并新增 focused `.test.tsx`。验证证据覆盖 OpenSpec、增量 TypeScript 规则、类型检查、列表页行为测试、changed-file coverage 和 build/import 边界。

## RED / GREEN

- RED：`cd web-admin; yarn test --watchAll=false --runInBand --runTestsByPath src/RolePermissionListPages.test.tsx`
  - 首次运行失败，原因为 `RoleListPage.tsx` / `PermissionListPage.tsx` 尚不存在。
  - 修正测试中审批状态中文匹配后，RED 只剩 TSX 文件不存在这一项迁移缺口。
- GREEN：完成 `.js` 到 `.tsx` 迁移和局部类型补充后，同一 focused Jest 测试通过。

## OpenSpec 与 Diff

- `openspec validate migrate-authorization-role-permission-list-pages-to-typescript --strict`：通过，`Change 'migrate-authorization-role-permission-list-pages-to-typescript' is valid`。
- `openspec validate --changes --strict`：通过，5 个 active changes passed，0 failed。
- `openspec validate --specs --strict`：通过，26 个 specs passed，0 failed。
- `git diff --check`：通过，无输出。

## 前端门禁

- `cd web-admin; node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`：通过，退出码 0。
- `cd web-admin; yarn typecheck`：通过，`tsc --noEmit` 退出码 0。
- `cd web-admin; yarn build`：通过，`Compiled successfully`，随后 `mv.js` 将 `build-temp` 重命名为 `build` 成功。

## Focused Jest 与 Coverage

- `cd web-admin; yarn test --coverage --watchAll=false --runInBand --runTestsByPath src/RolePermissionListPages.test.tsx --collectCoverageFrom=src/RoleListPage.tsx --collectCoverageFrom=src/PermissionListPage.tsx --coverageReporters=text-summary --coverageReporters=json-summary`
  - 结果：13 tests passed，1 test suite passed。
  - 统计对象：`src/RoleListPage.tsx`、`src/PermissionListPage.tsx`。
  - 覆盖率：Statements 96.21%，Branches 85.34%，Functions 92.3%，Lines 96.12%。
  - 覆盖内容：TSX 文件迁移断言、默认新增对象、添加跳转、删除刷新、fetch 参数、权限 denied fallback、非本地管理员 submitter fetch、表格列链接/状态/effect/action 渲染、模板生成、上传预览、上传成功/失败和错误提示分支。

## Warning 记录

- Jest 输出 React 18 `ReactDOM.render is no longer supported` warning，来源于当前测试栈 `@testing-library/react` legacy render 行为；本 change 未升级测试库或 React root API。
- `yarn build` 输出 `fs.F_OK` deprecation、Browserslist `caniuse-lite is outdated` 和 CRA bundle-size warning；这些属于现有依赖/构建基线 warning，本 change 未引入新依赖或构建配置修改。

## 运行态验收口径

- 本 change 未修改后端、认证、权限模型、API endpoint 或真实数据写入语义。
- 验收证据为源码级和 build/import 边界验证；未执行浏览器手工流或真实上传接口调用。
- `.xlsx` 上传通过 mock `FileReader`、`xlsx` 和 `fetch` 验证本地预览、FormData 提交调用和成功/失败回调，不作为真实后端上传链路验收。

## 归档前 Review

- OpenSpec 文档语言：已检查 `proposal.md`、`design.md`、`tasks.md`、`verification.md` 和 delta spec，说明性正文以简体中文为主；OpenSpec 固定标题、规范关键字、命令、路径、测试名和技术名词保留英文。
- 验证记录脱敏：未记录真实环境 IP、私有 URL、凭据、token、Cookie、账号密码或私有连接串。
- 注释 Review：新增注释集中在 `BaseListPage` legacy 继承边界，解释局部类型断言原因；其它新增类型和 helper 为页面内直接类型化，不需要额外业务注释。
- 主规格同步：`openspec archive migrate-authorization-role-permission-list-pages-to-typescript -y` 将把 delta requirement 同步到 `openspec/specs/web-admin-incremental-typescript/spec.md`。
- 交付单元：当前基于 `origin/hfl-test-base`，归档和最终验证后需收敛为工作分支上的 1 个本 change commit；由于 closeout mode 未明确授权 self-closeout，不自行 push/merge `hfl-test-base`。

## 剩余风险

- `RoleEditPage`、`PermissionEditPage`、Casbin 适配器、Casbin 执行器和 `PolicyTable` 仍未迁移，属于后续独立 change。
- `BaseListPage`、`Setting`、`Conf`、`RoleBackend`、`PermissionBackend` 仍为 legacy JS；本 change 仅在两个迁移页内用局部类型包住实际依赖边界。
