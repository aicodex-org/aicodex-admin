## 1. OpenSpec

- [x] 1.1 创建 proposal、design、tasks 和 spec delta，限定本 change 只迁移身份源中心。
- [x] 1.2 完成实施前 review，确认不触碰 Provider 管理页、登录、OIDC、组织同步密钥、同步器和后端契约。

## 2. 前端迁移

- [x] 2.1 将 `AuthSourceCenter.js` 迁移为 `AuthSourceCenter.tsx`，补齐局部 props、provider、状态卡片和风险项类型。
- [x] 2.2 将 `AuthSourceCenter.test.js` 迁移为 `AuthSourceCenter.test.tsx`，保留既有断言并适配 TSX 测试。
- [x] 2.3 确认 `ProviderListPage.js` 继续导入并渲染身份源中心，路由、权限、Provider 表格和诊断链接行为不变。

## 3. 验证与收口

- [x] 3.1 运行 `openspec validate migrate-auth-source-center-to-typescript --strict` 和 `git diff --check`。
- [x] 3.2 在 `web-admin` 运行增量 TypeScript 门禁、`yarn typecheck`、聚焦 Jest 和 `yarn build`。
- [x] 3.3 记录验证结果、覆盖率口径和剩余风险。
- [x] 3.4 完成归档前 review，并进入 archive / 单 commit closeout 流程，显式保持 `push_test=false`。
