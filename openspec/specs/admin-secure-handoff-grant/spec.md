# admin-secure-handoff-grant Specification

## Purpose
定义 Admin 向 Insight Connection Profile 交接组织与身份凭据的 secure handoff grant 能力，确保操作员复制的接入包只包含 copy-safe metadata 和脱敏授权摘要，真实凭据仅通过短 TTL、一次性、可确认的服务端兑换链路交付。
## Requirements
### Requirement: Admin 组合 Insight Admin 接入包

Admin SHALL generate an operator-copyable Insight Admin access package that combines copy-safe metadata with a short-TTL Admin `secure_handoff_grant`.

#### Scenario: Insight common envelope

- **WHEN** an operator creates an Insight Admin access package
- **THEN** the package SHALL use `schemaVersion: "aicodex.insight.access-package.v1"`
- **AND** the package SHALL use `target: "insight.connection-profile.import"`
- **AND** the package SHALL include Admin copy-safe metadata as `copySafeHandoff`
- **AND** the package MAY include legacy Admin schema/version fields only as non-authoritative compatibility metadata

#### Scenario: 组合包分层

- **WHEN** an operator creates an Insight Admin access package
- **THEN** the package SHALL include existing Admin copy-safe metadata as `copySafeHandoff`
- **AND** the package SHALL include `secureHandoffGrant` as a redacted grant envelope
- **AND** the package SHALL NOT include raw token, secret, DSN, complete secretRef, Authorization header, Cookie, client secret, private key, full private URL, raw payload, real account, full organization tree, redeem URL, or credential material

#### Scenario: 默认动作不回退手工找凭据

- **WHEN** Admin secure handoff is available
- **THEN** the Admin UI SHALL present copying the Insight Admin access package as the primary action
- **AND** manual/secretRef binding SHALL be presented only as fallback when secure handoff is unavailable or redemption fails

### Requirement: Admin grant envelope 脱敏字段

Admin SHALL expose only redacted grant envelope fields to operators and copy-safe consumers.

#### Scenario: envelope 字段

- **WHEN** Admin creates a secure handoff grant
- **THEN** the envelope MAY include `schema`, `version`, `grantId`, `nonce`, `issuer`, `environmentId`, `providerType`, `targetRegistrationId`, `targetWorkspaceId`, `expiresAt`, `traceMarker`, `credentialSuffix`, `ownerRegistryReadiness`, `ownerRegistry`, `packageHash`, `audience`, `status`, and `state`
- **AND** the envelope SHALL NOT include credential material, token hash, secret hash, complete secretRef, full private URL, or redeem endpoint

### Requirement: Admin grant 生命周期

Admin SHALL 支持 secure handoff grant 的 create、redeem、confirm、fail、revoke、status 和有界 Provider runtime credential 校验。

#### Scenario: 持久化 grant record

- **WHEN** Admin 创建 secure handoff grant
- **THEN** Admin SHALL 按仓库 DB/model/store 模式持久化 grant record
- **AND** record SHALL 保留 grant id、issuer、target registration、workspace、environment、provider、audience、package hash、trace marker、status、reason code、nonce/redeemed marker、expiry 和审计时间戳
- **AND** 使用同一 store 的其它服务实例 SHALL 能够 redeem、confirm、fail、revoke 或查询 grant 生命周期

#### Scenario: 兑换成功后等待确认

- **WHEN** Insight backend 使用匹配的 target registration、workspace、environment、provider type、audience、package hash 和 nonce 兑换 issued grant
- **THEN** Admin SHALL 只在 server-to-server redeem 响应中返回 `delivered` 与 credential material
- **AND** Admin SHALL 把 grant 标记为 `delivered`
- **AND** `queryGrantStatus` SHALL 只返回脱敏 status、suffix、trace marker、credential reference 和 confirmation-window metadata

#### Scenario: 确认后不可再次取回凭据

