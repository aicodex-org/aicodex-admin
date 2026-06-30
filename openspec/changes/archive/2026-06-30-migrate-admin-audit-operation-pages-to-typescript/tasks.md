## 1. Baseline 与影响面核对

- [x] 1.1 运行审计运维聚焦 Jest 和 `yarn typecheck`，记录迁移前 baseline 或 red 信号
- [x] 1.2 将 OpenSpec proposal/design/spec/tasks 从 audit-only 更新为 Admin 核心后台路由页面 batch scope
- [x] 1.3 盘点审计运维四页的 props、state、record 字段、分页、筛选和后端响应读取点
- [x] 1.4 盘点新增中小编辑/同步页、身份控制台总览页和可顺手小页面的路由依赖、测试覆盖和外部类型边界
- [x] 1.5 确认 `ManagementPage` 无后缀 import、共享列表壳、聚焦测试和 legacy `BaseListPage.js` 共存边界

## 2. 审计运维列表页 TSX 迁移

- [x] 2.1 将 `RecordListPage.js` 迁移为 `RecordListPage.tsx`，保留操作日志查询、排序、详情抽屉、复制和脱敏展示行为
- [x] 2.2 将 `SessionListPage.js` 迁移为 `SessionListPage.tsx`，保留登录会话用户/应用展示、session id 收敛、单会话踢出和行级删除行为
- [x] 2.3 将 `TokenListPage.js` 迁移为 `TokenListPage.tsx`，保留令牌查询、新增/编辑/删除入口、敏感 token 不直接展示和分页行为
- [x] 2.4 将 `VerificationListPage.js` 迁移为 `VerificationListPage.tsx`，保留验证码记录查询、状态展示、敏感验证码不直接展示和分页行为
- [x] 2.5 如触碰聚焦测试，将相关 `.test.js` 迁移为 `.test.tsx`，并保持既有行为断言

## 3. 中小编辑/同步页 TSX 迁移

- [x] 3.1 将 `CertEditPage.js`、`KeyEditPage.js`、`TokenEditPage.js` 迁移为 `.tsx`，保留加载、保存、删除、跳转和敏感字段行为
- [x] 3.2 将 `LdapEditPage.js`、`LdapSyncPage.js`、`WebhookEditPage.js` 迁移为 `.tsx`，保留连接、同步、保存、删除和错误提示行为
- [x] 3.3 将 `IdentityConsoleOverview.js` 迁移为 `.tsx`，如触碰测试则迁移 `IdentityConsoleOverview.test.js`
- [x] 3.4 评估并迁移低风险小型路由/页面壳；已迁移 `account/AccountPage`，`EntryPage`、`CaptchaPage`、`QrCodePage` 因触及登录/验证码/支付跳转链路 deferred，`basic/AppListPage`、`basic/Dashboard` 因牵引应用过滤/dashboard 图表和 tour 逻辑 deferred

## 4. 类型边界与验证

- [x] 4.1 对 legacy JS 父类、后端 wrapper 和动态字段补最小局部类型或断言，不引入全局宽松类型或无关重构
- [x] 4.2 运行 `openspec validate migrate-admin-audit-operation-pages-to-typescript --strict`
- [x] 4.3 运行聚焦 Jest，覆盖审计运维列表、`IdentityConsoleOverview` 和触碰页面可用现有测试
- [x] 4.4 运行 `yarn typecheck`、增量 TypeScript gate、`git diff --check origin/hfl-test-base..HEAD` 和 `yarn build`
- [x] 4.5 确认没有截图、coverage、build 或本地临时产物入库，并以 release candidate 形式提交和推送工作分支
