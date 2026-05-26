## Insight Admin Provider 联调样例

### 本地收尾验证

验证日期：2026-05-25

当前分支和提交：

```text
branch: hfl-test/add-insight-admin-provider-wrapper
latest commit: 以当前分支 HEAD 为准
```

OpenSpec tasks 状态：

```text
openspec instructions apply --change add-insight-admin-provider-wrapper --json
progress: 18/18 complete, remaining 0
state: all_done
```

OpenSpec strict 校验：

```text
openspec validate add-insight-admin-provider-wrapper --strict
Change 'add-insight-admin-provider-wrapper' is valid
```

admin 控制器测试：

```text
cd admin
go test ./controllers -count=1 -vet=off -timeout 5m
ok  	git.leagsoft.com/aicodex/aicodex-admin/controllers	0.433s
```

### 鉴权配置

生产环境建议使用 admin 颁发给 insight client 的用户访问令牌，并配置以下校验点：

```ini
insightProviderAllowedAudiences = insight-client
insightProviderAllowedIssuers = https://admin.example.test
insightProviderRequiredScopes = profile insight.scope.read
```

Bearer token 路径必须显式配置 `insightProviderAllowedAudiences`；未配置时 provider 会拒绝 token 调用，避免任意 admin client token 被误用。本地调试可复用已登录 session；生产联调应优先使用 `Authorization: Bearer <access-token>`。

Docker Compose 部署时通过以下环境变量透传到同名配置项；若 insight OIDC client 暂未申请 `insight.scope.read`，联调阶段可先把 required scopes 收敛为 `profile`，避免因 scope 不一致误判 provider 不可用：

```env
AICODEX_INSIGHT_PROVIDER_ALLOWED_AUDIENCES=aicodex-insight
AICODEX_INSIGHT_PROVIDER_ALLOWED_ISSUERS=http://10.18.80.69:8000
AICODEX_INSIGHT_PROVIDER_REQUIRED_SCOPES=profile
```

### 本地最小 smoke test

若本机没有 MySQL/PostgreSQL 或 Docker，可用 SQLite 临时库启动 admin 后端，只验证 provider 路由、统一错误 envelope 和审计日志是否可达：

```powershell
cd admin
$env:driverName = "sqlite"
$env:dataSourceName = "file:../output/insight-provider-runtime.db?cache=shared"
$env:dbName = ""
$env:initDataFile = ""
go run ./main.go -createDatabase=false
```

未携带 token 或登录态时，三条 provider 路由都应返回 `401`，错误码为 `UNAUTHENTICATED`，并在日志中写入 `insight_admin_provider_audit`。该 smoke test 只验证路由、错误语义和日志链路；成功身份、scope 和映射场景仍需使用真实 admin access token 联调。

### GET /api/admin-provider/insight/v1/current-user

```http
GET /api/admin-provider/insight/v1/current-user HTTP/1.1
Host: admin.example.test
Authorization: Bearer <access-token>
X-Request-Id: trace-demo-001
```

```json
{
  "status": "ok",
  "traceId": "trace-demo-001",
  "data": {
    "adminUserId": "org-a/alice",
    "username": "alice",
    "displayName": "Alice",
    "organization": "org-a",
    "apiOrganizationId": "00000000-0000-7000-8000-000000000123",
    "roles": ["org-a/insight-admin"],
    "groups": [
      {
        "departmentId": "org-a/dev",
        "departmentName": "Development"
      }
    ],
    "usageIdentity": {
      "apiUserId": "101",
      "mappingStatus": "OK",
      "mappingSource": "properties.aicodexApiUserId"
    },
    "generatedAt": "2026-05-21T08:00:00Z"
  }
}
```

### GET /api/admin-provider/insight/v1/current-user/scope

```http
GET /api/admin-provider/insight/v1/current-user/scope HTTP/1.1
Host: admin.example.test
Authorization: Bearer <access-token>
X-Request-Id: trace-demo-002
```

```json
{
  "status": "ok",
  "traceId": "trace-demo-002",
  "data": {
    "adminUserId": "org-a/alice",
    "scopeType": "DEPARTMENT_TREE",
    "organization": "org-a",
    "apiOrganizationId": "00000000-0000-7000-8000-000000000123",
    "departmentIds": ["org-a/dev"],
    "adminUserIds": ["org-a/bob", "org-a/cindy"],
    "apiUserIds": ["102", "103"],
    "departments": [
      {
        "departmentId": "org-a/dev",
        "adminUserIds": ["org-a/bob", "org-a/cindy"],
        "apiUserIds": ["102", "103"],
        "includeChildDepartments": true,
        "mappingStatus": "OK"
      }
    ],
    "includeChildDepartments": true,
    "mappingStatus": "OK",
    "generatedAt": "2026-05-21T08:00:00Z",
    "scopeVersion": "2026-05-21"
  }
}
```

映射缺失或歧义时不要降级成空 scope：

```json
{
  "status": "error",
  "traceId": "trace-demo-003",
  "error": {
    "code": "AUTHORIZATION_FAILED",
    "message": "usage user mapping is not deterministic",
    "traceId": "trace-demo-003",
    "mappingStatus": "MISSING"
  }
}
```

说明：`organization` 仍表示 admin 自身权限域名称，`apiOrganizationId` 才表示 `aicodex-api` 用量侧组织 UUID，来源于 admin 用户属性 `aicodexApiOrganizationId`。`apiUserId` / `apiUserIds` 在 admin provider envelope 中仍是字符串，来源于 admin 用户属性；但字符串内容必须是 `aicodex-api` 内部用户 ID 的正整数文本。非数字、0、负数或一对多值会被视为不可用映射，scope provider 返回 `AUTHORIZATION_FAILED` 和 `mappingStatus=INVALID|AMBIGUOUS`，不得继续向 insight 下发可查询 scope。

### GET /api/admin-provider/insight/v1/current-user/organization-tree

```http
GET /api/admin-provider/insight/v1/current-user/organization-tree HTTP/1.1
Host: admin.example.test
Authorization: Bearer <access-token>
X-Request-Id: trace-demo-004
```

```json
{
  "status": "ok",
  "traceId": "trace-demo-004",
  "data": [
    {
      "departmentId": "org-a/dev",
      "departmentName": "Development",
      "parentDepartmentId": "",
      "departmentPath": "Development",
      "hasChildren": true,
      "sourceType": "group"
    },
    {
      "departmentId": "org-a/platform",
      "departmentName": "Platform",
      "parentDepartmentId": "org-a/dev",
      "departmentPath": "Development/Platform",
      "hasChildren": false,
      "sourceType": "group"
    }
  ]
}
```
