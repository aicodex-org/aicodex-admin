## Verification

### Baseline

- `node --test` for `wecomSource*.test.js` and `organizationTreeOperations*.test.js`
  - Result: passed on the pre-migration JavaScript baseline.
  - Evidence: `test_files=13`, `tests 117`, `pass 117`, `fail 0`.

### Chosen Batch

- Included:
  - `api-tests/bruno/aicodex-admin/scripts/wecomSource*.js`
  - `api-tests/bruno/aicodex-admin/scripts/wecomSource*.test.js`
  - `api-tests/bruno/aicodex-admin/scripts/organizationTreeOperations*.js`
  - `api-tests/bruno/aicodex-admin/scripts/organizationTreeOperations*.test.js`
- Deferred:
  - `gatewayProjection*`
  - `api-tests/bruno/aicodex-admin/README.md`
  - `web-admin/**`
  - public raw scripts, build tooling, Cypress and Swagger vendor JS

### Generation / Consistency Strategy

- TypeScript source is added next to each helper/test.
- Existing CommonJS `.js` entries remain the runtime/test entrypoints.
- A change-scoped TypeScript config parses only this batch and local declaration files with `noEmit`.
- Final consistency check verifies each `.ts` source maps to its same-name `.js` entry by removing the `// @ts-nocheck` header and comparing exact file content.

### Final Gate

- `openspec validate migrate-admin-bruno-wecom-and-organization-helpers-to-typescript --strict`
  - Result: passed.
- `node ../../../../web-admin/node_modules/typescript/bin/tsc -p tsconfig.wecom-organization-helpers.json`
  - Workdir: `api-tests/bruno/aicodex-admin/scripts`
  - Result: passed with `noEmit`, using the existing `web-admin/node_modules/typescript` toolchain only.
- TypeScript source-to-JS consistency check
  - Result: `source_js_consistency=pass checked=26`.
  - Meaning: every touched `.ts` source maps exactly to its same-name CommonJS `.js` entry after removing the `// @ts-nocheck` header.
- Target `node --test` for generated/retained `.test.js` entries
  - Result: passed.
  - Evidence: `test_files=13`, `tests 117`, `pass 117`, `fail 0`.
- Coverage:
  - N/A for changed runtime code because this RC intentionally keeps `.js` CommonJS runtime/test entries byte-identical and adds TypeScript source mirrors. Behavioral coverage is represented by the existing 117 node:test assertions against the retained `.test.js` entries.
- Rebase / final base:
  - Rebased RC commit onto `origin/hfl-test-base=01c3be85205bd2eee2b901931f4aac49a214b5cf`.
- `git diff --check origin/hfl-test-base..HEAD`
  - Result: passed after rebase.
- `openspec validate --changes --strict`
  - Result: passed, 4 changes validated.
- `openspec validate --specs --strict`
  - Result: passed, 30 specs validated.
