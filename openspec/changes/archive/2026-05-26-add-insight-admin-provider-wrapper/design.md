## Context

`aicodex-insight` 的 AI 用量洞察 MVP 需要从 `aicodex-admin` 获取当前登录用户、管理范围和组织/部门树。当前 `aicodex-admin` 的 `test` 分支已有 OIDC/OAuth、`/api/get-account`、`/api/userinfo`、用户、组织、分组、角色和权限管理能力，也能通过 `Group.ParentId` 构造分组树，但还没有面向 insight 的专用 provider 路由。

现有接口的主要问题是职责过宽：`/api/get-account` 返回 Casdoor 形态的账号数据，`/api/get-groups` 和 `/api/get-users` 面向后台管理页，字段、错误体、权限解释和分页语义都不是报表 provider 契约。若 insight 直接依赖这些接口，后续 admin 后台页面字段调整会影响报表联调，也无法明确 `apiUserIds`、scope 类型和映射失败语义。

## Goals / Non-Goals

**Goals:**

- 新增 insight 专用 admin provider wrapper，稳定输出 current-user、scope 和 organization-tree。
- 在 admin 侧统一判断当前用户可查看的管理范围，insight 只消费 scope 结果，不在本地推断 admin 权限。
- 明确 admin 用户 ID、分组/部门 ID、`aicodex-api` 用量用户 ID 之间的映射规则、部门级映射结构和缺失处理。
- 为 provider 调用增加统一错误码、字段裁剪和 AI 可读审计日志。
- 保持 provider 只读，不改变现有登录、用户、组织、分组、角色和权限数据写入流程。

**Non-Goals:**

- 不重做 OIDC/OAuth 登录、session、token 颁发或 Casdoor 兼容协议。
- 不在 admin 内查询或缓存 `aicodex-api` 用量数据。
- 不实现成本、账单、单价或成本分摊权限。
- 不把用户所在分组简单等同于管理范围；没有明确管理关系时按 `SELF` 或 `EMPTY` 处理。
- 不要求本次重构现有后台管理接口。

## Decisions

### 1. 新增专用 wrapper 路由，而不是让 insight 适配后台页面接口

新增 `GET /api/admin-provider/insight/v1/current-user`、`GET /api/admin-provider/insight/v1/current-user/scope` 和 `GET /api/admin-provider/insight/v1/current-user/organization-tree`。wrapper 层负责读取当前用户、调用现有 object/service 能力、裁剪字段、映射错误码和记录审计日志。

备选方案是让 insight 继续调用 `/api/get-account`、`/api/get-groups`、`/api/get-users` 后自行拼装 scope。该方案实现快，但会把 admin 内部字段、分页和后台权限细节泄露给 insight，不采用。

### 2. provider 以当前用户令牌为身份来源，生产环境不依赖浏览器后台页面 session

`aicodex-insight` 登录后应携带 admin 颁发给 insight client 的用户访问令牌调用 provider。admin provider 校验令牌签名、issuer、audience、expiry 和 scope 后解析当前用户，再计算 scope。为本地调试可保留现有登录态兼容路径，但生产配置必须以可验证 token 为准。

备选方案是使用仅服务间 token 调用 current-user。该方案无法表达“当前登录用户是谁”，只适合系统级配置查询，因此不作为 current-user/scope 的主路径。

### 3. scope 计算先采用保守规则，后续可接入更细的组织管理服务

当前 `test` 分支没有独立的 `OrganizationManagementScopeService`。本次 wrapper 的 P0 规则采用现有模型可验证的信息：

- 全局管理员返回其被授权组织范围内的 `ALL_COMPANY`；组织管理员定义为当前用户在所属 `organization/owner` 下 `IsAdmin=true`，返回该 organization 内的 `ALL_COMPANY`，不得扩展到其他 organization。
- 当前用户是某个分组的 `Manager` 时，返回该分组及其子分组的 `DEPARTMENT_TREE`。
- 当前用户拥有明确的 insight 用量查看权限且权限资源限定到用户列表时，返回 `CUSTOM_USERS`。
- 仅能确定本人身份时，返回 `SELF`。
- 无法确定任何可查询范围时返回 `EMPTY`；只要当前用户或 scope 内必要用户的用量 ID 映射缺失/歧义，返回 `AUTHORIZATION_FAILED` 和 `mappingStatus`，不能把映射问题伪装成空报表。

`DEPARTMENT_TREE` 和按部门查询必须返回部门级映射，而不是只给一个平铺用户集合。scope 响应增加 `departments[]`：

- `departmentId`：admin 分组/部门稳定 ID。
- `adminUserIds`：该部门及其已展开子部门内可查询的 admin 用户 ID。
- `apiUserIds`：与 `adminUserIds` 一一确定映射后的 `aicodex-api` 用量用户 ID；admin envelope 中保留字符串形态，但内容必须是 api 内部正整数用户 ID 的十进制文本。
- `includeChildDepartments`：该部门映射是否已包含子部门。
- `mappingStatus`：`OK`、`MISSING`、`AMBIGUOUS` 或 `INVALID`。

