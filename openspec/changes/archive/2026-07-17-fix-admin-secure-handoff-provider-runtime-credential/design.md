## Context

secure handoff grant 目前先调用默认 issuer 生成无语义的 `adm-<random>`，再持久化 grant。redeem 将该材料返回一次，confirm 清空材料。这个值既不在 OAuth `Token` 表，也不包含可供 Provider 验证的身份或授权声明。与此同时，`AutoSigninFilter` 位于 router/controller 前，会对任意 Bearer 调用 `GetTokenByAccessToken`，失败时通过 `responseError` 输出未设置 HTTP status 的通用 JSON。结果是 Provider controller 的既有 `InsightProviderEnvelope`、401/403、JWT signature 与 typed `insight_provider_trust` 校验均没有机会执行。

Provider runtime credential 必须同时满足两个生命周期：grant envelope 仍是短 TTL、一次性兑换；兑换后的运行凭据则需要在独立的有界有效期内重复调用只读 Provider API。它还必须在 operator revoke 后实时失效，不能只依赖无状态签名 token。创建组合包的调用人已经通过 `requireServiceCredentialGovernanceGlobalAdmin` 鉴权，因此可作为 runtime credential 的 Admin subject，但该 subject 不得由请求 JSON 自行指定。

首轮 RC 在 60 的真实链路证明 credential 已能通过 filter 并到达 Provider controller，但内置全局管理员创建的 credential 仍把 `user.Owner=built-in` 当成 scope/tree 组织，同时 current-user 把个人映射 `MISSING` 错误提升为 503。主规格明确 current-user 缺少个人用量映射时应返回诊断成功；真正的报表授权边界是 scope。现有 grant 只有 target registration/workspace/environment，`TargetWorkspaceId` 是 Insight consumer workspace alias，不是 Admin 业务组织，也没有 delegated subject 或其它可信 target context 可以复用。

## Goals / Non-Goals

**Goals:**

- 让默认 secure-handoff redeem material 成为三个 Insight Admin Provider 只读路径可用的真实运行态凭据。
- 将凭据绑定到创建者 subject、grant issuer/audience、固定 Provider scopes、target registration/workspace/environment/provider、grant id 与独立 expiry。
- 在每次请求上校验 verifier 和 grant 当前状态，使 revoked、expired、failed、未 confirm、篡改与错误 target fail closed。
- 保持 typed `insight_provider_trust` 是 audience/issuer/scope 的最终策略边界，saved disabled/store error/invalid resolution 不降级。
- 保持一次 redeem/confirm、nonce、grant TTL、operator 包脱敏和 raw material 不可重取。
- 让 Provider 路径的无效 Bearer 稳定返回 HTTP 401/403 `InsightProviderEnvelope`。
- 由已鉴权全局管理员显式选择一个存在且非 `built-in` 的业务 target organization，并将其绑定到 grant、credential claim 和 auth context。
- handoff credential 的 current-user、scope、organization-tree 只使用已验证 target organization；任何 query 都不能覆盖它。
- current-user 对个人映射 `MISSING` 返回成功诊断，但 `INVALID`、`AMBIGUOUS`、认证/信任失败继续 fail closed。

**Non-Goals:**

- 不让 handoff credential 创建普通 Beego session、OAuth token row 或浏览器登录态。
- 不接受任意 `adm-*`、不按字符串前缀授予权限、不扩大到三个 Provider 路径之外。
- 不引入 delegated user impersonation，不信任 Insight 自报 organization，不把 `built-in` 或 workspace alias 当业务组织。
- 不改变 Provider 路径、scope 的 `SELF/CUSTOM_USERS` fail-closed、聚合 scope 的 confirmed-member 过滤或 runtime config resolution。
- 不在本 change 中增加 credential refresh/rotation API；到期后由 operator 重新生成并交接包。
- 不修改 schema registry、migration、`ormer.go`、前端 package/lockfile/构建基础设施或 `test` 分支；前端只增加既有接入包流程内的最小组织选择。

