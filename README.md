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

Kubernetes example manifests are available in `deploy/k8s.yaml`. Update image registry, ingress, storage, and database settings for the target environment before production deployment.

## WeCom Web Login Notes

- Homepage QR sign-in in this repo is designed around the internal WeCom web login flow: `WeCom + Internal + Normal`.
- In the provider settings, configure `Corp ID`, `Secret`, and `Agent ID`, and use the callback URL: `/callback` under the actual login origin.
- Before testing, make sure the same origin is configured in WeCom admin as the trusted domain / callback domain for web login.
- `Third-party` and `Silent` modes are kept for compatibility, but the primary homepage QR login path is the internal normal flow.

### Current Support Matrix

- `Internal + Normal`: primary homepage QR login path, recommended for rollout.
- `Internal + Silent`: configuration is supported, but it is not the homepage QR-login path in this iteration.
- `Third-party + Normal`: compatibility is retained, but homepage QR rendering is not the primary acceptance path.
- `Third-party + Silent`: compatibility only; do not treat it as a rollout-default mode.

### Manual Validation Checklist

1. In the application settings, add `WeCom` to `Signin methods`.
2. In the provider settings, create or update a `WeCom` OAuth provider with `Sub type = Internal` and `Method = Normal`.
3. Fill `Corp ID`, `Secret`, `Agent ID`, and keep the callback URL at `https://<your-login-origin>/callback`.
4. In WeCom admin, configure the same login origin as the trusted domain / callback domain for web login.
5. Bind the provider to the target application and make sure the provider is visible for sign-in.
6. Open the login page and confirm the WeCom entry appears either as a tab or as a dedicated login-page panel.
7. Scan the QR code with WeCom and verify the callback returns to `/callback` with `auth_code` and successfully lands in the authenticated page.
8. If QR rendering fails, confirm the fallback warning appears and the provider configuration matches `Internal + Normal`.

## License

Apache-2.0
