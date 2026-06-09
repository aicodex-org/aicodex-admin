## Context

`aicodex-admin` 当前已经具备多组织登录页、组织默认应用、OAuth/OIDC 授权入口、DCR 和平台组织主模型等基础能力，能够承接“统一认证中心”角色；同时，`admin-organization-master-model` 已将 PlatformOrganization、PlatformUser、SourceConnection、ExternalIdentity、Lifecycle 和 scope/org version 收口为平台主模型。

当前缺口不是“能不能跳转登录页”，而是“登录成功后，`aicodex-api` 如何稳定知道这是哪个业务组织、哪个业务用户”。如果继续让下游依赖自由属性、人工配置或仅凭宽松 token 语义推断，后续会同时损坏三件事：

- 跨组织主体唯一性
- 网关授权与投影输入
- 审计与问题回溯

本 change 只解决 admin 作为统一 IdP 时的 OIDC 多组织接入与 admin/api 映射契约，不重开组织主模型、gateway 授权矩阵或 insight 报表主线。

## Goals / Non-Goals

**Goals:**

- 固化 organization-bound client、DCR client 和 shared application 三种接入模式的目标组织解析契约。
- 固化 discovery、`id_token`、`access_token` 和 `userinfo` 的 `iss`、`sub`、`aud`、organization、client 语义。
- 固化 `admin organization -> api organization UUID`、`admin user -> api user` 的权威映射来源、唯一性、状态和 fail-closed 语义。
- 明确 token claim 能表达什么、不能表达什么；当 claim 不足以完成业务映射时，必须依赖一等映射契约，而不是弱标识兜底。
- 让后续 `aicodex-api`、gateway projection 和审计链路都以同一稳定主体和同一组织映射口径消费 admin。
- 确保所有 proposal/design/spec/fixture/verification/联调脚本默认脱敏。

**Non-Goals:**

- 不重做 `admin-organization-master-model` 的全量组织模型。
- 不实现 `aicodex-api` 侧业务代码、gateway runtime allow/deny 或权限矩阵。
- 不恢复 insight 报表或扩展 insight provider。
- 不通过继续塞临时用户属性、弱标识 join 或默认组织回退来维持旧行为。
- 不把真实公网域名、内网 IP、token、cookie、账号、客户端密钥写入仓库。

## Decisions

### 1. 接入模式只保留两类主体语义：organization-bound 与 shared-application

OIDC 应用从组织解析角度只允许两种稳定模式：

- `organization_bound`
  - client 归属于单一平台 organization
  - 静态 client 与 DCR client 默认采用此模式
  - authorize 请求不得再额外覆盖 organization
- `shared_application`
  - 一个 client 可面向多个 organization
  - authorize 请求必须显式携带目标 `organization`
  - admin 必须通过显式 allowed organization policy 校验该 organization 是否可用于该 application

现有 `Application.IsShared` 只表示“共享应用”布尔值，但它没有标准的目标 organization 参数和组织允许范围语义。本 change 不再让 `IsShared=true` 隐式等于“所有组织都可用”。实施时应新增标准化的 application organization resolution policy：

- `organizationResolutionMode=organization_bound|shared_application`
- `allowedOrganizations[]` 或等价的 application-organization binding 表
- `mappingStatus` / enabled 状态和审计字段

迁移原则：

- `IsShared=false` 的既有 application 映射为 `organization_bound`。
- `IsShared=true` 且缺少显式 allowed organization policy 的既有 application 进入 `PENDING_REVIEW` 或等价未配置状态。
- 未配置 allowed organization policy 的 shared application 不得继续成功授权，直到管理员或迁移流程明确允许的 platform organizations。

选择理由：

- 这比“看 client_id 猜组织，猜不到再回退默认组织”更标准，也更容易审计。
- shared application 的组织目标由请求显式表达，避免把组织语义埋进回调地址、别名路由或临时参数拼接中。
- DCR 不再默认生成“共享但无组织解析策略”的 client，避免后续出现行为不确定的半成品应用。

备选方案：

- 继续允许 application 通过隐式规则解析 organization：拒绝。维护成本高，且难以证明跨组织唯一性。
- 把所有 application 都改成 shared：拒绝。多数场景本质是单组织接入，强行共享只会放大歧义。

