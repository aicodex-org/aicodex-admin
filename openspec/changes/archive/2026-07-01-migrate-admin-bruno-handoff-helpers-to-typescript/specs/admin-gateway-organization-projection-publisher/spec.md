## ADDED Requirements

### Requirement: Gateway projection Bruno handoff helper 必须保持 TS 源和 JS 入口一致
Admin SHALL keep the Gateway projection Bruno handoff helper source type-checkable while preserving the existing CommonJS entrypoints used by Node and Bruno. The migration SHALL NOT change Gateway projection handoff semantics, stable aliases, owner handoff limits, redaction checks, fail-closed behavior, red-line classification, or copy-safe evidence boundaries.

#### Scenario: 生成 CommonJS 入口保持兼容
- **WHEN** Gateway projection Bruno helper is migrated to TypeScript source
- **THEN** the repository SHALL still provide the corresponding `.js` CommonJS entrypoint for existing Bruno `require(...)` and `node --test ...*.test.js` usage
- **AND** the generated `.js` entrypoint SHALL remain reproducible from the committed `.ts` source

#### Scenario: 迁移不改变本地 evidence guardrail
- **WHEN** an operator runs the migrated Gateway projection helper tests
- **THEN** the tests SHALL continue to cover sanitized handoff output, owner boundary, fail-closed, redaction and red-line behavior
- **AND** the helpers SHALL NOT connect to real environments, mutate 60 fixtures, write DB state, trigger Gateway publish, write authorization facts, or expose secrets, raw payloads, complete private URLs, real accounts or complete organization trees

#### Scenario: 未迁移批次保持 deferred
- **WHEN** this change completes the Gateway projection helper batch
- **THEN** WeCom source helper scripts MAY remain JavaScript
- **AND** the release-candidate report SHALL list the deferred helper batch so a later change can migrate it with the validated source/output pattern
