## ADDED Requirements

### Requirement: 用户编辑页 TSX 迁移
`web-admin` SHALL allow `UserEditPage` to migrate from JavaScript to TSX while preserving existing user edit behavior, route exports, account-page embedding, backend API contracts, and visible administrator or self-service workflows.

#### Scenario: 用户编辑页保守迁移
- **WHEN** `UserEditPage` is migrated to `.tsx`
- **THEN** the migration SHALL preserve `/users/:organizationName/:userName` loading, account page embedding, save, save-and-exit, cancel/delete, return URL handling, user list URL handling, 404 handling, group visibility, MFA/account security sections, third-party identity widgets, and transaction display behavior
- **AND** the migration SHALL NOT require rewriting user backend APIs, authentication, authorization, provider, Gateway, modal, table, or OAuth/SAML widget behavior

#### Scenario: 用户编辑页迁移验证
- **WHEN** the user edit page TSX migration is ready for review
- **THEN** the incremental TypeScript gate, `yarn typecheck`, focused React tests, changed-file coverage, and `yarn build` or equivalent build validation SHALL pass for the touched TSX and JS coexistence paths
- **AND** React tests for migrated page behavior SHALL use `.test.tsx`