- **WHEN** Insight 使用匹配的 nonce 和 secret binding evidence 确认 delivered grant
- **THEN** Admin SHALL 把 grant 标记为 `confirmed`
- **AND** 后续 redeem SHALL fail closed且不得返回 credential material

#### Scenario: 失败、撤销和过期 fail closed

- **WHEN** grant 已 expired、revoked、failed、confirmed、已被其它 nonce 兑换，或 target registration、workspace、environment、provider type、audience、package hash、nonce 不匹配
- **THEN** Admin SHALL 使用稳定脱敏 reason code拒绝兑换
- **AND** Admin SHALL NOT 返回 credential material

#### Scenario: 兑换并确认后得到受限运行凭据

- **WHEN** Insight backend以匹配的nonce、target registration、workspace、environment、provider type、audience和package hash兑换issued grant并完成confirm
- **THEN** Admin SHALL只在成功redeem响应中返回一次runtime credential material
- **AND** runtime credential SHALL绑定grant id、Admin创建者subject、issuer、audience、Provider只读scopes、target registration、workspace、environment、provider type和有界expiry
- **AND** Admin SHALL在持久化状态中用不可逆verifier替换raw material
- **AND** status、operator package和后续redeem SHALL NOT返回raw material或verifier digest

#### Scenario: runtime credential状态实时fail closed

- **WHEN** Provider收到未confirm、expired、revoked、failed、verifier不匹配、target声明被篡改、issuer/audience/scope/subject不匹配的handoff runtime credential
- **THEN** Admin SHALL拒绝该credential
- **AND** Admin SHALL NOT创建普通OAuth token、浏览器session或扩大到Insight Admin Provider三个只读路径之外
- **AND** 错误响应和日志 SHALL NOT包含credential、Authorization、Cookie、token hash、完整secretRef或raw grant内容

#### Scenario: redeem继续保持一次性

- **WHEN** 一个grant已成功redeem、confirm或closed后再次被兑换
- **THEN** Admin SHALL fail closed并返回稳定脱敏reason code
- **AND** Admin SHALL NOT把可重复的Provider只读API调用误判为grant redeem replay
- **AND** Admin SHALL NOT再次返回credential material

#### Scenario: runtime credential独立有界过期

- **WHEN** grant兑换窗口仍存在或grant已经confirmed，但runtime credential自身expiry已到达
- **THEN** Admin SHALL拒绝Provider调用
- **AND** Admin SHALL NOT回退为session、OAuth token或legacy配置认证
- **AND** operator SHALL通过重新生成secure handoff包完成后续轮换

#### Scenario: operator 显式选择业务目标组织

- **WHEN** 已鉴权全局管理员创建 Insight Admin 接入包或 secure handoff grant
- **THEN** Admin SHALL 要求 operator 从已存在的 Admin 组织中显式选择 target organization
- **AND** Admin SHALL 在服务端重新校验该组织存在且不是 `built-in`
- **AND** Admin SHALL NOT 接受自由输入推断、Insight query、workspace alias、创建者 `Owner` 或默认 `built-in` 作为 target organization
- **AND** 创建者 subject SHALL 继续作为签发者和审计 actor，而不是被静默 impersonate 为目标组织用户

#### Scenario: target organization 贯穿 grant 与运行凭据

- **WHEN** Admin 为有效 target organization 创建 grant
- **THEN** target organization SHALL写入runtime credential claims
- **AND** 接入包`packageHash` SHALL同时绑定copy-safe metadata与target organization，并写入credential claims与持久化grant record
- **AND** operator envelope MAY 只返回copy-safe `targetOrganizationAlias`
- **AND** runtime validator SHALL核对credential claim中的package binding与持久化grant record完全一致，并对presented credential执行exact verifier校验
- **AND** 缺失、`built-in`、篡改或不一致 SHALL fail closed

#### Scenario: 目标组织选择器覆盖工作状态

