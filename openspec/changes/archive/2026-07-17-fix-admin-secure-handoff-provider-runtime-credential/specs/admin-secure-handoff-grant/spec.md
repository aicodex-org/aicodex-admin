## MODIFIED Requirements

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
