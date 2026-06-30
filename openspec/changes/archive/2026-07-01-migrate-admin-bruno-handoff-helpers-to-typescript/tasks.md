## 1. Baseline and Prototype

- [x] 1.1 Run the existing Gateway projection helper test batch and record the baseline suite/test count.
- [x] 1.2 Inspect representative Gateway helper/test module shape and choose the minimal TypeScript source plus CommonJS output pattern.
- [x] 1.3 Prototype one Gateway helper as `.ts` source with generated `.js` output and verify its existing `.test.js` still passes.

## 2. Gateway Batch Migration

- [x] 2.1 Migrate the selected `gatewayProjection*.js` helper batch to `.ts` source while preserving generated CommonJS `.js` entrypoints.
- [x] 2.2 Add or update a scoped generation/check command for the Gateway helper batch without introducing production dependencies.
- [x] 2.3 Keep existing `gatewayProjection*.test.js` Node test entrypoints compatible and avoid changing helper business semantics.
- [x] 2.4 Document deferred WeCom source helper migration and any generation/check command needed for maintainers.

## 3. Validation and RC Delivery

- [x] 3.1 Validate OpenSpec for `migrate-admin-bruno-handoff-helpers-to-typescript`.
- [x] 3.2 Run `git diff --check origin/hfl-test-base..HEAD`.
- [x] 3.3 Run the migrated Gateway projection `node --test` batch with real suites/tests.
- [x] 3.4 Run the TS source-to-JS generation/check command and verify no generated output drift remains.
- [x] 3.5 Run `openspec validate --changes --strict` and `openspec validate --specs --strict`.
- [x] 3.6 Commit and push only the RC work branch for master review, without archive, base merge, branch deletion, or `test` push.
