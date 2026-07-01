## ADDED Requirements

### Requirement: Organization tree operations Bruno helpers use TypeScript source with CommonJS entries
Organization tree operations local-only Bruno helpers SHALL be maintainable as TypeScript source while preserving the existing CommonJS JavaScript entrypoints and read-only helper behavior.

#### Scenario: TypeScript source generates existing organization helper entries
- **WHEN** the organization tree operations Bruno helper batch is migrated
- **THEN** every touched `organizationTreeOperations*.js` helper and `organizationTreeOperations*.test.js` test SHALL have an equivalent `.ts` source file in `api-tests/bruno/aicodex-admin/scripts`
- **AND** the generated `.js` CommonJS entries SHALL continue to support existing `require("./organizationTreeOperations...")` consumers and `node --test` execution
- **AND** generation SHALL be reproducible by a change-scoped TypeScript command that does not depend on Gateway migration scaffolding

#### Scenario: Source migration preserves organization safety boundaries
- **WHEN** the generated organization tree operations helper JS entries are tested
- **THEN** the existing node:test suites SHALL still execute non-zero tests and pass
- **AND** stable aliases, owner handoff limits, redaction/fail-closed behavior, non-empty tree evidence limits, refresh-status handling, full-success rejection, local-only scope and non-extrapolation boundaries SHALL remain unchanged
- **AND** the migration SHALL NOT query real databases, write fixtures, rebuild organization trees, call API/Insight/Gateway, or expose token, Cookie, private URL, real account, phone, email, complete organization tree or raw payload values

#### Scenario: Organization helper TypeScript stays isolated from Gateway work
- **WHEN** this batch adds TypeScript configuration or Node/CommonJS declarations
- **THEN** the configuration SHALL include only `wecomSource*.ts`, `wecomSource*.test.ts`, `organizationTreeOperations*.ts`, `organizationTreeOperations*.test.ts` and change-scoped declaration files
- **AND** the migration SHALL NOT create or modify `node-globals.d.ts`, `gatewayProjection*`, `api-tests/bruno/aicodex-admin/README.md`, `web-admin/**`, public raw scripts, build tooling, Cypress or Swagger vendor JS