### 2. issuer 使用单一 canonical issuer，discovery 与 token 语义必须完全一致

本 change 采用一个部署级 canonical issuer 作为 `aicodex-admin` 的统一 IdP 标识。

规则：

- 全局 discovery 和 application-specific discovery 可以并存。
- 但它们返回的 `issuer` 必须一致，统一为 canonical issuer。
- 标准 OIDC discovery 的 `jwks_uri` 必须与 canonical issuer 的签名密钥集合一致，不得因 application-specific discovery 返回不同 issuer metadata。
- `id_token`、`access_token` 绑定的 introspection / userinfo 语义必须与 discovery 中的 `issuer` 一致。
- 不允许 application-specific discovery 宣称一个 issuer，而实际 token 仍使用另一个全局 origin。

选择理由：

- 统一认证中心最稳定的建模方式是“一个 IdP，一个 issuer，多个 client / application / organization 上下文”。
- 这样 `sub` 的全局稳定性、审计聚合、consumer 校验和后续 projection 都更清晰。
- 可以直接消除当前“discovery 与 token issuer 可能不一致”的结构性风险。

备选方案：

- 每个 application 使用独立 issuer：拒绝。会把统一 IdP 再拆成多个主体命名空间，增加 consumer 校验复杂度。

### 3. token 只表达 admin 主体和登录组织上下文，不直接把 api 业务 ID 当成主身份

本 change 区分两层身份：

- `admin identity`
  - `sub` 表示稳定 admin subject
  - `organization` 表示本次登录上下文中的平台 organization
  - `aud` / `azp` 表示 client/application 身份
- `api business mapping`
  - `apiOrganizationId`
  - `apiUserId`
  - 其权威来源来自 admin 的一等映射契约

设计要求：

- `sub` 必须在 canonical issuer 内稳定唯一，不因组织别名、provider 或应用变化而重用到别的用户。
- `organization` 只表达平台组织上下文，不得偷换成外部租户 ID。
- `id_token.aud` 必须标识下游 OIDC client。
- `access_token.aud` 如表达资源受众，则必须按资源语义使用；不得再把它解释成 organization 或用户映射键。
- userinfo 返回的 `sub` 和 `organization` 必须与授权结果一致。
- `apiOrganizationId` / `apiUserId` 如后续需要作为衍生 claim 暴露，也只能是权威映射的镜像，不得成为唯一真相来源。

选择理由：

- 这比“把 `apiUserId` 塞进自由属性或临时 claim，谁用谁解析”更适合长期演进。
- admin token 保持身份层稳定，api 的业务 ID 则由映射层治理，职责更清楚。
- 后续如果 `aicodex-api` 内部模型调整，不必反向污染 OIDC 主体语义。

备选方案：

- 仅依赖 token claim 完成所有业务映射：拒绝。业务 ID 变化、修复和审计都不可控。
- 仅依赖 user attribute：拒绝。自由属性不是一等契约，容易继续演化成补丁堆。

### 4. admin -> api 映射必须升级为独立一等映射对象，不再依赖弱标识或散落属性

本 change 要求 `admin organization -> api organization UUID` 与 `admin user -> api user` 都来自独立 mapping object，而不是继续复用 User.Properties 或 Insight provider 的临时解析字段。

最小对象：

- `PlatformApiOrganizationMapping`
  - `organizationId`
  - `apiOrganizationId`
  - `mappingStatus`
  - `mappingSource`
  - `lineage`
  - `createdAt` / `updatedAt`
- `PlatformApiUserMapping`
  - `organizationId`
  - `adminSubject`
  - `apiUserId`
  - `mappingStatus`
  - `mappingSource`
  - `lineage`
  - `createdAt` / `updatedAt`

最低约束：

