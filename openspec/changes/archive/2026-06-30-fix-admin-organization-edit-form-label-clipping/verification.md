## Verification

### Root Cause

- `OrganizationEditPage.tsx` does not use AntD `Form` `labelCol`/`wrapperCol` for the affected rows.
- The organization edit form is rendered with top-level AntD `Row`/`Col`; desktop labels use `span={2}`, leaving about 8.33% width for long Chinese labels.
- Recent organization list/shell styles did not provide evidence of leaking into the edit page. The fix is scoped to `organization-edit-page` / `organization-edit-card`.

### Automated Checks

- Red test:
  - `yarn test src/OrganizationEditPage.test.tsx --watchAll=false --runInBand`
  - Expected failure before implementation: missing `.organization-edit-page`.
- Green focused test:
  - `yarn test src/OrganizationEditPage.test.tsx --watchAll=false --runInBand`
  - Result: 8 tests passed.
- `openspec validate fix-admin-organization-edit-form-label-clipping --strict`
  - Result: passed.
- `git diff --check`
  - Result: passed.
- `yarn typecheck`
  - Result: passed.
- `node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`
  - Result: passed with exit code 0.
- `yarn build`
  - Result: passed. Existing CRA bundle-size and browserslist notices were reported.

### Browser Smoke

- Started local web-admin frontend with `local-dev/start-frontend-remote-backend.ps1` on `http://127.0.0.1:7004/`, proxying to the 60 test backend. Backend URL and credentials were not recorded.
- Opened `http://127.0.0.1:7004/organizations/built-in` at a 1280 x 720 viewport.
- DOM geometry check for `密码类型`、`密码Salt值`、`密码复杂度选项`、`密码过期天数`:
  - label width: 184px
  - `clipped=false`
  - `overlap=false`
  - page horizontal overflow: `false`
- Screenshot evidence, not committed:
  - `D:\CodeRepo\LeagProject\aicodex-0\aicodex-admin\output\playwright\fix-admin-organization-edit-form-label-clipping\.playwright-cli\page-2026-06-30T12-27-22-372Z.png`
- Residual browser console note:
  - Existing React warning from `NavItemTree` / AntD Tree `scrollWidth` prop. It is unrelated to the organization edit label scoped style.
