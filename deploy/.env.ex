# 将此示例复制为私有的 deploy/.env 文件，并替换所有占位值。
# 严禁提交 deploy/.env，以及任何真实密码、令牌或私有端点。
# 启动命令：
# docker compose --env-file deploy/.env -f deploy/docker-compose.remote-db.yml up -d

COMPOSE_PROJECT_NAME=aicodex-admin
AICODEX_ADMIN_IMAGE=aicodex-admin:latest
AICODEX_ADMIN_RESTART_POLICY=always
AICODEX_ADMIN_HTTP_PORT=8000
AICODEX_ADMIN_ORIGIN=https://admin.example.test
AICODEX_ADMIN_ORIGIN_FRONTEND=https://admin.example.test
AICODEX_ADMIN_DEFAULT_LANGUAGE=zh
# 留空时允许用户切换语言；设置为 zh 或 en 时强制使用指定语言。
AICODEX_ADMIN_FORCE_LANGUAGE=

# 可选的宿主机路径；相对路径以 deploy/ 目录为基准解析。
AICODEX_ADMIN_UPLOAD_DIR=./data/upload-files
AICODEX_ADMIN_LOG_DIR=./runtime/logs
AICODEX_ADMIN_TMP_DIR=./runtime/tmp

# 远程 PostgreSQL 连接配置。
# 远程数据库已存在或数据库用户无建库权限时，保持为 false。
AICODEX_CREATE_DATABASE=false
AICODEX_DB_DRIVER=postgres
AICODEX_DB_HOST=postgres.example.test
AICODEX_DB_PORT=5432
AICODEX_DB_USER=aicodex_admin
AICODEX_DB_PASSWORD=replace_with_private_database_password
AICODEX_DB_NAME=aicodex_admin

# 远程服务器要求 SSL 时，使用 require 或 verify-full。
AICODEX_DB_SSLMODE=disable

# 可选的 lib/pq 连接参数，例如 connect_timeout=10 或 search_path=public。
AICODEX_DB_EXTRA_OPTIONS=connect_timeout=10

# Insight 提供方的 Bearer 令牌校验配置。
# 这些值会传递给 Go 服务使用的小驼峰配置项。
AICODEX_INSIGHT_PROVIDER_ALLOWED_AUDIENCES=aicodex-insight
AICODEX_INSIGHT_PROVIDER_ALLOWED_ISSUERS=https://admin.example.test
AICODEX_INSIGHT_PROVIDER_REQUIRED_SCOPES=profile insight.scope.read

# Insight 用量身份解析器。端点和令牌默认留空，以保留手工映射行为。
# 端点示例：https://insight.example.test/api/usage-identity-provider/v1/resolve
# 令牌格式示例：change_me（只能在私有 deploy/.env 文件中替换）。
AICODEX_INSIGHT_USAGE_IDENTITY_RESOLVER_ENDPOINT=
AICODEX_INSIGHT_USAGE_IDENTITY_RESOLVER_TOKEN=
AICODEX_INSIGHT_USAGE_IDENTITY_RESOLVER_CALLER=aicodex-admin
AICODEX_INSIGHT_USAGE_IDENTITY_RESOLVER_MAX_ITEMS=200
AICODEX_INSIGHT_USAGE_IDENTITY_RESOLVER_TIMEOUT_MS=5000

# Gateway 组织投影发布与刷新配置。
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
