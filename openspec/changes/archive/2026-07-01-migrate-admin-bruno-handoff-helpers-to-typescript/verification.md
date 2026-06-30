## Scope

- change_id: `migrate-admin-bruno-handoff-helpers-to-typescript`
- chosen_batch: Gateway projection Bruno handoff helpers under `api-tests/bruno/aicodex-admin/scripts/gatewayProjection*.js`
- source files: `api-tests/bruno/aicodex-admin/scripts/gatewayProjection*.ts`
- generated runtime entrypoints: `api-tests/bruno/aicodex-admin/scripts/gatewayProjection*.js`
- Node/Bruno compatibility: existing `require("./gatewayProjection...")` and `node --test api-tests/bruno/aicodex-admin/scripts/gatewayProjection*.test.js` entrypoints remain CommonJS `.js`.

## TS Source To Generated JS Strategy

The Gateway projection helper batch now treats `.ts` as the editable source and committed `.js` as generated CommonJS output. Generation uses the scoped config:

```powershell
node web-admin/node_modules/typescript/lib/tsc.js -p api-tests/bruno/aicodex-admin/scripts/gatewayProjection.tsconfig.json
```

The output consistency check reruns TypeScript generation and requires no generated JavaScript drift:

```powershell
git diff --exit-code -- api-tests/bruno/aicodex-admin/scripts/gatewayProjection*.js
```

The scoped TypeScript config only includes `gatewayProjection*.ts` and `node-globals.d.ts`; it does not touch `web-admin/**`, public auth scripts, Cypress, build tooling, WeCom helper scripts, organization tree helper scripts, Bruno request definitions, remote environments, DB fixtures, or real runtime configuration.

## Validation Commands

Run from repository root:

```powershell
openspec validate migrate-admin-bruno-handoff-helpers-to-typescript --strict
git diff --check origin/hfl-test-base..HEAD
$files = Get-ChildItem 'api-tests\bruno\aicodex-admin\scripts' -Filter 'gatewayProjection*.test.js' | Sort-Object Name | ForEach-Object { $_.FullName }
node --test @files
node web-admin/node_modules/typescript/lib/tsc.js -p api-tests/bruno/aicodex-admin/scripts/gatewayProjection.tsconfig.json
git diff --exit-code -- api-tests/bruno/aicodex-admin/scripts/gatewayProjection*.js
openspec validate --changes --strict
openspec validate --specs --strict
```

## Latest RC Evidence

- `openspec validate migrate-admin-bruno-handoff-helpers-to-typescript --strict`: passed.
- `git diff --check origin/hfl-test-base..HEAD`: passed.
- Gateway projection focused Node tests: `node --test @files` ran 152 tests, 0 failures.
- TypeScript generation: `node web-admin/node_modules/typescript/lib/tsc.js -p api-tests/bruno/aicodex-admin/scripts/gatewayProjection.tsconfig.json` passed.
- Generated JS consistency: `git diff --exit-code -- api-tests/bruno/aicodex-admin/scripts/gatewayProjection*.js` passed.
- `openspec validate --changes --strict`: 4 changes passed, 0 failed.
- `openspec validate --specs --strict`: 30 specs passed, 0 failed.

## Deferred

- `api-tests/bruno/aicodex-admin/scripts/wecomSource*.js` and `wecomSource*.test.js` remain JavaScript for a later WeCom source helper migration.
- Organization tree Bruno helper scripts remain out of scope.
- No browser smoke or `yarn build` is required for this RC because the change does not touch UI, routing, `web-admin/**`, frontend build tooling, or runtime API behavior.

## Safety Notes

- This RC does not archive the OpenSpec change, merge into `hfl-test-base`, delete the work branch, or push/merge `test`.
- This RC does not access or modify 60 environment state, DB, fixtures, secrets, raw payloads, complete private URLs, real accounts, or complete organization trees.
