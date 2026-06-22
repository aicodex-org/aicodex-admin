## ADDED Requirements

### Requirement: Admin 必须生成服务凭据治理交接包

Admin SHALL generate a copy-safe service credential governance handoff package for Insight `业务服务接入` and API-Gateway owner consumers without exposing reusable credentials or claiming downstream runtime truth.

#### Scenario: 交接包包含稳定 owner-boundary 摘要

- **WHEN** Admin generates a service credential governance handoff package
- **THEN** the package SHALL include `schema`, `version`, `source`, `generatedAt`, `targetConsumerAlias`, `adminOwnerAlias` and `groups[]`
- **AND** each group SHALL include group key/label, status/readiness, owner hint, `sourceClass`, credential reference status, safe credential reference key summary, caller policy presence/alias, bounded runtime policy summary, `keepInEnv`, `cannotInferRuntimeTruth`, next action, stable aliases and blocked aliases when applicable

#### Scenario: 交接包 fail closed

- **WHEN** a group is `env_config`, `keepInEnv`, missing credential reference, disabled, blocked, externally unresolved, unsupported source class or cannot infer runtime truth
- **THEN** Admin SHALL represent the group as blocked, not-ready, keep-in-env or cannot-infer in the handoff package
- **AND** Admin MUST NOT express those states as ready, configured or full success
- **AND** stable and blocked aliases SHALL be copy-safe machine-readable aliases rather than raw downstream evidence

#### Scenario: 交接包不执行真实下游动作

- **WHEN** Admin builds the handoff package
- **THEN** Admin SHALL evaluate only already loaded or submitted copy-safe governance metadata, status aliases and diagnostic aliases
- **AND** Admin SHALL NOT trigger resolver outbound calls, Gateway publish or refresh, API/Gateway/Insight writes, credential value reveal, authentication callbacks, provider login, WeCom sync, DB fixture writes, external secret resolution or runtime secret verification

#### Scenario: 交接包禁止敏感材料

- **WHEN** Admin returns, stores, previews or records the handoff package
- **THEN** it MUST NOT include token values, Authorization headers, Cookies, DSNs, client secrets, private keys, complete private URLs, raw provider responses, raw downstream responses, raw ids, real accounts, complete organization trees or raw payloads
- **AND** unsafe input snippets SHALL be omitted, replaced with stable redaction aliases or represented only as configured/missing/reference status
