## 1. Scope and baseline

- [x] Confirm workspace branch is `hfl-test/migrate-admin-bruno-wecom-and-organization-helpers-to-typescript` and aligned to latest `origin/hfl-test-base`.
- [x] Identify chosen batch as `wecomSource*.js/.test.js` and `organizationTreeOperations*.js/.test.js`; defer Gateway/public/build/Cypress/Swagger.
- [x] Run existing target `node --test` baseline and confirm the suite is not 0 tests.

## 2. TypeScript source and generation

- [x] Add change-scoped TypeScript config/declarations for Bruno WeCom and organization helper sources without touching `node-globals.d.ts` or README.
- [x] Add `.ts` source counterparts for target helper and test entries.
- [x] Verify TypeScript source emits CommonJS `.js` entries reproducibly and generated JS has no non-expected diff.

## 3. Validation and RC delivery

- [x] Run target OpenSpec strict validation.
- [x] Run target `node --test` suites against generated `.test.js` entries and confirm non-zero tests.
- [x] Run TypeScript source-to-JS consistency check.
- [x] Run `git diff --check origin/hfl-test-base..HEAD`.
- [x] Run `openspec validate --changes --strict` and `openspec validate --specs --strict`.
- [x] Update `verification.md` and create a single RC commit; work branch push is reported in the RC handoff.
