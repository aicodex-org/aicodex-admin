## Schema Design

本文件记录 `aicodex-admin` 企业微信组织同步首版的物理表设计。主设计见 [design.md](./design.md)。

`aicodex-admin` 当前使用 Xorm，并在启动时通过 `object/ormer.go` 的 `Engine.Sync2(new(...))` 自动创建表或补齐新增字段。Go 结构体定义在 `admin/object`，字段使用 `xorm` tag，表名由 Xorm snake mapper 和 `tableNamePrefix` 共同决定。下面表名均为未加 `tableNamePrefix` 时的基础表名。

## Global Conventions

### Owner / Organization

- 新增同步对象沿用 Casdoor 对象层 `owner + name` 主键习惯。
- 首版中同步对象的 `owner` 必须等于目标 `organization`。
- 表中引用本地 `User` 或 `Group` 时，必须显式保存 `user_owner`、`group_owner`、`leader_user_owner` 等字段，避免只凭 `name` 跨组织关联。

### Time Fields

- 新增同步表的 `created_at`、`updated_at`、`started_at`、`finished_at`、`last_synced_at` 等字段在 Go 结构体中使用 `time.Time` 或可空时间类型。
- PostgreSQL 下应落为 `timestamptz` 或等价带时区时间类型。
- 应用层按 UTC 写入，API 按 RFC3339/ISO 8601 输出。
- PostgreSQL DSN 默认补充 `timezone=UTC`，并将 Xorm 应用时区固定为 UTC，避免数据库会话时区和容器本地时区不一致时把 `timestamptz` 读成错误时间点。
- 不为新增同步表沿用 `created_time varchar(100)`、`updated_time varchar(100)` 这类旧字段；旧表是否迁移另行评估。

### Boolean Fields

- `is_enabled`、`is_main`、`is_leader`、`is_primary`、`soft_disable_missing_data` 等二值字段在 Go 结构体中使用 `bool`，PostgreSQL 下落为 `boolean` / `bool`，不使用 `int(1)` 或整数模拟布尔。
- Go 字段可以使用 `IsEnabled`、`IsMain`、`IsLeader`、`IsPrimary` 等命名，但必须显式声明 `json` tag 和 `xorm` tag。
- 数据库列名统一使用 snake_case，例如 `xorm:"is_enabled"`；JSON 字段名按 `aicodex-admin` 现有 API 风格显式声明，例如 `json:"isEnabled"` 或 `json:"is_enabled"`，实现时不得省略。

### Relationship Names

- 映射表 `name` 可以使用 `wecom-dept-map-<stable-id>`、`wecom-user-map-<stable-id>` 等长度受控的稳定短标识。
- 本地企业微信部门 `Group.Name` 必须包含企业维度，例如 `wecom-dept-<corp_id>-<department_id>` 或长度受控的等价 hash，因为现有 `Group.Name` 是全局唯一索引。
- 关系表 `name` 不拼接原始 `wecom_user_id`、`leader_wecom_user_id` 等长字段，统一使用固定长度 hash，例如 `rel-<sha256(organization|corp_id|relationship_type|left_id|right_id)>`。
- 服务层查询、同步去重和幂等更新不得依赖 `name` 的可读含义，必须使用表中声明的外部稳定唯一键。

### Uniqueness And Idempotency

- 映射表和关系表的外部稳定唯一键必须在数据库层建立唯一约束。
- 如果 Xorm `Sync2` 在当前数据库方言下无法可靠创建组合唯一约束，实现必须提供显式幂等迁移或在服务层使用事务性 upsert。
- 禁止仅用“普通查询后插入”的非事务逻辑防重；重复触发同步、重试或并发请求时不得生成重复映射或重复关系。
- `last_seen_run_id` / `missing_since_run_id` 用于判断关系是否在当前完整快照中出现，不能替代唯一约束。

## Tables

### wecom_organization_sync_config

用途：保存某个目标组织的一套企业微信通讯录同步配置。

