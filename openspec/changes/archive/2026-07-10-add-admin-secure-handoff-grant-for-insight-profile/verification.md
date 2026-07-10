# Verification

## 2026-07-09

- Closeout scope note:
  - 60 联调已验证 Admin secure handoff access package / redeem / confirm contract 返回 200，可作为本 change 的运行态验收依据。
  - Closeout 前另见 Admin provider runtime `current-user/scope` 路径出现 `mappingStatus=MISSING` / `PROVIDER_UNAVAILABLE`，而 `current-user` 路径正常。代码范围复核显示本 change 未修改 `GetInsightCurrentUserScope`、`insight_provider.go` 映射逻辑或 `/api/admin-provider/insight/v1/current-user/scope` 路由；本 change 仅新增 `/api/insight-admin-provider/handoff/*` secure handoff 路由和交接包能力。因此该 503 记录为独立 provider runtime/mapping 风险，不作为 secure handoff package/redeem/confirm closeout 的阻塞项。
- Follow-up for Insight redeem nonce compatibility:
  - Root cause: Admin `secureHandoffGrant` envelope did not expose the issued one-time `nonce`, while the Admin redeem path requires a nonce and Insight now forwards `secureHandoffGrant.nonce`.
  - Fix: Admin now issues a short-TTL nonce at grant creation, persists it with the grant record, includes it in the operator-facing redacted envelope, and rejects redeem requests whose nonce does not match the issued nonce. The copied Insight Admin access package includes `secureHandoffGrant.nonce` but still excludes credential material and raw secrets.
  - Focused validation:
    - RED: `go test ./object ./controllers -run "Test(AdminSecureHandoffGrant|CreateInsightAdminProviderAccessPackage)" -count=1 -vet=off -timeout 90s` from `admin/` failed because `AdminSecureHandoffGrantEnvelope` had no `Nonce` field.
    - GREEN: `go test ./object ./controllers -run "Test(AdminSecureHandoffGrant|CreateInsightAdminProviderAccessPackage)" -count=1 -vet=off -timeout 90s` from `admin/` PASS.
    - `yarn test --runTestsByPath src/ApplicationUsageAccessPage.test.tsx src/ApplicationAccessCenter.test.tsx --runInBand --watchAll=false` from `web-admin/` PASS, 2 suites / 25 tests.
    - `openspec validate add-admin-secure-handoff-grant-for-insight-profile --strict` PASS.
    - `node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base` from `web-admin/` PASS.
    - `yarn typecheck` from `web-admin/` PASS.
    - `yarn build` from `web-admin/` PASS.
    - `git diff --check` PASS.
- Follow-up for 7016 preview error:
  - Root cause: the access-package controller factory wired `secureHandoffGrant` issuance to legacy `insightUsageIdentityResolverToken`, so a missing legacy resolver token made the new P0 access package fail with credential-source unavailable.
  - Fix: controller now uses the Admin secure handoff default issuer/store path; legacy resolver `credentialReferenceStatus=missing` is normalized as a fallback gap and no longer blocks combined package generation.
  - Focused validation:
    - `openspec validate add-admin-secure-handoff-grant-for-insight-profile --strict` PASS.
    - `go test ./object ./controllers -run 'Test(AdminSecureHandoffGrant|CreateInsightAdminProviderAccessPackage)' -count=1 -vet=off -timeout 90s` from `admin/` PASS.
    - `yarn test --runTestsByPath src/ApplicationUsageAccessPage.test.tsx src/ApplicationAccessCenter.test.tsx --runInBand --watchAll=false` from `web-admin/` PASS, 2 suites / 25 tests.
    - `node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base` from `web-admin/` PASS.
    - `yarn typecheck` from `web-admin/` PASS.
    - `TSC_COMPILE_ON_ERROR=true NODE_OPTIONS=--max_old_space_size=8192 yarn build` from `web-admin/` PASS.
    - `git diff --check` PASS.
- Follow-up for Insight owner registry import compatibility:
  - Package shape delta: `secureHandoffGrant` now includes common `ownerRegistry` object with `trustedEndpointAlias=admin-secure-handoff`, `audience` aligned to the grant redeem audience, `serviceIdentity=svc:aicodex-admin`, `endpointReadiness=ready`, and `targetRegistrationStatus=approved`; `ownerRegistryReadiness` remains for compatibility.
  - `openspec validate add-admin-secure-handoff-grant-for-insight-profile --strict` PASS.
  - `go test ./object ./controllers -run 'Test(AdminSecureHandoffGrant|CreateInsightAdminProviderAccessPackage)' -count=1 -vet=off -timeout 90s` from `admin/` PASS.
  - `yarn test --runTestsByPath src/ApplicationUsageAccessPage.test.tsx src/ApplicationAccessCenter.test.tsx --runInBand --watchAll=false` from `web-admin/` PASS, 2 suites / 25 tests.
  - `node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base` from `web-admin/` PASS.
  - `yarn typecheck` from `web-admin/` PASS.
  - `git diff --check` PASS.

- `openspec validate add-admin-secure-handoff-grant-for-insight-profile --strict`
  - Result: PASS.
- `go test ./object -run TestAdminSecureHandoffGrant -count=1 -vet=off` from `admin/`
  - Result: PASS, including DB-backed grant persistence across service instances.
- `go test ./controllers -run 'Test(CreateInsightAdminProviderAccessPackage|AdminSecureHandoffGrantControllerLifecycleReturnsMaterialOnlyOnRedeem)' -count=1 -vet=off` from `admin/`
  - Result: PASS, including Insight common envelope package shape.
- `go test ./object ./controllers -run 'Test(AdminSecureHandoffGrant|CreateInsightAdminProviderAccessPackage)' -count=1 -vet=off` from `admin/`
  - Result: PASS.
- `CI=true yarn test --runTestsByPath src/ApplicationUsageAccessPage.test.tsx src/ApplicationAccessCenter.test.tsx --runInBand --watchAll=false` from `web-admin/`
  - Result: PASS, 2 suites / 22 tests.
- `node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base` from `web-admin/`
  - Result: PASS.
- `yarn typecheck` from `web-admin/`
  - Result: PASS.
- `git diff --check`
  - Result: PASS.
- `TSC_COMPILE_ON_ERROR=true NODE_OPTIONS=--max_old_space_size=8192 yarn build` from `web-admin/`
  - Initial standard rerun failed during the production build when `fork-ts-checker-webpack-plugin` child process exited with Windows code `3221226505`.
  - Final rerun with CRA's existing `TSC_COMPILE_ON_ERROR=true` plus `NODE_OPTIONS=--max_old_space_size=8192` completed successfully. Independent `yarn typecheck` passed before this build, so this only isolates the Windows/Node v24 fork-checker crash and does not mask TypeScript errors.

## Safety Notes

- Operator-facing access package uses the Insight common envelope (`schemaVersion`, `target`, `copySafeHandoff`, `secureHandoffGrant`) and keeps `copySafeMetadata` only as a compatibility mirror.
- Admin grant lifecycle defaults to DB/xorm persistence; memory store remains test-only injection.
- Operator-facing access package includes copy-safe metadata and a redacted `secureHandoffGrant` envelope only.
- `credentialMaterial` is returned only by the redeem response path and is omitted from status, confirm, fail, revoke, UI package, and tests asserting copied JSON.
- Build and test evidence intentionally avoids raw tokens, cookies, Authorization values, full private URLs, raw payloads, full secret references, real accounts, and full organization trees.
