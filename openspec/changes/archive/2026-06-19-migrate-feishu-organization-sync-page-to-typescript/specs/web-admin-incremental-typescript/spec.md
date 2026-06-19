## MODIFIED Requirements

### Requirement: Organization sync pages migrate through shared TSX shell
Admin Web organization sync pages SHALL migrate from legacy JavaScript toward TS/TSX through small shared typed presentation components, without requiring a whole-app migration or a full React rewrite.

#### Scenario: Shared organization sync components are TSX
- **WHEN** the implementation adds shared page header, action bar, status tag, provider logo, schedule, or run table presentation components for organization sync pages
- **THEN** those new React components SHALL be implemented as `.tsx`
- **AND** their prop contracts SHALL use explicit TypeScript types or interfaces rather than unexplained `any`

#### Scenario: Shared organization sync helpers are TS
- **WHEN** the implementation adds shared organization sync run status, impact count, provider logo, or API payload type helpers
- **THEN** those helpers SHALL be implemented as `.ts`
- **AND** they SHALL avoid coupling WeCom and Feishu backend APIs into one generic sync service abstraction

#### Scenario: Existing sync pages migrate conservatively
- **WHEN** `WecomOrganizationSyncPage` or `FeishuOrganizationSyncPage` is migrated to TSX
- **THEN** the migration SHALL preserve route exports, backend API calls, polling behavior, pagination, secret masking behavior, organization switching, and existing visible user workflows
- **AND** the migration SHALL NOT require rewriting unrelated legacy JS pages

#### Scenario: 飞书组织同步页面迁移
- **WHEN** `FeishuOrganizationSyncPage` is migrated to TSX
- **THEN** the migration SHALL preserve `/feishu-org-sync` routing, configuration form behavior, connection test behavior, dry-run preview/history, user binding conflict diagnostics, handoff evidence display/export, run polling, pagination, copy actions, and safe redaction behavior
- **AND** `FeishuOrganizationSyncBackend` SHOULD migrate to `.ts` with typed request/response contracts for the endpoints used by the page
- **AND** the main page test SHOULD migrate to `.test.tsx` without requiring real Feishu/Lark secrets or real Contact v3 calls
- **AND** the migration SHALL NOT change backend sync objects, API routes, scheduler semantics, provider credentials, or Gateway/Insight behavior

#### Scenario: TypeScript migration is validated
- **WHEN** the organization sync page migration is ready for review
- **THEN** `yarn typecheck`, the incremental TypeScript gate, focused Jest tests, and `yarn build` SHALL pass for the touched TS/TSX and coexistence paths
- **AND** any retained `.js` page or test file touched by the migration SHALL be justified by lower implementation risk or unchanged behavior scope
