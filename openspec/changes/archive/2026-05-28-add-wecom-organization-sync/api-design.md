## API Design

本文件记录企业微信组织同步相关后台 API 和当前用户管理范围 API。主设计见 [design.md](./design.md)。

## API Namespace

接口命名采用模块化路径，格式为 `/api/<module>/<path>`。这样比 Casdoor 历史的 `/api/get-*`、`/api/update-*` 更适合本次新增模块，也更贴近 `aicodex-api` 当前控制面接口风格。

由于 `aicodex-admin` 现有鉴权逻辑对 `/api/get-*`、`/api/update-*` 有历史适配，实现时必须同步补充模块路径的路由权限、审计和前端请求封装。

## Target Organization Resolution

同步配置、连接测试、触发同步、同步记录查询这类管理员接口必须显式解析目标 `organization`。

推荐规则：

- `GET` 请求使用 `organization` query 参数。
- `POST` 请求在 body 中传入 `organization`。
- 当 `POST /api/wecom-org-sync/config` 从 `built-in` 上下文提交且 body 中提供 Corp ID 时，后端应基于 Corp ID 解析或初始化独立业务组织，并在响应中返回最终目标组织。
- 手动同步执行接口不得允许目标组织为 `built-in`，即使调用者是全局管理员。
- 如果前端已有明确的当前组织上下文，可以由后端从登录上下文解析，但服务层仍必须得到唯一目标组织。
- 所有管理员接口都必须以目标组织做权限校验，不能只校验“是否管理员”。

当前用户可管理范围接口的目标组织默认来自当前登录用户所属组织；如果后续支持显式选择组织，也必须校验当前用户在该组织内的可见范围。

## Endpoints

| 方法 | 路径 | 用途 |
| --- | --- | --- |
| `GET` | `/api/wecom-org-sync/config` | 查询目标组织的企业微信组织同步配置，Secret 脱敏 |
| `POST` | `/api/wecom-org-sync/config` | 保存或更新同步配置 |
| `POST` | `/api/wecom-org-sync/config/test` | 测试 CorpId、自建应用 Secret 和通讯录读取权限 |
| `POST` | `/api/wecom-org-sync/runs` | 手动触发一次全量差异同步，并创建同步执行记录 |
| `GET` | `/api/wecom-org-sync/runs` | 查询同步执行记录列表 |
| `GET` | `/api/wecom-org-sync/runs/:runId` | 查询单次同步执行详情 |
| `GET` | `/api/org-management-scope/current` | 查询当前用户可管理部门、可见用户和下游过滤标识 |

## Authorization

- 配置、测试连接、触发同步和查看同步记录需要目标组织管理员或全局管理员权限。
- 当前用户可管理范围接口要求登录态；普通用户只能查询自己的范围，不能传入任意用户模拟查询。
- 所有接口返回不得包含明文 Secret。

## Configuration API

### GET /api/wecom-org-sync/config

用途：查询目标组织的企业微信组织同步配置。

输入：

- `organization`：目标组织，来自 query 或登录上下文。

输出要点：

- 返回 `corpId`、启用状态、软禁用策略、最近同步信息。
- `addressBookSecret` 必须脱敏。
- 未配置时返回明确空配置状态，不返回明文 Secret。

### POST /api/wecom-org-sync/config

用途：保存或更新同步配置。

输入要点：

- `organization`
- `corpId`
- `addressBookSecret` 或保留原 Secret 的标识
- `isEnabled`
- `softDisableMissingData`

规则：

- 保存前校验调用者对目标组织有管理权限。
- 如果目标组织为 `built-in` 且提供 Corp ID，则自动绑定或创建 `wecom-<CorpID短码>` 业务组织，并把配置保存到该组织。
- 返回体中的 `organization` 和 `config.organization` 必须是最终业务组织，供前端切换页面上下文。
- 同一目标组织首版只允许一套启用配置。
- Secret 更新必须支持“保留原密钥”，避免脱敏值覆盖真实密钥。

### POST /api/wecom-org-sync/config/test

用途：测试 CorpId、自建应用 Secret 和通讯录读取权限。字段名仍沿用 `addressBookSecret`，但配置值应来自可读取通讯录详情的自建应用，不应使用“管理工具 > 通讯录同步”的 Secret。

规则：

- 不修改本地用户、用户组或关系表。
- 校验通讯录 API 可达、凭证有效、部门负责人字段和直属上级字段权限可用。
- 返回安全错误分类，不泄漏 Secret 或企业微信完整敏感响应。

## Sync Run API

### POST /api/wecom-org-sync/runs

用途：手动触发一次全量差异同步。

规则：

- 目标组织必须可解析且通过权限校验。
- 目标组织不能是 `built-in`，避免企业微信普通成员获得全局管理员语义。
- 如果同组织已有未过期 `running` 记录，返回重复运行错误。
- 如果同组织存在过期 `running` 记录，可以先将其标记为 `failed` 并写入 `error_code = stale_running`，再创建新 run。
- 接口创建 `running` 同步执行记录后快速返回 run ID，真实全量差异同步在后台执行并写回最终状态。
- 同步成功后写回配置的最近 run 和最近同步时间；如果仅该展示元信息写回失败，不影响已成功 run 的终态。

### GET /api/wecom-org-sync/runs

用途：查询同步执行记录列表。

规则：

- 必须按目标组织过滤。
- 支持分页。
- 错误信息只返回脱敏摘要。

### GET /api/wecom-org-sync/runs/:runId

用途：查询单次同步执行详情。

规则：

- 必须校验该 run 属于调用者有权查看的目标组织。
- 返回状态、阶段、时间字段、统计数量和脱敏错误摘要。

## Management Scope API

### GET /api/org-management-scope/current

用途：根据当前登录用户返回可管理部门、可见用户和下游过滤标识。

计算规则：

1. 根据当前登录用户解析本地 `User`。
2. 通过 `User.Wecom`、`User.ExternalId` 或 `wecom_user_mapping` 找到当前用户的企业微信 `userid`。
3. 如果用户是全局管理员或目标组织管理员，返回目标组织内全部启用部门和启用用户。
4. 查询 `wecom_department_leader`，找到当前 `userid` 负责的部门。
5. 对这些部门递归展开所有启用子部门，并通过 `wecom_user_department` 收集启用用户。
6. 查询 `wecom_user_direct_leader`，构建“直属上级 -> 下属”反向索引。
7. 从当前 `userid` 出发做 BFS/DFS，收集直接和间接下属；遍历时必须去重并防止环。
8. 合并部门负责人范围和直属/间接下属范围，过滤禁用、删除、缺失用户，最终返回去重后的部门和用户列表。
9. 如果没有部门负责人范围，也没有下属范围，则只返回本人范围。

响应字段：

- `scopeType`：`admin`、`department-manager`、`direct-leader`、`self` 或组合值。
- `departments`：本地 Group ID、Group Owner、Group Name、企业微信部门 ID、父部门 ID、展示名。
- `users`：本地 User ID、User Owner、User Name、企业微信 userid、完整 external_id、所属部门 ID、状态。
- `filterUserIds`：推荐给 `aicodex-insight` 过滤使用的稳定用户标识列表，优先包含 `wecom_user_mapping.external_id` 和企业微信 userid；`User.ExternalId` 可能是长度受控 hash，不能作为唯一完整外部标识来源。

空范围必须显式返回空列表，不能降级为全组织范围。