| 字段 | 建议类型 | 约束/索引 | 说明 |
| --- | --- | --- | --- |
| `owner` | `varchar(100)` | 主键列 | 沿用 Casdoor 对象 Owner 习惯 |
| `name` | `varchar(100)` | 主键列 | 配置对象 ID |
| `created_at` | `timestamptz` |  | 创建时间 |
| `updated_at` | `timestamptz` |  | 更新时间 |
| `organization` | `varchar(100)` | 索引；与 `corp_id` 组合唯一 | 目标 Casdoor 组织 |
| `corp_id` | `varchar(100)` | 索引；与 `organization` 组合唯一 | 企业微信企业 ID |
| `address_book_secret` | `text` |  | 自建应用 Secret；字段名沿用旧命名，接口返回必须脱敏 |
| `is_enabled` | `bool` | 索引 | 是否启用同步 |
| `soft_disable_missing_data` | `bool` |  | 完整成功同步后是否软禁用缺失对象 |
| `last_run_id` | `varchar(100)` | 索引 | 最近一次同步执行记录 ID |
| `last_synced_at` | `timestamptz` |  | 最近一次成功同步完成时间 |

约束：

- 首版限制同一 `organization` 只启用一套企业微信组织同步配置。
- 如果数据库层无法表达“仅启用配置唯一”，服务层必须在保存配置时强制校验。
- `address_book_secret` 不进入日志、审计详情和普通查询明文响应。

### wecom_organization_sync_run

用途：记录每次企业微信组织同步执行。

| 字段 | 建议类型 | 约束/索引 | 说明 |
| --- | --- | --- | --- |
| `owner` | `varchar(100)` | 主键列 | 沿用对象 Owner 习惯 |
| `name` | `varchar(100)` | 主键列 | 同步执行 ID，建议使用可排序 ID 或 UUID |
| `created_at` | `timestamptz` | 索引 | 创建时间 |
| `updated_at` | `timestamptz` |  | 更新时间 |
| `organization` | `varchar(100)` | 索引 | 目标组织 |
| `config_name` | `varchar(100)` | 索引 | 对应同步配置 |
| `corp_id` | `varchar(100)` | 索引 | 企业微信企业 ID |
| `trigger_type` | `varchar(50)` |  | `manual`，后续可扩展 `scheduled` / `callback` |
| `actor` | `varchar(100)` | 索引 | 触发人 |
| `status` | `varchar(50)` | 索引 | `running`、`succeeded`、`failed`、`partial` |
| `stage` | `varchar(50)` |  | `fetching`、`planning`、`applying`、`finalizing` |
| `started_at` | `timestamptz` | 索引 | 开始时间 |
| `finished_at` | `timestamptz` |  | 完成时间 |
| `heartbeat_at` | `timestamptz` | 索引 | 最近一次运行中心跳时间 |
| `lease_expires_at` | `timestamptz` | 索引 | 运行锁过期时间，用于进程崩溃后恢复 |
| `department_fetched_count` | `int` |  | 拉取部门数 |
| `department_created_count` | `int` |  | 新增部门数 |
| `department_updated_count` | `int` |  | 更新部门数 |
| `department_disabled_count` | `int` |  | 软禁用部门数 |
| `user_fetched_count` | `int` |  | 拉取成员数 |
| `user_created_count` | `int` |  | 新增成员数 |
| `user_updated_count` | `int` |  | 更新成员数 |
| `user_disabled_count` | `int` |  | 软禁用成员数 |
| `membership_updated_count` | `int` |  | 成员部门关系更新数 |
| `manager_updated_count` | `int` |  | 部门负责人关系更新数 |
| `direct_leader_updated_count` | `int` |  | 直属上级关系更新数 |
| `error_code` | `varchar(100)` |  | 安全错误分类 |
| `error_text` | `text` |  | 脱敏错误摘要 |

约束：

- 查询运行中任务时按 `organization + status = running` 判断，服务层加互斥锁，避免重复同步。
- 运行中任务必须定期更新 `heartbeat_at` 和 `lease_expires_at`。
- 如果发现运行记录超过租约仍未更新，后续触发可以先把该记录标记为 `failed` 并写入 `error_code = stale_running`，再创建新的同步记录。
- 过期运行记录不得触发缺失数据软禁用。
- 执行记录必须保留失败和部分失败结果，不能因为失败而删除记录。

