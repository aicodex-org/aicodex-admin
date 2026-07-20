# Copy this example to the private deploy/.env file and replace all placeholders.
# Never commit deploy/.env or any real password, token, or private endpoint.
# Start with:
# docker compose --env-file deploy/.env -f deploy/docker-compose.remote-db.yml up -d

COMPOSE_PROJECT_NAME=aicodex-admin
AICODEX_ADMIN_IMAGE=aicodex-admin:latest
AICODEX_ADMIN_RESTART_POLICY=always
AICODEX_ADMIN_HTTP_PORT=8000
AICODEX_ADMIN_ORIGIN=https://admin.example.test
AICODEX_ADMIN_ORIGIN_FRONTEND=https://admin.example.test
AICODEX_ADMIN_DEFAULT_LANGUAGE=zh
# Leave empty to allow users to switch languages; set zh or en to force one language.
AICODEX_ADMIN_FORCE_LANGUAGE=

# Optional host paths; relative paths are resolved from deploy/.
AICODEX_ADMIN_UPLOAD_DIR=./data/upload-files
AICODEX_ADMIN_LOG_DIR=./runtime/logs
AICODEX_ADMIN_TMP_DIR=./runtime/tmp

# Remote PostgreSQL connection.
# Keep this false when the remote database already exists or the DB user cannot create databases.
AICODEX_CREATE_DATABASE=false
AICODEX_DB_DRIVER=postgres
AICODEX_DB_HOST=postgres.example.test
AICODEX_DB_PORT=5432
AICODEX_DB_USER=aicodex_admin
AICODEX_DB_PASSWORD=replace_with_private_database_password
AICODEX_DB_NAME=aicodex_admin

# Use require/verify-full if the remote server requires SSL.
AICODEX_DB_SSLMODE=disable

# Optional lib/pq connection options, for example: connect_timeout=10 or search_path=public.
AICODEX_DB_EXTRA_OPTIONS=connect_timeout=10

# Insight provider bearer token validation.
# These values are passed to lower-camel config keys used by the Go service.
AICODEX_INSIGHT_PROVIDER_ALLOWED_AUDIENCES=aicodex-insight
AICODEX_INSIGHT_PROVIDER_ALLOWED_ISSUERS=https://admin.example.test
AICODEX_INSIGHT_PROVIDER_REQUIRED_SCOPES=profile insight.scope.read

# Insight usage identity resolver. Keep endpoint/token empty to preserve manual mapping by default.
# Example endpoint: https://insight.example.test/api/usage-identity-provider/v1/resolve
# Example token format: change_me (replace it only in the private deploy/.env file).
AICODEX_INSIGHT_USAGE_IDENTITY_RESOLVER_ENDPOINT=
AICODEX_INSIGHT_USAGE_IDENTITY_RESOLVER_TOKEN=
AICODEX_INSIGHT_USAGE_IDENTITY_RESOLVER_CALLER=aicodex-admin
AICODEX_INSIGHT_USAGE_IDENTITY_RESOLVER_MAX_ITEMS=200
AICODEX_INSIGHT_USAGE_IDENTITY_RESOLVER_TIMEOUT_MS=5000

# Gateway organization projection publishing and refresh.
AICODEX_GATEWAY_ORGANIZATION_PROJECTION_ENABLED=false
AICODEX_GATEWAY_ORGANIZATION_PROJECTION_ENDPOINT=https://gateway.example.test/api/gateway-organization-projection/v1/batches
AICODEX_GATEWAY_ORGANIZATION_PROJECTION_TOKEN=replace_with_private_gateway_projection_token
AICODEX_GATEWAY_ORGANIZATION_PROJECTION_CALLER=aicodex-admin
AICODEX_GATEWAY_ORGANIZATION_PROJECTION_TIMEOUT_MS=5000
AICODEX_GATEWAY_ORGANIZATION_PROJECTION_FRESHNESS_TTL_SECONDS=1800
AICODEX_GATEWAY_ORGANIZATION_PROJECTION_MAX_RETRIES=1
AICODEX_GATEWAY_ORGANIZATION_PROJECTION_REFRESH_ENABLED=false
AICODEX_GATEWAY_ORGANIZATION_PROJECTION_REFRESH_INTERVAL_SECONDS=900
AICODEX_GATEWAY_ORGANIZATION_PROJECTION_REFRESH_INITIAL_DELAY_SECONDS=60
AICODEX_GATEWAY_ORGANIZATION_PROJECTION_REFRESH_BATCH_SIZE=50
