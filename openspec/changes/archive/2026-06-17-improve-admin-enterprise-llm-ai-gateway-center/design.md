# Design: LLM AI Gateway Center

## Product Shape
`/agents` remains the compatible route and permission key for the primary LLM AI area. The page gains a top workbench that explains the area as `LLM AI 网关中心`: AI Agent entrypoints, MCP servers/store, entries/sites/rules, API gateway identity mappings, and audit records.

The workbench uses the existing `EnterpriseIdentityConsoleLayout` components so it matches the organization identity, auth source, application access and audit operations centers. It is intentionally read-only and derives its numbers from the current Agent list view only.

## Data Boundary
The new summary builder accepts current list rows and pagination/loading metadata. It only emits counts, status labels, route links and risk categories. It does not copy agent `token`, raw private URL, OAuth credential, Cookie or full downstream response values into summary data.

Gateway projection remains an implementation boundary in lower-level diagnostics where the existing backend contract already uses that term. Main page titles and navigation should use administrator-facing terms such as Gateway identity sync/readiness/publish history.

## Compatibility
- Keep `/agents`, `/servers`, `/server-store`, `/entries`, `/sites`, `/rules` and `/platform-api-mappings` routes.
- Keep existing backend wrappers, API paths and publish button behavior.
- Keep organization `navItems` leaf keys stable; only labels and the `/agents` page shell change.

## Validation
- Focused Jest tests cover summary derivation, secret/private URL redaction, component rendering and navigation labels.
- `openspec validate improve-admin-enterprise-llm-ai-gateway-center --strict`, `git diff --check`, `yarn typecheck`, focused Jest coverage, `yarn build`, and browser responsive smoke are required before handoff.
