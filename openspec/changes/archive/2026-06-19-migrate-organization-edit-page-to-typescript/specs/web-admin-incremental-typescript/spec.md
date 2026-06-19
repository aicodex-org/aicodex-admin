## ADDED Requirements

### Requirement: 组织编辑页 TSX 迁移
`web-admin` SHALL allow `OrganizationEditPage` to migrate from JavaScript to TSX while preserving existing organization edit behavior, route exports, backend API contracts, and visible administrator workflows.

#### Scenario: 组织编辑页保守迁移
- **WHEN** `OrganizationEditPage` is migrated to `.tsx`
- **THEN** the migration SHALL preserve `/organizations/:organizationName` loading, save, save-and-exit, cancel, delete, theme update, organization name lock, LDAP/MFA/navigation/theme sections, and transaction list behavior
- **AND** the migration SHALL NOT require rewriting organization backend APIs, other organization account pages, authentication, authorization, provider, or Gateway behavior

#### Scenario: 组织编辑页迁移验证
- **WHEN** the organization edit page TSX migration is ready for review
- **THEN** the incremental TypeScript gate, `yarn typecheck`, focused React tests, changed-file coverage, and `yarn build` or equivalent build validation SHALL pass for the touched TSX and JS coexistence paths
- **AND** React tests for migrated page behavior SHALL use `.test.tsx`
