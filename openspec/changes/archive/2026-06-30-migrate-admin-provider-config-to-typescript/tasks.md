## 1. Provider helpers and field components

- [x] 1.1 Rename `LarkProviderUtils.js` and `WeComProviderUtils.js` to `.ts`, add local provider/helper types, and preserve validation/callback URL behavior.
- [x] 1.2 Rename `LarkProviderGuide.js` and all targeted `*ProviderFields.js` files to `.tsx`, add local prop/callback types, and preserve existing render function APIs.
- [x] 1.3 Rename focused provider tests for touched utils/field guide files to `.test.ts` / `.test.tsx`.

## 2. Provider edit page

- [x] 2.1 Rename `ProviderEditPage.js` to `ProviderEditPage.tsx`, add local props/state/provider/API response types, and preserve extensionless import compatibility.
- [x] 2.2 Rename `ProviderEditPage.test.js` to `.test.tsx` if touched, preserving existing assertions and mocks.

## 3. Verification and closeout evidence

- [x] 3.1 Run focused Jest tests for `ProviderEditPage`, `OAuthProviderFields`, `LarkProviderUtils`, `LarkProviderGuide`, and any touched provider tests.
- [x] 3.2 Run `openspec validate migrate-admin-provider-config-to-typescript --strict`, `git diff --check origin/hfl-test-base..HEAD`, `yarn typecheck`, `node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`, and `yarn build`.
- [x] 3.3 Update `verification.md` with command evidence, deferred files if any, remaining risks, and sensitive-data-safe notes.