- 有稳定主键和唯一性约束
- 有 `mappingStatus`
- 有创建/更新时间、来源和审计信息
- 被 OIDC authorize、userinfo、后续 gateway projection 和 provider 共同消费
- `lineage` 是系统和迁移流程维护的诊断字段；后台页面主流程不得要求运维手写 JSON，人工新增或保存且血缘为空时由系统生成脱敏默认血缘。
- `apiOrganizationId` 的权威来源是 `aicodex-api` 组织主数据 UUID，即 API 侧 `aicodex_organizations.id`。API 管理后台组织列表当前展示的是组织 `code/name` 等运维字段，`default` 这类值是 organization code，不是 UUID；如 UI 未直接显示 UUID，应通过 API 侧 `GET /api/organization/` 响应中的 `data[].id` 或等价权威查询获取。
- 后台配置入口必须把“平台组织映射”和“用户映射”拆成独立 tab。组织映射通常按当前 organization 维护；用户映射可能随人数增长，必须支持服务端分页和按 `adminSubject` / `apiUserId` 关键字搜索，不能在一个页面首屏同时拉取全量用户映射。
- `PlatformApiUserMapping` 必须允许同一个 `organizationId` 下存在多个用户映射。持久化约束不得把 `organizationId` 做成单列唯一；同组织内 `adminSubject` 和 `apiUserId` 的唯一性由保存路径校验，避免多用户组织无法维护。

迁移原则：

- 旧 `aicodexApiOrganizationId` / `apiOrganizationId` 只作为迁移输入。
- 旧 `aicodexApiUserId` / `apiUserId` 只作为迁移输入。
- 迁移发现一对多、多对一、空值或冲突时，写入 `PENDING_REVIEW` / `CONFLICTED`，不得自动 confirmed。
- 如果测试环境已经用旧模型同步出 `PlatformApiUserMapping.organizationId` 的错误单列唯一索引，发布或联调前必须移除该错误索引并重新使用修正后的模型同步，不得通过限制每个组织只能维护一个用户映射来规避。
- gateway projection 当前从 `ExternalIdentity.Lineage` 和 `User.Properties` 解析 `apiSubjectId`；本 change 实施后必须改为读取新的 `PlatformApiUserMapping`，旧来源只在迁移任务中消费。

同时禁止：

- 用手机号、邮箱、姓名、昵称、部门名作为自动 join key
- 用“登录成功后发现没有映射，再回退默认组织/默认用户”补偿
- 让不同链路消费不同映射来源

选择理由：

- 只有一等映射契约才能成为跨服务共识。
- 它能把“是不是已映射”“由谁映射”“何时冲突”“何时失效”纳入审计，而不是散落在零碎字段里。

### 5. 面向 `aicodex-api` 的 OIDC 授权默认 fail-closed

当下游 application 明确依赖 `aicodex-api` 业务组织/用户映射时，admin 在以下场景必须拒绝完成成功授权：

- 目标 organization 无法确定
- 目标 organization 没有 confirmed `apiOrganizationId`
- 当前 admin user 没有 confirmed `apiUserId`
- 当前 token / userinfo 契约不足以和权威映射契约共同解析稳定主体
- mappingStatus 为 `PENDING_REVIEW`、`DUPLICATE`、`CONFLICTED` 或 `DISABLED`

选择理由：

- 登录成功但业务身份不确定，比直接失败更危险，因为会把歧义传播到 gateway、审计和数据访问层。
- fail-closed 虽然更严格，但它把问题暴露在入口，而不是留给下游做隐式猜测。

### 6. verification、fixture 和文档必须默认脱敏

本 change 的所有仓库内材料都使用占位符、环境别名和 synthetic 数据：

- endpoint 用环境变量或别名
- client / organization / user 用 synthetic ID
- token、cookie、账号、客户端密钥不入仓
- 真实运行证据只保留状态码、字段名、错误码和脱敏审计信号

选择理由：

- 这个 change 天然会接触认证入口和内网环境，默认脱敏必须成为规格的一部分，而不是联调后再补救。

## Risks / Trade-offs

- [shared application 比 organization-bound 更灵活，也更容易产生歧义] → 强制显式 `organization` 参数和 allowed organization policy 校验，缺失或歧义直接拒绝。
- [canonical issuer 与现有 application-specific discovery 口径不一致] → 在本 change 中先统一 discovery contract，再推进实现，不保留双口径长期共存。
- [将 api 映射提升为一等契约会暴露现有历史脏数据] → 明确 `mappingStatus` 和 fail-closed，让脏数据在入口被识别，而不是继续扩散。
- [下游希望继续直接吃旧属性或弱标识] → 在 spec 中明确禁止，把兼容性压力转成显式迁移任务，而不是隐式兼容逻辑。

## Migration Plan

1. 在 `aicodex-admin` 新建本 change 的 proposal/design/spec/tasks。
2. 先统一 spec 口径：
   - 应用接入模式
   - canonical issuer
   - token / userinfo 语义
   - 一等映射契约
   - fail-closed
