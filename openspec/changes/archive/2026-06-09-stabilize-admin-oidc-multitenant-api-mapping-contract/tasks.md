## 1. Application 模式与授权入口

- [x] 1.1 在 application / client 模型中增加并固化 `organization_bound` 与 `shared_application` 两种组织解析模式，将既有 `IsShared` 仅作为迁移输入
- [x] 1.2 为 shared application 增加显式 allowed organization policy 或等价 application-organization binding 表，缺少显式允许范围时标记为待确认并 fail-closed
- [x] 1.3 明确 DCR client 默认注册为 `organization_bound`，并补充 DCR 请求、响应和测试，确认 DCR 不会生成未配置允许范围的 shared application
- [x] 1.4 调整 `/login/oauth/authorize`、`/api/get-app-login`、`GetApplicationByClientId` 和相关登录上下文逻辑，按 application 模式解析目标 organization
- [x] 1.5 封禁长期依赖 `clientId-org-*` 隐式解析 organization 的运行时路径；如需迁移旧 shared client，仅允许迁移阶段读取并转为显式 `organization` 参数和 allowed organization policy

## 2. Discovery、Token 和 UserInfo 契约

- [x] 2.1 统一全局 discovery 与 application-specific discovery 的 `issuer`、`jwks_uri`、userinfo endpoint 和 token endpoint 输出，收敛为单一 canonical issuer 的一致 metadata
- [x] 2.2 调整 `id_token` 契约，明确并实现稳定 `sub`、client `aud` 和 organization context 的输出语义
- [x] 2.3 调整 `access_token` 契约，移除 shared application 下把 organization 编入 `aud` 的长期语义，明确 `aud` 只表达 client 或资源受众
- [x] 2.4 调整 userinfo 契约，确保 `sub` / organization 与授权结果一致，并禁止 consumer 用 `aud`、邮箱、手机号、姓名、昵称或外部租户展示字段推断业务主体

## 3. Admin 到 API 的一等映射契约

- [x] 3.1 新增 `PlatformApiOrganizationMapping` 或等价一等映射对象，包含 `organizationId`、`apiOrganizationId`、`mappingStatus`、`mappingSource`、`lineage`、`createdAt` 和 `updatedAt`
- [x] 3.2 新增 `PlatformApiUserMapping` 或等价一等映射对象，包含 `organizationId`、`adminSubject`、`apiUserId`、`mappingStatus`、`mappingSource`、`lineage`、`createdAt` 和 `updatedAt`
- [x] 3.3 增加唯一性约束和持久化初始化，防止 `organizationId -> apiOrganizationId`、`adminSubject -> apiUserId`、`apiUserId -> adminSubject` 出现静默一对多或多对一
- [x] 3.4 增加后台管理 API 和最小后台配置入口，用于创建、确认、禁用和审计 api organization / api user 映射
- [x] 3.5 增加迁移服务或脚本，将旧 `aicodexApiOrganizationId`、`aicodexApiUserId`、`apiUserId`、`apiSubjectId` 等旧来源转换为候选映射对象；冲突数据进入 `PENDING_REVIEW` 或 `CONFLICTED`
- [x] 3.6 让 OIDC authorize / token / userinfo、Insight provider 和 gateway projection builder 统一消费同一映射解析面，移除长期双轨读取口径

## 4. Fail-Closed 与审计

- [x] 4.1 对面向 `aicodex-api` 的 application 增加 confirmed mapping gate：organization 映射或用户映射缺失、冲突、禁用或不可判定时拒绝成功授权
- [x] 4.2 增加 shared application 组织缺失、organization 越权、issuer 不一致、mapping untrusted 和 claim insufficiency 等错误语义与脱敏审计日志
- [x] 4.3 移除或封禁默认 organization 回退、默认用户回退、`clientId-org-*` 隐式 organization、手机号/邮箱/姓名/昵称 join 等兼容性补丁路径
- [x] 4.4 对 legacy `IsShared=true` 且未完成 allowed organization policy 迁移的 application 增加拒绝语义和审计事件

## 5. 脱敏 Fixture、测试与交接

- [x] 5.1 增加脱敏的 claim / userinfo 样例、shared application 正反例和映射失败负例，确保仓库内不出现真实地址、内网 IP、token、cookie、账号或客户端密钥
- [x] 5.2 补充自动化测试，覆盖 organization-bound / shared application / DCR 三种路径、canonical issuer metadata 一致性、userinfo 一致性、organization 越权、mapping 缺失与 weak-identifier fail-closed
- [x] 5.3 补充映射迁移、唯一性冲突、legacy shared application 待确认、gateway projection 改读一等映射对象的测试
- [x] 5.4 运行聚焦后端测试、前端配置入口测试、`openspec validate stabilize-admin-oidc-multitenant-api-mapping-contract --strict` 和 `git diff --check`
- [x] 5.5 整理给 `aicodex-api` 后续消费 change 的脱敏契约输入，包括 canonical issuer、claim 样例、userinfo 样例、mapping API/fixture 和 fail-closed 错误码
- [x] 5.6 在集中 docs 仓库补充 `API 网关映射` 运维指导文档，覆盖页面操作、字段来源、状态规则、验证方法、排障清单和安全注意事项
- [x] 5.7 补充 `lineage` 可用性约束：后台主流程不暴露 JSON 编辑，保存空血缘时系统自动生成脱敏默认血缘，已有迁移血缘不覆盖
- [x] 5.8 将后台映射配置入口拆成“平台组织映射”和“用户映射”两个 tab，用户映射改为服务端分页与关键字搜索，并修正同组织多用户映射的持久化唯一性约束
