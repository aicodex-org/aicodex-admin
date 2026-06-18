## Context

The route direction has already been corrected by `reframe-admin-enterprise-ia-visual-system`: enterprise quality should come from operational surfaces, not more governance centers. This change applies that direction to the current high-visibility pages users review in the Admin enterprise identity console.

The implementation must preserve deep links and current capabilities. It should reduce prominence, not delete functionality. Relationship evidence, access preflight and governance tasks remain available from contextual links or existing routes.

## Goals

- Make `/` feel like a concise identity governance overview rather than an entrance directory.
- Make `/applications` table-first at desktop size, with professional row operations and less visual pressure from logos/destructive actions.
- Make `/access-wizard` feel like a compact preflight tool inside the access flow, not another standalone center to learn.
- Make organization directory quality/tree operations default to business health and sync status, with engineering lineage fields available as diagnostic evidence.
- Make `/records` safe for primary-table scanning by showing governance semantics first and moving raw audit detail to redacted folded detail.
- Make `/wecom-org-sync` and `/feishu-org-sync` readable on mobile without page-level horizontal overflow.
- Keep desktop `1440x900` and mobile `390x844` readable without page-level horizontal overflow.

## Non-Goals

- Do not create new primary navigation entries.
- Do not remove existing routes or deep links such as `/identity-assets`, `/access-wizard` or `/governance-tasks`.
- Do not introduce real connection tests, OAuth/OIDC callback execution, sync execution, Gateway publish/projection/cleanup/receipt or destructive organization data actions.
- Do not rewrite unrelated admin pages, package metadata, lockfiles or TypeScript infrastructure.

## Decisions

### Decision 1: Overview answers four operational questions

The overview will emphasize coverage, application access, sync/audit health and the most important next action. Horizontal capabilities should appear as compact contextual evidence/action links rather than a full "capability entrance" grid.

### Decision 2: Application access is table-first

The applications page keeps the existing list CRUD behavior and object context drawer. The summary above the table is reduced to compact readiness facts and a small issue strip. Row actions are grouped as primary edit/context actions plus a secondary menu for copy/delete so destructive actions do not dominate scanning.

### Decision 3: Access preflight is a workflow tool

The wizard remains direct-route compatible, but the page title/copy and layout should describe a preflight tool embedded in access configuration. Domain selection, gaps, evidence and safety boundary are visually compact; "does not execute..." content becomes diagnostic copy, not the main visual structure.

### Decision 4: Technical lineage is diagnostic evidence

Organization directory pages need lineage fields for troubleshooting, but those fields are not first-look business status. Summary cards and main tables use directory health, source, lifecycle, freshness and issue counts. Full read model/version/batch values move to diagnostic details/drawers where they remain copyable.

### Decision 5: Audit records show governance semantics first

Audit operations still need raw request, response and object evidence for troubleshooting, but the default `/records` table should not expose raw payload, request URI, trace or reason-like values. The primary table uses event type, object summary, result, risk level, evidence status, operator and time. Raw evidence remains in the detail drawer as folded, redacted technical evidence.

### Decision 6: Sync pages contain horizontal scroll inside widgets

Organization sync pages can contain wide forms and tables. On mobile, buttons and selectors wrap, AntD row negative margins are neutralized within the sync page, and table overflow stays inside the table wrapper so the document root does not scroll horizontally.

## Validation Strategy

- Use TDD for behavior/markup changes where tests already exist.
- Run OpenSpec strict validation for this change and all changes.
- Run `git diff --check`, web-admin incremental TypeScript gate, `yarn typecheck`, focused Jest/coverage for touched pages, and `yarn build`.
- Use browser verification on desktop `1440x900` and mobile `390x844` for `/`, `/applications`, `/access-wizard`, and an organization directory/operations route when local-dev or 60 tooling allows.
- If browser validation is blocked, record exact blocker, lower-level evidence and minimal follow-up validation.

## Risks

- Reducing visible entry points may make some existing capabilities harder to find. Mitigation: keep contextual links, deep links and route compatibility.
- Touching legacy `.js` pages without full TS migration may leave some existing hardcoded copy. Mitigation: update new/changed visible copy through existing locale resources where practical and report any inherited legacy copy left untouched.
- Browser validation can depend on local-dev or 60 login state. Mitigation: use existing scripts and report any environment blocker without exposing secrets.