## Decisions

### 1. 使用持久化 verifier 的 opaque runtime credential

默认 issuer 生成高熵 credential，值由固定版本前缀、base64url 编码的最小 claims 与随机 secret 组成。v2 claims包含grant id、issuer、subject、audience、固定scope集合、target registration/workspace/organization/environment/provider、package hash、issued-at、expiry和credential id。它不是OAuth access token，也不会写入OAuth token表。

`CreateGrant` 在调用 issuer 前生成 grant id、grant expiry 和内部 subject；subject 由 controller 从已鉴权的 `GetSessionUsername()` 注入，字段使用 `json:"-"`，外部请求无法指定。runtime credential 使用独立的 30 天有界有效期，避免把十分钟左右的 grant 兑换窗口误当作 Profile 的运行寿命。该有效期是服务端常量并可通过测试时钟验证；本 change 不新增可被错误配置成无限期的开关。

备选一是直接签发现有 OAuth/JWT。该方案需要把 handoff audience 映射为具体 Application/cert，并仍需额外 grant lookup 才能实时撤销；当前 grant audience 是 owner registry 合约值而不保证是 OAuth client id，因此不采用。备选二是只存随机 opaque 值并按值查库。confirm 现有契约会清空 raw material，且按明文查找会延长 secret at rest 生命周期，因此不采用。备选三是无状态自签名 JWT。它无法在不增加 denylist 的情况下实时响应 revoke，因此不采用。

### 2. redeem 原子地把 raw material 替换为 verifier digest

grant `issued` 阶段仍需短暂保存 raw credential，才能完成一次 server-to-server redeem。成功 redeem 时，服务先保留本次响应值，再把持久化字段替换为带版本标识的 SHA-256 verifier digest并保存 `delivered`；之后 status、重放 redeem 和数据库读取都不能恢复 raw material。confirm 只把状态改为 `confirmed`，保留 verifier digest供运行时验证；revoke/fail 可清除 verifier并依赖 closed state fail closed。

不增加新 schema 列：现有 `CredentialMaterial` 是 `json:"-"` 的 server-only 字段，redeem 后它的语义收窄为不可逆 verifier。所有 operator-facing response 继续只显示既有 suffix/reference/trace/status，且不得显示 token hash 或 verifier digest。

### 3. runtime validator 同时验证 exact material、grant state 和目标 claims

validator 先严格解析版本化 credential，再按 claims 中的 grant id读取 grant；随后使用常量时间比较 presented credential digest 与 persisted verifier。只有 `confirmed` grant 可用于 Provider 调用。validator 还必须逐项核对：

- record issuer 与 claims issuer；
- record audience 与 claims audience；
- record target registration/workspace/environment/provider 与 claims；
- record package hash与claims package hash；target organization只存在于已验证v2 claims，package hash在创建时同时绑定metadata与target；
- claims subject 非空且来自创建者；
- 固定 Provider scopes 完整；
- issued-at/expiry 合法，当前时间未到期；
- credential id/grant id一致；
- grant 未 revoked、failed、expired 或处于 issued/delivered。

因此只修改 payload target、复用其它 grant 的 payload/secret、使用未 confirm credential、过期或 revoke 都会被拒绝。runtime credential 可以重复用于只读 Provider 请求；“replay blocked”仍指 grant redeem 的一次性语义，不把合法多次 API 调用误判为重放。

### 4. AutoSigninFilter 只为三个精确 Provider 路径执行专用认证分流

filter 用精确 path allowlist 识别 `current-user`、`current-user/scope`、`current-user/organization-tree`：

1. 无 Bearer 时不创建身份，由 controller 按 session/missing-token 契约处理。
2. 版本化 handoff credential 必须调用专用 validator；成功后把只读 auth claims 放入 Beego request context，失败立即返回稳定 Provider envelope并停止链路。
3. 非 handoff Bearer 不查 OAuth token 表，而是显式交给 Provider controller 的既有 JWT signature/application/trust 校验；这不是未验证放行，controller 仍是 JWT verifier。
4. 其它所有路径保持现有 organization sync key、OAuth token与 session逻辑不变。

