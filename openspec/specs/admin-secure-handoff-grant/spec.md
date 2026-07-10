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

Admin SHALL support create, redeem, confirm, fail, revoke, and status operations for Admin secure handoff grants.

#### Scenario: 持久化 grant record

- **WHEN** Admin creates a secure handoff grant
- **THEN** Admin SHALL persist a grant record using the repository DB/model/store pattern
- **AND** the persisted record SHALL retain grant id, issuer, target registration, workspace, environment, provider, audience, package hash, trace marker, status, reason code, nonce/redeemed marker, expiry and audit timestamps
- **AND** a different service instance using the same store SHALL be able to redeem, confirm, fail, revoke, or query the grant lifecycle

#### Scenario: 兑换成功后等待确认

- **WHEN** Insight backend redeems an issued grant with matching target registration, workspace, environment, provider type, audience, package hash, and nonce
- **THEN** Admin SHALL return `delivered` with credential material only in the server-to-server redeem response
- **AND** Admin SHALL mark the grant `delivered`
- **AND** `queryGrantStatus` SHALL return only redacted status, suffix, trace marker, credential reference, and confirmation-window metadata

#### Scenario: 确认后不可再次取回凭据

- **WHEN** Insight confirms a delivered grant with matching nonce and secret binding evidence
- **THEN** Admin SHALL mark the grant `confirmed`
- **AND** subsequent redeem attempts SHALL fail closed without returning credential material

#### Scenario: 失败、撤销和过期 fail closed

- **WHEN** a grant is expired, revoked, failed, confirmed, has already been redeemed by a different nonce, or receives mismatched target registration, workspace, environment, provider type, audience, package hash, or nonce
- **THEN** Admin SHALL reject redemption with a stable redacted reason code
- **AND** Admin SHALL NOT return credential material

### Requirement: Admin secure handoff 脱敏审计

Admin SHALL keep secure handoff audit evidence redacted.

#### Scenario: 状态和错误不泄密

- **WHEN** Admin returns grant status, package generation result, validation failure, revoke result, or fail result
- **THEN** the response SHALL contain only redacted identifiers, suffixes, trace markers, state, reason code, and timestamps
- **AND** the response SHALL NOT contain raw grant body, credential material, raw secret, Authorization header, Cookie, DSN, complete secretRef, full private URL, raw payload, real account, or full organization tree