顶层 `apiUserIds` 只作为整个 scope 的并集，`aicodex-api` 的 `by-department` 必须使用 `departments[].apiUserIds` 完成部门聚合。

备选方案是把用户所属分组直接当作可管理部门。成员关系不是管理授权，容易越权，不采用。

### 4. 用量用户映射必须显式配置或显式失败

`aicodex-api` 当前用量用户 ID 与 admin 用户 ID 不是天然同一字段。provider 优先读取明确配置的用户属性，例如 `properties["aicodexApiUserId"]` 或后续配置项指定的属性名；如存在确定性 `ExternalId` 映射，也必须在实现中显式声明来源。该属性值必须写入可转换为正整数的 `aicodex-api` 用户 ID 字符串，昵称、手机号、邮箱、展示名不得作为唯一用量映射 key。

当映射缺失、一对多歧义或格式非法时，current-user 可以返回 `usageIdentity.mappingStatus=MISSING|AMBIGUOUS|INVALID` 供页面诊断；scope provider 必须返回 `AUTHORIZATION_FAILED` 和对应 `mappingStatus`，不得返回猜测的 `apiUserIds`，也不得把该问题降级为 `EMPTY`。

### 5. 组织树使用现有 group 树表达部门/组织层级

当前 admin 的 `Group` 已包含 `Owner`、`Name`、`DisplayName`、`ParentId`、`Type`、`Manager` 和树构造能力。organization-tree provider P0 以 group 树作为部门树来源，返回 `departmentId`、`departmentName`、`parentDepartmentId`、`departmentPath`、`hasChildren` 和当前用户可见节点。

实施确认：当前代码没有稳定枚举说明 `Group.Type` 可安全区分部门、岗位或业务分组，因此 P0 不按 `Group.Type` 过滤节点，只返回当前用户可管理的同 organization group，并使用 `sourceType=group` 暴露来源。

备选方案是新增独立部门表。当前需求只需要 provider 契约，且已有 group 模型可表达树形组织，不新增主数据模型。

### 6. provider 错误和日志必须对 insight 稳定

所有 provider 返回统一错误码：`UNAUTHENTICATED`、`AUTHORIZATION_FAILED`、`INVALID_ARGUMENT`、`PROVIDER_UNAVAILABLE`。空范围是业务成功结果，使用 `scopeType=EMPTY` 或空列表表达，不当作 provider 异常。

审计日志使用稳定字段：`traceId`、`adminUserId`、`organization`、`scopeType`、`groupCount`、`adminUserCount`、`apiUserCount`、`mappingStatus`、`status`、`errorCode`。日志不得输出访问令牌、手机号、邮箱、真实密钥等敏感值。

## Risks / Trade-offs

- [当前 test 分支没有专用组织管理 scope service，P0 scope 规则可能偏保守] → 先保证不越权，后续如 admin 引入更完整的组织管理服务，再在 wrapper 内替换计算来源，不改变 insight 契约。
- [api 用户 ID 映射缺失会导致报表不可用] → scope provider 返回 `AUTHORIZATION_FAILED` 与 `mappingStatus`，推动数据治理或配置补齐，避免用展示字段猜测造成错账。
- [group 既可能表示部门也可能表示业务分组] → organization-tree 响应保留 `sourceType=group`，并在任务中确认 `Group.Type` 是否可用于过滤部门型节点。
- [同时支持 token 与本地 session 会增加鉴权分支] → 生产路径以 token 为准，本地 session 仅用于调试或兼容，测试需覆盖未登录和 token audience 不匹配。

## Migration Plan

1. 先新增 DTO、错误码和 provider 响应 envelope，不改现有后台接口。
2. 增加 provider 鉴权和 current-user handler，验证可以通过 insight client token 定位 admin 用户。
3. 增加 scope service，按保守规则输出 `ALL_COMPANY`、`DEPARTMENT_TREE`、`CUSTOM_USERS`、`SELF`、`EMPTY`。
4. 增加 organization-tree handler，基于 group 树返回可见节点。
5. 补充测试、审计日志和联调样例。

回滚策略：删除或关闭 `/api/admin-provider/insight/v1/*` 新路由即可，现有登录、OIDC、用户、组织、分组和权限管理不受影响。

## Open Questions

- `aicodex-api` 用量用户 ID 当前统一读取 admin 用户属性 `properties["aicodexApiUserId"]`；后续如果存在历史字段，需要通过数据迁移或配置项收敛到同一属性，并保持正整数文本格式。
- `Group.Type` 暂不作为过滤条件；organization-tree 先返回所有可管理 group，并由 `sourceType=group` 标注来源。
- insight client 的生产 token scope 名称是否需要单独定义，例如 `insight.profile.read`、`insight.scope.read`。