### wecom_department_mapping

用途：保存企业微信部门与本地 `Group` 的稳定映射和同步状态。

| 字段 | 建议类型 | 约束/索引 | 说明 |
| --- | --- | --- | --- |
| `owner` | `varchar(100)` | 主键列 | 沿用对象 Owner 习惯 |
| `name` | `varchar(100)` | 主键列 | 映射对象 ID |
| `created_at` | `timestamptz` |  | 创建时间 |
| `updated_at` | `timestamptz` |  | 更新时间 |
| `organization` | `varchar(100)` | 索引；与 `corp_id`、`department_id` 组合唯一 | 目标组织 |
| `corp_id` | `varchar(100)` | 索引 | 企业微信企业 ID |
| `department_id` | `varchar(100)` | 索引 | 企业微信部门 ID |
| `group_owner` | `varchar(100)` | 索引 | 本地 Group.Owner |
| `group_name` | `varchar(100)` | 索引 | 本地 Group.Name，建议 `wecom-dept-<corp_id>-<department_id>`，超长时使用长度受控 hash |
| `parent_department_id` | `varchar(100)` | 索引 | 企业微信父部门 ID |
| `parent_group_owner` | `varchar(100)` | 索引 | 本地父 Group.Owner |
| `parent_group_name` | `varchar(100)` | 索引 | 本地父 Group.Name |
| `display_name` | `varchar(100)` |  | 最近一次同步到的部门名 |
| `order` | `int` |  | 企业微信部门排序值 |
| `primary_leader_wecom_user_id` | `varchar(255)` | 索引 | 主负责人企业微信 userid，派生自 `wecom_department_leader.is_primary`，用于展示兼容 |
| `is_enabled` | `bool` | 索引 | 当前是否仍存在于企业微信可见范围 |
| `missing_since_run_id` | `varchar(100)` | 索引 | 首次缺失的同步执行 ID |
| `last_seen_run_id` | `varchar(100)` | 索引 | 最近一次出现于完整快照的同步执行 ID |
| `last_synced_at` | `timestamptz` |  | 最近同步时间 |

约束：

- `organization + corp_id + department_id` 是外部稳定唯一键，必须通过数据库唯一约束或事务性 upsert 保证幂等。
- `group_owner + group_name` 指向本地 `Group`，不通过部门名称做关联。
- 多负责人授权必须读 `wecom_department_leader`，不能只读 `Group.Manager` 或 `primary_leader_wecom_user_id`。
- 主负责人唯一事实来源是 `wecom_department_leader.is_primary`；`Group.Manager` 和 `primary_leader_wecom_user_id` 是兼容展示缓存，必须在同一事务或同一同步阶段内从关系表派生更新。

### wecom_user_mapping

用途：保存企业微信成员与本地 `User` 的稳定映射和同步状态。成员部门关系、部门负责人标记、直属上级关系拆到独立关系表。

| 字段 | 建议类型 | 约束/索引 | 说明 |
| --- | --- | --- | --- |
| `owner` | `varchar(100)` | 主键列 | 沿用对象 Owner 习惯 |
| `name` | `varchar(100)` | 主键列 | 映射对象 ID |
| `created_at` | `timestamptz` |  | 创建时间 |
| `updated_at` | `timestamptz` |  | 更新时间 |
| `organization` | `varchar(100)` | 索引；与 `corp_id`、`wecom_user_id` 组合唯一 | 目标组织 |
| `corp_id` | `varchar(100)` | 索引 | 企业微信企业 ID |
| `wecom_user_id` | `varchar(255)` | 索引 | 企业微信 userid |
| `user_owner` | `varchar(100)` | 索引 | 本地 User.Owner |
| `user_name` | `varchar(255)` | 索引 | 本地 User.Name |
| `external_id` | `varchar(500)` | 索引 | 完整外部标识，建议 `wecom:<corp_id>:<userid>`；不受 `User.ExternalId` 长度限制 |
| `main_department_id` | `varchar(100)` | 索引 | 企业微信主部门缓存，派生自 `wecom_user_department.is_main` |
| `status` | `int` | 索引 | 企业微信成员状态 |
| `possible_duplicate_users` | `jsonb` 或 `text` |  | 疑似重复本地用户 ID 列表，仅用于管理员排查，不参与权限计算 |
| `is_enabled` | `bool` | 索引 | 当前是否仍存在于企业微信可见范围 |
| `missing_since_run_id` | `varchar(100)` | 索引 | 首次缺失的同步执行 ID |
| `last_seen_run_id` | `varchar(100)` | 索引 | 最近一次出现于完整快照的同步执行 ID |
| `last_synced_at` | `timestamptz` |  | 最近同步时间 |

