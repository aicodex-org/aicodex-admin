## ADDED Requirements

### Requirement: WeCom source Bruno helpers use TypeScript source with CommonJS entries
WeCom source local-only Bruno helpers SHALL be maintainable as TypeScript source while preserving the existing CommonJS JavaScript entrypoints and read-only helper behavior.

#### Scenario: TypeScript source generates existing JS entries
- **WHEN** the WeCom source Bruno helper batch is migrated
- **THEN** every touched `wecomSource*.js` helper and `wecomSource*.test.js` test SHALL have an equivalent `.ts` source file in `api-tests/bruno/aicodex-admin/scripts`
- **AND** the generated `.js` CommonJS entries SHALL continue to support existing `require("./wecomSource...")` consumers and `node --test` execution
- **AND** generation SHALL be reproducible by a change-scoped TypeScript command that does not depend on Gateway migration scaffolding

#### Scenario: Source migration preserves WeCom safety boundaries
- **WHEN** the generated WeCom source helper JS entries are tested
- **THEN** the existing node:test suites SHALL still execute non-zero tests and pass
- **AND** stable aliases, owner handoff limits, redaction/fail-closed behavior, full-success rejection, local-only scope and non-extrapolation boundaries SHALL remain unchanged
- **AND** the migration SHALL NOT trigger real WeCom sync, fixture or DB writes, API/Insight/Gateway reads, provider token access, production-like gates or configuration changes

#### Scenario: WeCom helper TypeScript stays isolated from Gateway work
- **WHEN** this batch adds TypeScript configuration or Node/CommonJS declarations
- **THEN** the configuration SHALL include only `wecomSource*.ts`, `wecomSource*.test.ts`, `organizationTreeOperations*.ts`, `organizationTreeOperations*.test.ts` and change-scoped declaration files
- **AND** the migration SHALL NOT create or modify `node-globals.d.ts`, `gatewayProjection*`, `api-tests/bruno/aicodex-admin/README.md`, `web-admin/**`, public raw scripts, build tooling, Cypress or Swagger vendor JS
