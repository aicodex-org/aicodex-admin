## 1. IA Audit and Navigation Reframe

- [ ] 1.1 Audit current `enterpriseNavigation` and runtime sidebar entries, classifying each as primary business domain, contextual capability, flow entry or legacy route.
- [ ] 1.2 Define the target primary IA around center overview, organization/accounts, application access, identity sources, permissions/roles, audit operations and LLM AI/Gateway.
- [ ] 1.3 Demote abstract governance entries such as identity asset relationship, access preflight, governance tasks and quick actions to overview links, object detail actions or flow entry points while preserving route compatibility.
- [ ] 1.4 Update `zh` / `en` navigation copy and navigation tests so labels use administrator-facing business language rather than implementation terms.

## 2. Enterprise Visual-System Slice

- [ ] 2.1 Define and implement a compact enterprise page header pattern for representative Admin enterprise identity pages.
- [ ] 2.2 Define and implement professional table toolbar patterns for search, filters, status tags, evidence entry, object detail action and safe next action.
- [ ] 2.3 Replace repeated large workbench/card stacks on representative routes with denser operational surfaces that keep the core list or primary operation visible in the first desktop viewport.
- [ ] 2.4 Add or adjust empty, loading, error, permission and cannot-infer states so they read as operational status rather than explanatory marketing copy.

## 3. Object Context and Flow Placement

- [ ] 3.1 Move relationship and evidence actions into object details/drawers or row actions where administrators already inspect an object.
- [ ] 3.2 Move access preflight entry points into create/configuration flows and result pages rather than treating preflight as a standalone destination.
- [ ] 3.3 Keep governance task information as overview pending issues or object risk hints unless a backend aggregation and closure workflow is available.
- [ ] 3.4 Keep quick actions in overview or object operation areas, and avoid adding a standalone quick-action center.

## 4. Verification and Rollout

- [ ] 4.1 Run OpenSpec validation, incremental TypeScript gate, `yarn typecheck`, focused tests and `yarn build` for implementation slices that touch frontend code.
- [ ] 4.2 Use Playwright/local-dev/60 evidence on representative desktop `1440x900` and mobile `390x844` routes to verify no old Tour/overlay, no horizontal overflow and no console warning/error regressions.
- [ ] 4.3 Record table/list top coordinates or equivalent first-viewport evidence for application access, identity sources, audit operations and LLM AI/Gateway pages after each visual-system slice.
- [ ] 4.4 Update the route ledger and handoff with accepted IA/visual-system decisions and reject criteria for future worker prompts.