- **WHEN** operator 在 Admin 接入包页面选择 target organization
- **THEN** UI SHALL 提供loading、empty、error、无eligible target和提交中状态
- **AND** UI SHALL 排除`built-in`且不得静默默认任何组织
- **AND** 未选择有效组织时 SHALL 禁止生成接入包并给出可操作提示

### Requirement: Admin secure handoff 脱敏审计

Admin SHALL keep secure handoff audit evidence redacted.

#### Scenario: 状态和错误不泄密

- **WHEN** Admin returns grant status, package generation result, validation failure, revoke result, or fail result
- **THEN** the response SHALL contain only redacted identifiers, suffixes, trace markers, state, reason code, and timestamps
- **AND** the response SHALL NOT contain raw grant body, credential material, raw secret, Authorization header, Cookie, DSN, complete secretRef, full private URL, raw payload, real account, or full organization tree

### Requirement: Admin 接入包目标组织操作流

Admin UI SHALL 在同一操作区以显式、可访问且可恢复的流程，让 operator 先选择授权目标组织，再生成 Insight Admin 接入包。

#### Scenario: 选择先于唯一主操作

- **WHEN** operator 打开 Insight Admin 接入包操作区
- **THEN** UI SHALL 在视觉、DOM 与键盘顺序上先呈现必填“授权目标组织”选择器，再呈现唯一生成主 CTA
- **AND** UI SHALL 紧邻选择器说明该组织决定 Insight 可读取的 Admin 组织与用量范围
- **AND** 技术诊断入口 SHALL NOT 取代或打断该主操作顺序

#### Scenario: 不静默选择目标组织

- **WHEN** eligible target organization 列表完成加载
- **THEN** UI SHALL 保持选择为空，即使仅有一个 eligible organization
- **AND** UI SHALL NOT 持久化或跨刷新恢复上一次选择
- **AND** 未选择时生成 CTA SHALL disabled，并显示指向选择组织的下一步提示

#### Scenario: 状态可恢复

- **WHEN** target organization 列表处于 loading、empty、error 或 access package 正在 submitting
- **THEN** UI SHALL 显示对应可感知状态和可操作恢复提示
- **AND** UI SHALL 在没有有效选择或 submitting 时禁止重复生成
- **AND** empty 与 error 状态 SHALL NOT 回退到 `built-in`、创建者 owner 或其它推断目标

#### Scenario: 组织变化作废旧结果

- **WHEN** operator 在接入包生成成功后改变 target organization
- **THEN** UI SHALL 立即清除旧 package success/result
- **AND** UI SHALL 要求 operator 为新目标重新生成接入包

#### Scenario: 成功反馈确认授权组织

- **WHEN** Admin 为所选 target organization 成功生成接入包
- **THEN** UI SHALL 显示“本接入包授权给”以及生成时的组织展示名
- **AND** UI MAY 显示 copy-safe organization alias
- **AND** 长展示名或 alias SHALL 省略并通过 Tooltip 或等效方式可读
- **AND** UI SHALL NOT 显示 raw grant、token、credential、完整 secretRef、私有 URL 或 raw package

#### Scenario: 响应式与键盘操作

- **WHEN** operator 在 1440 或 390 宽度使用该操作区
- **THEN** selector、说明、CTA 与反馈 SHALL 不重叠且 SHALL NOT 造成页面级横向溢出
- **AND** selector 与 CTA SHALL 在窄屏自然换行
- **AND** selector SHALL 有可访问名称，Tab 与 Enter SHALL 可操作，成功和错误反馈 SHALL 可感知

#### Scenario: 扩展能力提示不阻断接入包

- **WHEN** secure handoff 接入包前置条件已满足但 runtime extension capability 仍有 warning
- **THEN** UI SHALL 允许 operator 选择目标组织并生成接入包
- **AND** UI SHALL 继续说明该 warning 不阻断 package import 与 Profile activation
