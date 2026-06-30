## Verification

Date: 2026-06-30

Preview URL: `http://127.0.0.1:7003`

### Commands

- `openspec validate fix-admin-large-edit-page-double-card-shell --strict`
- `git diff --check`
- `yarn test --watchAll=false ManagementPage.shell.test.tsx OrganizationEditPage.test.tsx UserEditPage.test.tsx`
- `node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`
- `yarn typecheck`
- `yarn build`

### Browser Smoke

Local dev server: `local-dev/start-frontend-remote-backend.ps1 start -Port 7003 ... -SkipHealth`

Smoke used Playwright with safe local API fixtures, no token/Cookie/private backend data.

Report:

- `D:\CodeRepo\LeagProject\aicodex-2\aicodex-admin\output\playwright\large-edit-page-smoke.json`

Screenshots:

- `D:\CodeRepo\LeagProject\aicodex-2\aicodex-admin\output\playwright\organization-edit-1280.png`
- `D:\CodeRepo\LeagProject\aicodex-2\aicodex-admin\output\playwright\organization-edit-1920.png`
- `D:\CodeRepo\LeagProject\aicodex-2\aicodex-admin\output\playwright\user-edit-1280.png`
- `D:\CodeRepo\LeagProject\aicodex-2\aicodex-admin\output\playwright\user-edit-1920.png`

Evidence summary:

| Route | Viewport | route scroll class | `.content-warp-card` | inner edit card | overflowX | label width |
| --- | --- | --- | ---: | ---: | --- | ---: |
| `/organizations/built-in` | 1280x900 | `admin-shell-route-scroll admin-shell-route-scroll-without-card` | 0 | 1 | false | 184 |
| `/organizations/built-in` | 1920x1080 | `admin-shell-route-scroll admin-shell-route-scroll-without-card` | 0 | 1 | false | 184 |
| `/users/built-in/admin` | 1280x900 | `admin-shell-route-scroll admin-shell-route-scroll-without-card` | 0 | 1 | false | 84 |
| `/users/built-in/admin` | 1920x1080 | `admin-shell-route-scroll admin-shell-route-scroll-without-card` | 0 | 1 | false | 137 |

Known existing browser warnings observed during smoke:

- React warning for legacy `scrollWidth` DOM prop.
- AntD deprecation warnings for `Input.Group` and `dropdownMatchSelectWidth`.
- Existing AntD `Form.Item` single-child warning on the user edit form.

These warnings are existing legacy edit-page warnings and were not introduced by the shell wrapper change.
