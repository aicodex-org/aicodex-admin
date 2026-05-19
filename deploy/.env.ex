# Copy this file to deploy/.env and replace the placeholder values before deploying.
# Start with:
# docker compose --env-file deploy/.env -f deploy/docker-compose.remote-db.yml up -d

AICODEX_ADMIN_IMAGE=aicodex-admin:latest
AICODEX_ADMIN_HTTP_PORT=8000

# Remote PostgreSQL connection.
# Keep this false when the remote database already exists or the DB user cannot create databases.
AICODEX_CREATE_DATABASE=false
AICODEX_DB_DRIVER=postgres
AICODEX_DB_HOST=your-postgres-host.example.com
AICODEX_DB_PORT=5432
AICODEX_DB_USER=aicodex_admin
AICODEX_DB_PASSWORD=change_me
AICODEX_DB_NAME=aicodex_admin

# Use require/verify-full if the remote server requires SSL.
AICODEX_DB_SSLMODE=disable

# Optional lib/pq connection options, for example: connect_timeout=10 or search_path=public.
AICODEX_DB_EXTRA_OPTIONS=connect_timeout=10