3. 由后续 apply 阶段据此改造 admin 的 application / OIDC / mapping 相关实现与验证材料。
4. `aicodex-api` 后续以同一契约补消费端 change；在消费端完成前，不把旧弱标识行为重新包装成“兼容模式”。

## Current Status / Archive Readiness

截至 2026-06-09，admin 侧实现、页面、测试、60 环境部署和运维手册已经完成；API 侧也已补齐组织 UUID / 用户 ID 复制入口、用户所属组织维护和主组织 membership 同步，并已完成 review 与归档。因此，本 change 的核心结论可以表述为：

- `aicodex-admin` 作为统一 IdP 时，多组织 OIDC 接入到 `aicodex-api` 业务组织/用户映射的 admin 侧标准契约已经完备。
- 该完备性是“标准契约、管理入口、fail-closed gate、字段来源、运维流程和跨服务 ID 获取入口”层面的完备，不等于“全自动批量接入”或“首次 OIDC 登录自动完成 API 业务组织归属”。
- 大批量用户映射仍不应长期依赖逐个手工维护；后续可通过迁移候选、批量导入或 resolver change 继续降低运维成本。
- 归档前复查已补齐非页面 token 签发边界：`refresh_token` 按原 token 记录恢复 application organization 上下文，`password`、`implicit`、`token-exchange`、guest 和小程序签发路径在产生新 token 前统一执行组织解析与 `apiMappingRequired` gate，避免 shared application 使用持久化默认组织或间接 grant 绕过多租户映射契约。

60 环境在企业微信同步用户账密登录路径下复验后，补充运行态判断：

- 正确边界：`Require API mapping` 启用后，在缺少 confirmed 组织映射或用户映射时 fail-closed 是正确的多租户安全行为；admin 不应使用邮箱、手机号、姓名、昵称或部门名猜测 API 用户，也不应在映射缺失时回退默认组织或默认用户。
- 当前可运维路径：在首次接入时，可以先关闭 `Require API mapping`，让试点用户通过 API OIDC 登录触发 `aicodex-api` 自动创建本地用户和 OAuth binding，再由 API 侧确认或调整用户所属业务组织，最后回填 admin 用户映射并开启 gate。
- 非目标终态：当前 `aicodex-api` 首次 OIDC 自动建用户不会消费 admin confirmed `apiOrganizationId` 来决定 API 业务组织，实测新用户会先落到 API 默认组织。这不是多租户新企业接入的理想终态，只能作为现阶段可运维流程。
- 后续演进：如果要实现更标准的新企业接入体验，应另起 API provisioning / resolver change，让 API 首次登录显式消费 admin 组织上下文和映射契约，受控地把新用户创建到目标 API 业务组织，或在组织上下文不足、映射缺失、映射冲突时 fail-closed。

归档前建议补一轮完整“新公司接入”端到端 smoke，按集中运维文档 `docs/ops/aicodex-admin-api-tenant-mapping-ops.md` 的 `10.1 新公司首次接入通用流程` 执行。该 smoke 的目标不是再改契约，而是形成最终运行态证据：

1. admin 侧准备一个新平台组织和至少一个测试用户。
2. API 侧准备对应业务组织，并复制 API 组织 UUID 与测试用户 ID。
3. admin `API 网关映射` 页面录入组织映射和用户映射，从 `PENDING_REVIEW` 核对后改为 `CONFIRMED`。
4. 面向 API 的 OIDC application 开启 `Require API mapping`。
5. 验证 confirmed 用户可完成 OIDC 登录，缺少用户映射或非 confirmed 映射用户会被 fail-closed。
6. 验证日志只包含脱敏审计信号，不写入 token、cookie、密码、Client Secret、真实账号凭据或完整认证头。

如果本轮 smoke 只在 60 测试环境执行，验证记录必须继续使用 `<deploy60-*>`、synthetic organization / user / client 等脱敏占位表达，不把真实地址、内网 IP、账号、token、cookie 或客户端密钥写入仓库。

## Open Questions

- 无阻塞性开放问题。本 change 直接把“单 issuer、显式 organization、第一类映射契约、默认 fail-closed”作为标准路线，不为旧口径保留长期双轨。
