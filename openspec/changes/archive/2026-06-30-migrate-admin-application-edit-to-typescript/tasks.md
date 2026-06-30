## 1. OpenSpec

- [x] 1.1 为 Application 编辑页 TSX 迁移创建 proposal、tasks 和 `web-admin-incremental-typescript` spec delta。
- [x] 1.2 运行 `openspec validate migrate-admin-application-edit-to-typescript --strict` 校验目标 change。

## 2. TypeScript migration

- [x] 2.1 将 `web-admin/src/ApplicationEditPage.js` 重命名为 `ApplicationEditPage.tsx`。
- [x] 2.2 为 props、state、应用记录、组织、Provider、证书、群组、后端响应和 legacy 动态值补充页面局部类型。
- [x] 2.3 保持 class component 行为、默认导出、无后缀 import 兼容、保存/删除/上传/预览/theme/SAML/Provider 绑定语义和后端 payload shape 不变。
- [x] 2.4 保持 auth 页面、provider 页面、共享表格、backend wrappers、全局壳层文件和无关页面在本 change 范围外。

## 3. Focused validation

- [x] 3.1 运行 Application 聚焦 Jest，覆盖应用列表、身份源绑定和应用接入菜单 import 路径。
- [x] 3.2 运行 `yarn typecheck`。
- [x] 3.3 运行 `node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`。
- [x] 3.4 运行 `yarn build`。
- [x] 3.5 运行 `git diff --check origin/hfl-test-base..HEAD`。

## 4. Release candidate handoff

- [x] 4.1 提交并推送 `hfl-test/migrate-admin-application-edit-to-typescript` 供 review。
- [x] 4.2 向主控线程回传 workspace path、change id、branch、HEAD/base、changed files、验证摘要、deferred 片段和剩余风险。
