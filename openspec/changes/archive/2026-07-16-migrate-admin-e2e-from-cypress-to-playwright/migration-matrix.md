# Cypress → Playwright 迁移矩阵

## 基线

- Cypress：19 个 `*.cy.ts`、19 个 `describe`、22 个 `it`。
- 控制流：0 个 skip、0 个 only、0 个 intercept、0 个 after/cleanup。
- 端口：Cypress config/support/spec 共 80 处 `http://localhost:7001`，0 处 `7002`；所有访问都使用绝对 URL，`baseUrl` 未形成单一真值。
- 重试：run mode 2 次，open mode 0 次。
- 数据：5 个测试真实创建记录；Syncer 新增只写 history state；其余为登录、读取与路由行为。
- 覆盖限制：没有表单编辑/保存、删除或空态断言；错误态仅为 API/UI 登录失败。

## 逐测试对照

| # | Cypress spec / test | 既有行为与断言 | 数据/副作用 | Playwright 对应 |
|---:|---|---|---|---|
| 1 | `adapter.cy.ts` / `test adapter` | UI 登录；访问 `/adapters` 精确断言；点击新增；断言 URL 包含 `/adapters/built-in/` | 读取 adapter；真实创建随机 Adapter | `adapter.spec.ts`，保留两条 URL 断言；仅临时库执行 |
| 2 | `application.cy.ts` / `test aplication` | UI 登录；访问根、`/applications`、built-in 详情；列表和详情 URL 精确断言 | built-in application 只读 | `application.spec.ts`，保留历史标题与两条断言 |
| 3 | `certs.cy.ts` / `test certs` | UI 登录；访问根、`/certs`、`/certs/cert-built-in`；两条精确断言 | built-in cert 只读 | `certs.spec.ts` |
| 4 | `login.cy.ts` / `Login succeeded` | POST `/api/login`，断言 HTTP 成功与 body `status=ok` | 创建临时认证 session | `login.spec.ts`，使用 `request.post` |
| 5 | `login.cy.ts` / `ui Login succeeded` | UI 输入 fixture 凭据并提交，断言根 URL | 创建临时认证 session | `login.spec.ts`，不得用 API 登录替代 |
| 6 | `login.cy.ts` / `Login failed` | POST 错误密码，断言 HTTP 成功与 body `status=error` | 无成功 session | `login.spec.ts` |
| 7 | `login.cy.ts` / `ui Login failed` | UI 输入错误密码并提交，断言 `/login` | 无业务写入 | `login.spec.ts` |
| 8 | `models.cy.ts` / `test org` | UI 登录；访问根、`/models`、built-in model；两条精确断言 | built-in model 只读 | `models.spec.ts`，保留历史测试名 |
| 9 | `orgnazition.cy.ts` / `test org` | UI 登录；依次访问组织列表、built-in 详情、users 子页；三条精确断言 | built-in organization/user 只读 | `orgnazition.spec.ts`，保留历史拼写与三段路由 |
| 10 | `payments.cy.ts` / `test payments` | UI 登录；列表 URL 精确断言；点击新增；断言 `/payments/` | 真实创建随机 Payment | `payments.spec.ts`；仅临时库执行 |
| 11 | `permissions.cy.ts` / `test permissions` | UI 登录；访问列表和 built-in permission；两条精确断言 | built-in permission/model/application 只读 | `permissions.spec.ts` |
| 12 | `products.cy.ts` / `test products` | UI 登录；列表 URL 精确断言；点击新增；断言 `/products/` | 真实创建随机 Product | `products.spec.ts`；仅临时库执行 |
| 13 | `providers.cy.ts` / `test providers` | UI 登录；访问列表和默认 captcha provider；两条精确断言 | 默认 provider 只读 | `providers.spec.ts` |
| 14 | `records.cy.ts` / `test records` | UI 登录；访问根和 `/records`；精确断言 | records 只读 | `records.spec.ts` |
| 15 | `resource.cy.ts` / `test resource` | UI 登录；访问根和 `/resources`；精确断言 | resources 只读 | `resource.spec.ts`，保留历史单数文件名 |
| 16 | `role.cy.ts` / `test role` | UI 登录；访问根和 `/roles`；精确断言 | roles 只读 | `role.spec.ts` |
| 17 | `sessions.cy.ts` / `test sessions` | UI 登录；访问根和 `/sessions`；精确断言 | sessions 只读 | `sessions.spec.ts` |
| 18 | `syncers.cy.ts` / `test syncers` | UI 登录；列表 URL 精确断言；点击新增；断言 `/syncers/` | 只创建客户端 history 草稿，不调用 add API | `syncers.spec.ts`，保持非持久化语义 |
| 19 | `sysinfo.cy.ts` / `test sysinfo` | UI 登录；访问根和 `/sysinfo`；精确断言 | system/version/prometheus 只读 | `sysinfo.spec.ts`，测试结束即关闭独立 page/context |
| 20 | `tokens.cy.ts` / `test records` | UI 登录；列表 URL 精确断言；点击新增；断言 `/tokens/` | 真实创建随机 Token；不得记录 material | `tokens.spec.ts`，保留历史测试名；仅临时库执行 |
| 21 | `user.cy.ts` / `test user` | UI 登录；访问用户列表和 built-in admin；两条精确断言 | built-in user 只读 | `user.spec.ts` |
| 22 | `webhooks.cy.ts` / `test webhooks` | UI 登录；访问 `/webhooks`；精确断言；点击新增；断言 `/webhooks/` | 真实创建并启用示例 Webhook | `webhooks.spec.ts`；仅临时库执行，整库销毁 |

## 等价与运行边界

- Playwright discovery 必须保持 19 个 spec / 22 个 test，0 skip/only。
- 18 个受保护路由测试继续逐 test 真实 UI 登录并断言根 URL；API/UI 登录成功/失败 4 条继续独立执行。
- 所有 URL 改为相对路径，由 typed `baseURL=http://127.0.0.1:7002` 提供唯一端口真值；这是端口缺陷修复，不是断言弱化。
- 5 条持久化测试不扩大 mock、不改为纯导航；只允许在 job-scoped MySQL 或本地临时 SQLite 中运行，结束后销毁整库。
- 可以增加低脆弱性的页面加载信号，但不得删除或替换矩阵中的精确/包含型 URL 断言。
- 迁移验收不得宣称已覆盖不存在的编辑/保存、删除或空态场景。