filter 不能导入 controllers 形成循环依赖，因此在 routers 包内写入与公开 Provider contract 同形的最小 error envelope，错误 code 仅使用 `UNAUTHENTICATED` 或 `AUTHORIZATION_FAILED`，HTTP status 使用 401/403，trace id 只采用请求的脱敏 trace header或新生成短 marker，不记录 credential/error raw text。

### 5. controller 在同一 typed trust snapshot 上授权 handoff claims

`requireInsightProviderUser` 优先读取 filter 写入的 handoff auth context。它对该次请求只解析一次 `insight_provider_trust`，并调用现有 `isInsightProviderTrustPolicyReady`、audience、issuer、required scope helpers。policy saved disabled、store unavailable、字段 invalid 或 audience/issuer/scope 不匹配时返回 `AUTHORIZATION_FAILED`，绝不回退 legacy env/config。

策略通过后，controller 按 subject 读取真实 Admin user并执行现有 active-user 校验，再进入 current-user/scope/tree 原业务路径。三个入口必须按 `getInsightProviderHTTPStatus` 映射认证错误：credential/JWT无效为401，typed trust拒绝为403，不能继续把所有 `requireInsightProviderUser` 错误硬编码成401。普通 JWT 分支保持现有签名、Application、subject 与 trust snapshot 行为。

### 6. 测试以完整 HTTP 链路固定契约

新增隔离的 Beego test handler/router，把 `AutoSigninFilter` 注册在 controller 前，使用内存 grant store、可控时钟和对象/controller seams：

- 创建者生成 grant → redeem → confirm → 使用 material 请求 current-user 与 scope，断言经过 filter/controller 且 HTTP 200 success envelope；
- 任意错误 Bearer 返回 HTTP 401 `InsightProviderEnvelope`，controller JWT verifier实际到达，不能出现通用 HTTP 200；
- handoff credential 未 confirm、过期、revoke、digest/target 篡改分别返回稳定 401/403；
- saved trust disabled、store error、invalid policy 对有效 handoff credential仍返回 403；
- 普通 Provider JWT 路径继续使用既有 controller验证，非 Provider API 继续使用 OAuth filter。

object 层聚焦测试额外覆盖 verifier替换、raw material不可恢复、跨 service instance验证和常量时间 exact-match行为；controller helper测试不替代 router集成测试。

### 7. target organization 由 Admin operator 显式选择并由服务端重新校验

接入包页面复用现有 `get-organizations` API，只把已加载的非 `built-in` 组织作为 AntD Select 选项。页面不提供自由输入，未选择、加载失败、空列表或只有 `built-in` 时不能生成包。创建 API 接收独立结构化 `targetOrganization`，不能从 copy-safe metadata、`adminOwnerAlias`、workspace alias 或 session owner 猜测。

后端已经通过 `requireServiceCredentialGovernanceGlobalAdmin` 确认调用人是全局管理员，但仍按名称重新读取 Admin organization，拒绝空值、`built-in`、不存在或 lookup error。创建者 subject 保留为签发者与审计 actor，不切换为目标组织中的用户，也不赋予 delegated user 身份。

备选方案是选择 delegated provider subject；它需要新增 impersonation 授权、主体生命周期和审计模型，超出本 change。信任 Insight query organization、复用 `TargetWorkspaceId`、默认为 `built-in` 或补伪造 PlatformApiUserMapping 都会混淆授权域或允许扩权，因此明确拒绝。

### 8. target context 绑定 package digest并贯穿 credential auth，Provider 只消费已验证 context