约束：

- `organization + corp_id + wecom_user_id` 是外部稳定唯一键，必须通过数据库唯一约束或事务性 upsert 保证幂等。
- `user_owner + user_name` 指向本地 `User`，已绑定用户同步时不得改 `User.Name`。
- `wecom_user_department.is_main` 是主部门唯一事实来源；`main_department_id` 是兼容查询缓存，必须在同一同步阶段内从关系表派生更新。
- 成员部门、部门负责人和直属上级关系不得存成 `mediumtext` 数组作为权限计算依据，必须从独立关系表查询。

### wecom_user_department

用途：保存企业微信成员与部门的多对多关系，并承载主部门和成员在部门内是否为负责人的标记。

| 字段 | 建议类型 | 约束/索引 | 说明 |
| --- | --- | --- | --- |
| `owner` | `varchar(100)` | 主键列 | 沿用对象 Owner 习惯 |
| `name` | `varchar(100)` | 主键列 | 关系对象 ID，使用 `rel-<sha256>` 等固定长度稳定值 |
| `created_at` | `timestamptz` |  | 创建时间 |
| `updated_at` | `timestamptz` |  | 更新时间 |
| `organization` | `varchar(100)` | 索引；与 `corp_id`、`wecom_user_id`、`department_id` 组合唯一 | 目标组织 |
| `corp_id` | `varchar(100)` | 索引 | 企业微信企业 ID |
| `wecom_user_id` | `varchar(255)` | 索引 | 企业微信 userid |
| `department_id` | `varchar(100)` | 索引 | 企业微信部门 ID |
| `user_owner` | `varchar(100)` | 索引 | 本地 User.Owner |
| `user_name` | `varchar(255)` | 索引 | 本地 User.Name |
| `group_owner` | `varchar(100)` | 索引 | 本地 Group.Owner |
| `group_name` | `varchar(100)` | 索引 | 本地 Group.Name |
| `is_main` | `bool` | 索引 | 是否主部门 |
| `is_leader` | `bool` | 索引 | 是否该部门负责人 |
| `is_enabled` | `bool` | 索引 | 当前关系是否仍存在于企业微信可见范围 |
| `missing_since_run_id` | `varchar(100)` | 索引 | 首次缺失的同步执行 ID |
| `last_seen_run_id` | `varchar(100)` | 索引 | 最近一次出现于完整快照的同步执行 ID |
| `last_synced_at` | `timestamptz` |  | 最近同步时间 |

约束：

- `organization + corp_id + wecom_user_id + department_id` 是外部稳定唯一键，必须通过数据库唯一约束或事务性 upsert 保证幂等。
- 同步 `User.Groups` 时以这张表的启用关系为准。
- 同一 `organization + corp_id + wecom_user_id` 下最多只能有一条启用的 `is_main = true` 记录。

### wecom_department_leader

用途：保存企业微信部门负责人关系，支持多负责人授权。

