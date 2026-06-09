# aicodex-admin

`aicodex-admin` is the admin console and identity access service for the AICodex platform. It provides a web UI and backend services for authentication, authorization, user management, provider configuration, audit-oriented administration, and AI-enabled operation workflows.

## Repository

- GitHub remote: `https://github.com/aicodex-org/aicodex-admin.git`
- Leagsoft remote: `https://git.leagsoft.com/aicodex/aicodex-admin.git`
- Docker image name: `aicodex-admin`

## Project Structure

- `admin/`: Go backend service.
- `web-admin/`: React-based admin web console.
- `deploy/`: Docker, Docker Compose, Kubernetes, and runtime configuration templates.
- `openspec/`: Change proposals, design notes, and implementation tasks.
- `designs/`: Brand and icon source assets.

## Development

### Local Dev Workflow

Windows local development can use the repository-local helper scripts:

```powershell
Copy-Item .\local-dev\runtime.toml.example .\local-dev\runtime.toml
# edit local-dev/runtime.toml with remote PostgreSQL settings
.\local-dev\start-windows-local-dev.ps1 start
```

The helper runs the Go backend on `http://localhost:8000` and the React dev server on `http://localhost:7002`. See `local-dev/README.md` for runtime profile details, status, logs, and troubleshooting commands.

### Backend

```bash
cd admin
go test ./...
go run ./main.go
```

### Frontend

```bash
cd web-admin
yarn
yarn start
```

### Full Image Build

```bash
./deploy/build_image.sh aicodex-admin latest
```

## Deploy

Docker Compose example:

```bash
docker compose -f deploy/docker-compose.yml up -d
```

Docker Compose with remote PostgreSQL, without starting a local database:

```bash
cp deploy/.env.ex deploy/.env
# edit deploy/.env with the remote database host, user, password, and database name
docker compose --env-file deploy/.env -f deploy/docker-compose.remote-db.yml up -d
```

Kubernetes example manifests are available in `deploy/k8s.yaml`. Update image registry, ingress, storage, and database settings for the target environment before production deployment.

## WeCom Sensitive Profile Consent Login Notes

- Homepage WeCom sign-in now uses an OAuth2 sensitive-profile consent QR code as the primary path for `WeCom + Internal + Normal` providers.
- The QR code points to the WeCom OAuth2 authorize endpoint with `scope=snsapi_privateinfo`; the backend callback is `/api/wecom-profile-consent/callback` under the actual login origin.
- The legacy PC Web login widget is still available as a compatibility fallback. It can complete WeCom identity login, but it must not be treated as the source of phone, email, business email, `user_ticket`, or avatar fields.
- Logged-in users can open `/account` and use the WeCom profile sync action to refresh provider-side profile attributes. The sync action requires an existing, unique WeCom identity for the current account.
- Local `Phone` and `Email` are only filled when empty. Existing local contact fields are not overwritten by WeCom profile consent login or profile sync.
- Do not write real Corp IDs, Agent IDs, Secrets, authorization codes, tokens, phone numbers, email addresses, or private environment URLs into docs, commits, screenshots, or test fixtures.

### Current Support Matrix

- `Internal + Normal`: primary supported path for OAuth2 sensitive-profile consent login and logged-in profile sync.
- `Internal + Silent`: configuration compatibility only; it is not the sensitive-profile QR login path.
- `Third-party + Normal`: compatibility is retained, but sensitive-profile QR login is not the rollout-default path.
- `Third-party + Silent`: compatibility only; do not treat it as a rollout-default mode.

### Manual Validation Checklist

1. In the application settings, add `WeCom` to `Signin methods`.
2. In the provider settings, create or update a `WeCom` OAuth provider with `Sub type = Internal` and `Method = Normal`.
3. Fill the provider with the target Corp ID, Secret, and Agent ID. Keep concrete values in private environment/configuration stores, not in repository docs.
4. In WeCom admin, configure the login origin as the trusted OAuth2 callback domain for the self-built application.
5. Bind the provider to the target application and make sure the provider is visible for sign-in.
6. Open the login page, select WeCom, and verify that the primary panel creates a login intent and renders an OAuth2 sensitive-profile consent QR code.
7. Scan the QR code with the WeCom mobile client, approve the consent prompt if it is shown, and confirm the mobile callback page says authorization is complete.
8. If WeCom directly shows authorization complete because the member has previously authorized this application, verify the backend accepted a `user_ticket` and returned only the profile fields allowed by the member's current sensitive-information settings.
9. Return to the PC login page and confirm it completes the local login, including `NextMfa` / `RequiredMfa` behavior when the account policy requires MFA.
10. After login, open `/account`, run WeCom profile sync, scan the new QR code, and confirm provider-side phone, email, business email, and avatar attributes refresh when WeCom returns them.
11. Confirm local phone and email fields are filled only if they were empty before sync; pre-existing local contact values must remain unchanged.
12. If the OAuth2 QR path fails, retry with the compatibility PC Web login fallback and verify that fallback copy makes no promise about sensitive profile fields.

## License

Apache-2.0
