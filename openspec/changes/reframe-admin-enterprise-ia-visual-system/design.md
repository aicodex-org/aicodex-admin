## Context

The route has already delivered several enterprise identity features: visual language polish, organization identity workbenches, access preflight, governance task queue, object evidence chain and relationship aggregation client fallback. These changes improved capability coverage but also introduced a new product risk: too many abstract governance entrances can make Admin feel busier without making the core authentication center easier to operate.

The corrected product direction combines both leadership signals:

- Admin is visually too plain and still resembles a generic CRUD backend in places.
- Admin should not solve that by adding more governance centers, cards or explanatory panels.

The next stage should make the product feel like a mature enterprise identity console through information architecture, density, table tooling, object details, evidence and consistent language.

## Goals / Non-Goals

**Goals:**

- Reframe the primary navigation around business domains rather than implementation or abstract governance capabilities.
- Define where existing and future relationship, preflight, governance task and quick action capabilities should live.
- Define enterprise visual-system requirements that improve maturity without marketing-style pages or card-heavy workbenches.
- Give future workers a concrete reject/accept rule for UI tasks so they do not keep adding filler entrances.
- Preserve the current React + TypeScript migration rules and verification expectations.

**Non-Goals:**

- Do not remove existing implemented capabilities in this proposal.
- Do not implement UI, navigation or stylesheet changes in this proposal.
- Do not archive or rewrite `propose-admin-enterprise-identity-governance-experience-layer`.
- Do not add backend write behavior, real authentication execution, Gateway execution behavior or production/test branch changes.

## Decisions

### Decision 1: Primary IA is business-domain based

The primary navigation should center on stable business domains: overview, organization/accounts, application access, identity sources, permissions/roles, audit operations and LLM AI/Gateway. Abstract governance capabilities should not compete with those domains as first-level concepts.

Alternative considered: keep every new capability as a menu item. This creates a navigation taxonomy that mirrors implementation history instead of administrator intent.

### Decision 2: Horizontal governance capabilities become contextual

Relationship, evidence, preflight, governance tasks and quick actions remain valuable, but their default placement changes:

- Relationship and evidence live in object details or drawers.
- Preflight lives in create/configuration flows and result pages.
- Governance tasks live as overview pending issues or object risk hints until a real aggregation and closure model exists.
- Quick actions live in overview or object operation areas.

Alternative considered: keep standalone centers for all horizontal capabilities. This makes the administrator learn the product's internal abstractions before answering business questions.

### Decision 3: Enterprise look comes from operational surfaces

The visual system should prioritize professional admin surfaces: compact page headers, table toolbars, filters, status tags, batch/action affordances, drawer details, empty/error states, readable density and consistent i18n. It should avoid hero sections, decorative gradients, large explanatory cards and repeated workbench templates.

Alternative considered: add richer cards and KPI panels to each page. Prior browser evidence showed this pushes core tables below the first viewport and makes pages feel templated.

### Decision 4: Future UI tasks need product-goal acceptance criteria

A task that only adds a menu entry, center, card, status strip or explanation area is not enough. Future work should explain how it helps administrators answer: who can log in, through which identity source, which applications they can access, where risk exists, what evidence exists and what to fix next.

Alternative considered: accept small UI polish tasks independently. This increases route churn and makes the product direction harder to recover across workers.

## Risks / Trade-offs

- [Risk] Existing implemented routes such as `/identity-assets`, `/access-wizard` and `/governance-tasks` may already appear as standalone entries. Mitigation: this proposal does not require immediate deletion; future implementation should demote or contextualize them with compatibility redirects where needed.
- [Risk] Reducing visible entries may hide useful capabilities. Mitigation: keep deep links, overview hints and object-level actions so capabilities stay discoverable at the moment they are relevant.
- [Risk] Visual-system polish can become a large refactor. Mitigation: split implementation into narrow slices: navigation map, shell/page header, table toolbar/status language, then object detail patterns.
- [Risk] Browser evidence can be expensive. Mitigation: require targeted screenshots and DOM checks on representative routes rather than exhaustive visual testing for every page.

## Migration Plan

1. Audit current navigation entries and classify them as primary domain, contextual capability, flow entry or legacy route.
2. Implement a small IA slice that reduces prominent abstract entries while keeping existing routes reachable from overview, object context or redirects.
3. Implement a visual-system slice for shell/page headers/table toolbar/status tags on representative pages before broad rollout.
4. Use Playwright/local-dev/60 evidence to compare before/after: core list top, first meaningful operation, console warnings, horizontal overflow and i18n fallback.
5. Only after browser evidence is acceptable, apply the same pattern to remaining enterprise identity pages.

Rollback strategy: keep original routes and stable keys; if navigation demotion causes discoverability issues, restore the entry while retaining the business-domain grouping and object-context actions.

## Open Questions

- Whether `/identity-assets`, `/access-wizard` and `/governance-tasks` should remain as secondary leaves, be hidden from primary nav, or be exposed only through overview/object-context links requires a follow-up implementation decision with screenshot review.
- Whether a separate design token/component guideline file is needed in `web-admin` should be decided after the first visual-system slice shows repeated patterns worth documenting.