已发布的 AICodex-owned baseline manifest不可在本change中改写，schema registry/migration又属于其它owner写集，因此不新增grant列。operator envelope只返回copy-safe `targetOrganizationAlias`；创建接入包时`packageHash`同时哈希copy-safe metadata与target organization。v2 runtime credential claims包含精确target organization与该`packageHash`，validator在exact material/verifier、grant state、expiry校验后核对claim package hash与persisted record，再把目标组织写入只读auth context。缺失、`built-in`、package binding不一致或claim篡改均fail closed。Provider成功/失败审计使用已验证context记录organization，使运行态目标可追溯；status/readback不暴露raw credential或额外敏感标识。

Provider controller 对 handoff auth context 先完成既有 typed trust 校验，再从同一已验证 context 取 target organization。current-user 的真实 `adminUserId`、username、个人 usage identity仍来自签发者，但 `organization`、`apiOrganizationId` 和版本元数据使用 target organization；个人映射为 `MISSING` 时返回成功诊断且不猜测 `apiUserId`。scope/tree 使用 target organization计算范围，handoff 请求的 query 被忽略。普通 JWT/session 保留原有 `user.Owner` 和全局管理员显式 query 行为。

saved resolver disabled/unavailable或远端 unavailable 且只能确认 `MISSING` 时，current-user 返回带 source metadata 的 `MISSING` 诊断；resolver 返回 `INVALID`/`AMBIGUOUS` 仍 fail closed。typed `insight_provider_trust` 的 saved disabled/store unavailable/invalid policy属于认证授权边界，完全不受该诊断降级影响。

## Risks / Trade-offs

- [复用现有 server-only 字段保存 verifier，字段名仍为 `CredentialMaterial`] → 注释与测试明确 issued 时是一次性交付值、redeem 后是不可逆 verifier；operator JSON 永不暴露该字段。
- [grant record没有新增可读target列] → 已发布migration manifest不可变且schema写集由其它owner持有；以`packageHash(metadata,target)`、v2 claim、exact persisted verifier和Provider审计组合证明不可篡改与可追溯，不用现有workspace/environment字段冒充组织。
- [旧 RC grant 没有 target organization] → validator 对缺失 target fail closed；operator重新生成包，不把旧 grant 默认迁移到 `built-in`。
- [runtime credential 到期后 Profile 需要重新交接] → 采用有界期限满足最小权限；本 change 在 envelope/status 不回显 raw credential，后续如需自动轮换应独立设计 refresh/rotation，不放宽为无限期。
- [target 身份不是每个 HTTP 请求的独立证明] → v2 claim携带target organization和`packageHash(metadata,target)`，持久化record绑定同一package hash，exact material verifier阻止claim或secret篡改；当前 Insight 调用不携带额外target headers，本 change不虚构不存在的远端attestation。
- [filter 与 controller 各承担一层验证] → filter负责 exact credential/grant state并只写只读 claims，controller负责 typed trust与 Admin user；集成测试固定两层都被执行，避免将 context视为最终授权。
- [错误 envelope 在 routers 内有最小镜像结构] → 字段和稳定 code通过 router测试对照公开 Provider contract；避免 controllers↔routers循环依赖。
- [60 saved trust policy不允许 handoff issuer/audience] → 按安全要求返回403，不自动放宽；smoke只报告 reason alias，由 operator修正 typed policy后重新验证。

## Migration Plan

1. 先提交 OpenSpec并 strict validate/pre-implementation review。
2. 首轮 runtime credential/filter实现已完成；根据60证据补 target organization 与 current-user MISSING 的完整 RED。
3. 实现 grant package binding/claims/auth context、Provider组织语义和最小前端 selector，运行聚焦、完整 Go、前端、coverage与静态门禁。
4. rebase最新base，收敛为一个 RC commit推送工作分支。
5. 由主控部署60 Admin，重新生成包并由Insight新草稿redeem/confirm/probe；证据只保留status、reason alias、计数与短号。
6. 主控验收前不archive/merge base，不操作`test`；回滚为回退单个RC commit。旧grant因缺少target context继续fail closed。

## Open Questions

无。credential refresh/rotation、delegated subject 与每请求额外 target attestation 属于后续独立能力，本 P0只建立显式、可审计且 fail-closed 的 target organization runtime credential。