| 字段 | 建议类型 | 约束/索引 | 说明 |
| --- | --- | --- | --- |
| `owner` | `varchar(100)` | 主键列 | 沿用对象 Owner 习惯 |
| `name` | `varchar(100)` | 主键列 | 关系对象 ID，使用 `rel-<sha256>` 等固定长度稳定值 |
| `created_at` | `timestamptz` |  | 创建时间 |
| `updated_at` | `timestamptz` |  | 更新时间 |
| `organization` | `varchar(100)` | 索引；与 `corp_id`、`department_id`、`leader_wecom_user_id` 组合唯一 | 目标组织 |
| `corp_id` | `varchar(100)` | 索引 | 企业微信企业 ID |
| `department_id` | `varchar(100)` | 索引 | 企业微信部门 ID |
| `group_owner` | `varchar(100)` | 索引 | 本地 Group.Owner |
| `group_name` | `varchar(100)` | 索引 | 本地 Group.Name |
| `leader_wecom_user_id` | `varchar(255)` | 索引 | 负责人企业微信 userid |
| `leader_user_owner` | `varchar(100)` | 索引 | 负责人本地 User.Owner |
| `leader_user_name` | `varchar(255)` | 索引 | 负责人本地 User.Name |
| `is_primary` | `bool` | 索引 | 是否用于 `Group.Manager` 展示兼容的主负责人 |
| `is_enabled` | `bool` | 索引 | 当前关系是否仍存在于企业微信可见范围 |
| `missing_since_run_id` | `varchar(100)` | 索引 | 首次缺失的同步执行 ID |
| `last_seen_run_id` | `varchar(100)` | 索引 | 最近一次出现于完整快照的同步执行 ID |
| `last_synced_at` | `timestamptz` |  | 最近同步时间 |

约束：

- `organization + corp_id + department_id + leader_wecom_user_id` 是外部稳定唯一键，必须通过数据库唯一约束或事务性 upsert 保证幂等。
- 管理范围计算必须读取这张表中所有启用负责人关系，不能只读 `Group.Manager`。
- 同一 `organization + corp_id + department_id` 下最多只能有一条启用的 `is_primary = true` 记录。

### wecom_user_direct_leader

用途：保存企业微信成员直属上级关系，支持直接和间接下属范围计算。

| 字段 | 建议类型 | 约束/索引 | 说明 |
| --- | --- | --- | --- |
| `owner` | `varchar(100)` | 主键列 | 沿用对象 Owner 习惯 |
| `name` | `varchar(100)` | 主键列 | 关系对象 ID，使用 `rel-<sha256>` 等固定长度稳定值 |
| `created_at` | `timestamptz` |  | 创建时间 |
| `updated_at` | `timestamptz` |  | 更新时间 |
| `organization` | `varchar(100)` | 索引；与 `corp_id`、`wecom_user_id`、`leader_wecom_user_id` 组合唯一 | 目标组织 |
| `corp_id` | `varchar(100)` | 索引 | 企业微信企业 ID |
| `wecom_user_id` | `varchar(255)` | 索引 | 下属企业微信 userid |
| `leader_wecom_user_id` | `varchar(255)` | 索引 | 直属上级企业微信 userid |
| `user_owner` | `varchar(100)` | 索引 | 下属本地 User.Owner |
| `user_name` | `varchar(255)` | 索引 | 下属本地 User.Name |
| `leader_user_owner` | `varchar(100)` | 索引 | 直属上级本地 User.Owner |
| `leader_user_name` | `varchar(255)` | 索引 | 直属上级本地 User.Name |
| `is_enabled` | `bool` | 索引 | 当前关系是否仍存在于企业微信可见范围 |
| `missing_since_run_id` | `varchar(100)` | 索引 | 首次缺失的同步执行 ID |
| `last_seen_run_id` | `varchar(100)` | 索引 | 最近一次出现于完整快照的同步执行 ID |
| `last_synced_at` | `timestamptz` |  | 最近同步时间 |

约束：

- `organization + corp_id + wecom_user_id + leader_wecom_user_id` 是外部稳定唯一键，必须通过数据库唯一约束或事务性 upsert 保证幂等。
- `leader_wecom_user_id` 只来自企业微信 `direct_leader` 字段，不能从部门层级或成员排序推断。
