# 企业微信组织同步说明

本文说明 `aicodex-admin` 企业微信组织架构同步的配置要求、映射规则、管理范围接口、同步策略、数据库表结构和测试环境验证清单。目标读者包括后台管理员、后端开发、测试同学，以及后续对接 `aicodex-api`、`aicodex-insight` 的开发者。

## 1. 敏感配置放置位置

真实 PostgreSQL 测试环境连接信息放在本地文件：

```text
deploy/.env
```

该文件已被仓库 `.gitignore` 忽略，不应提交到 Git。首次使用时复制示例文件：

```powershell
Copy-Item deploy\.env.ex deploy\.env
```

然后只在 `deploy/.env` 中填写真实值：

```text
AICODEX_DB_DRIVER=postgres
AICODEX_DB_HOST=<测试库地址>
AICODEX_DB_PORT=5432
AICODEX_DB_USER=<测试库用户>
AICODEX_DB_PASSWORD=<测试库密码>
AICODEX_DB_NAME=<测试库名>
AICODEX_DB_SSLMODE=disable
```

PostgreSQL 连接默认使用 `timezone=UTC`，用于保证 `timestamptz` 字段在 Xorm 读写和 API JSON 输出中保持同一时间点，避免数据库会话时区为 `Asia/Shanghai` 时出现 8 小时偏移。如果确实要通过 `AICODEX_DB_EXTRA_OPTIONS` 指定其它 `timezone`，需要同步验证同步记录时间、运行锁过期时间和 stale running 恢复逻辑。

不要把真实数据库密码、企业微信 Secret、测试账号密码写入 OpenSpec、`docs/`、提交信息或截图。

## 2. 企业微信通讯录权限

同步配置需要管理员在 Web Admin 页面填写：

- `organization`：目标 `aicodex-admin` 组织。
- `corpId`：企业微信企业 ID。
- `addressBookSecret`：自建应用 Secret。字段名沿用 `addressBookSecret`，但第一版读取组织详情时不要填写“管理工具 > 通讯录同步”的 Secret。
- `isEnabled`：是否启用同步。
- `softDisableMissingData`：完整成功同步后，是否软禁用本次全量快照缺失的历史同步数据。

首版 Web Admin 页面采用中文直写文案，不单独扩展完整 i18n 词条体系。面向管理员的操作名使用中文，例如“企业微信组织架构同步”“测试连接”“开始全量同步”；`Corp ID`、`Secret`、`Run ID` 等企业微信后台或排障常用技术字段保留英文括注，便于对照官方后台和接口日志。

自建应用 Secret 对应的应用可见范围至少需要覆盖待同步部门和成员，并能读取以下数据：

- 部门列表与部门详情：部门 ID、父部门 ID、部门名称、排序。
- 部门负责人：`department_leader`。
- 成员详情：`userid`、姓名、职位、状态，以及企业微信在当前权限下可返回的手机号、邮箱、头像。
- 成员部门关系：`department`、`main_department`、`is_leader_in_dept`。
- 直属上级：`direct_leader`。

不要使用“管理工具 > 通讯录同步”的 Secret 做本功能的读取凭证。企业微信已限制通讯录同步助手在新增 IP 下读取部门/成员详情；这类 Secret 更适合外部系统向企业微信写入通讯录或做 ID 比对，读取 `department/get`、成员详情等接口时可能返回 `48009 api forbidden for contact assistant`。

配置页的“测试连接”只校验企业微信 API 可达性、凭证有效性和关键字段权限，不会写入本地用户、用户组或关系表。测试结果会展示部门/成员可读数量，以及缺失的关键字段。

## 3. 映射规则

企业微信同步不依赖企业微信内部数据库表，只依赖公开通讯录 API 返回的数据，并在本地保存为“核心对象 + 映射表 + 关系表”。

### 部门到 Group

- `Group.Owner` 使用目标组织。
- `Group.Name` 使用稳定标识：`wecom-dept-<corp_id>-<department_id>`。现有 `Group.Name` 是全局唯一字段，必须包含企业 ID 避免多个企业微信组织的同号部门碰撞。
- `Group.DisplayName` 使用企业微信部门名称。
- `Group.ParentId` 使用父部门对应的本地 `Group.Name`。
- `Group.Type` 使用 `wecom-department`。
- `Group.Manager` 只作为兼容展示字段，保存主负责人。
- 完整负责人列表以 `wecom_department_leader` 为准。

部门改名只更新展示名，不改变本地稳定 `Group.Name`。部门移动只更新父子关系，不重建部门。

### 成员到 User

- 首选目标组织 + 企业微信 `userid` 识别成员。
- 已绑定用户同步时不修改 `User.Name`。
- 新建用户使用企业微信 `userid` 生成稳定用户名。
- `User.Wecom` 保存企业微信 `userid`。
- 完整外部标识保存到 `wecom_user_mapping.external_id`。
- 如果 `wecom:<corp_id>:<userid>` 超过 `User.ExternalId` 长度限制，`User.ExternalId` 只写入长度受控 hash，完整值仍以映射表为准。
- 企业微信侧以 `Corp ID + userid` 唯一识别成员；手机号、邮箱、姓名只用于展示或辅助排查本地未绑定账号，不自动合并已有账号。

头像、手机号、邮箱和企业邮箱属于企业微信敏感字段。企业微信官方[“读取成员”文档](https://developer.work.weixin.qq.com/document/path/90196)说明，新创建的自建应用与代开发应用调用 `user/get` 时不再返回头像、手机、邮箱、企业邮箱等字段，需要通过 OAuth2 手工授权获取管理员与员工本人授权的字段。首版同步以组织、部门、成员身份和管理关系为主；如果企业微信接口未返回这些字段，新用户对应字段保持空值，已通过 OAuth 或人事主数据回填过的本地 `User.Avatar`、`User.Phone`、`User.Email` 不会被组织同步清空，不影响 `userid` 绑定、部门关系和管理范围计算。

### 同步用户登录

同步过来的用户默认不是通过本地用户名密码登录。推荐登录路径是：

1. 在目标业务组织对应的默认应用上配置 `WeCom + Internal + Normal` 企业微信登录 Provider。系统会按 Corp ID 初始化 `app-wecom-<CorpID短码>` 应用，历史缺失时保存配置或启动同步会补齐。
2. 登录页展示企业微信扫码入口。
3. 用户用企业微信扫码后，企业微信回调返回 `userid`。
4. `aicodex-admin` 通过本地 `User.Wecom` 匹配已同步用户，并建立或更新 OAuth 绑定。

注意应用的 `Organization` 需要指向企业微信同步生成的业务组织，例如 `wecom-<CorpID短码>`。如果应用仍指向 `built-in`，回调时会在 `built-in` 下查找用户，无法直接匹配同步到业务组织的普通员工。

### 头像、手机号和邮箱补齐建议

首版不强制通过组织同步补齐头像、手机号和邮箱。企业微信已将这些字段列为敏感字段，新建自建应用通过通讯录 `user/get` 不一定返回，不能把它们作为组织同步成功的必要条件。

后台手工上传用户头像时，会使用该用户所属应用的 `Storage` Provider。企业微信业务组织默认应用为 `app-wecom-<CorpID短码>`；如果上传时报“未找到类别为 Storage 的提供商”，需要在该应用上绑定一个可用的 Storage Provider，例如本地文件系统、对象存储或已有的 Casdoor Storage。

测试环境使用本地文件系统 Storage Provider 时，容器内固定写入 `/files`，宿主机建议挂载到更易识别的目录，例如 `./data/upload-files:/files`。`/files` 是服务静态文件映射路径，不建议改容器内路径；宿主机目录需要允许容器运行用户写入，否则头像上传会因为无法创建文件目录失败。

后续建议分阶段处理：

1. 当前阶段保持组织同步以 `userid`、部门、负责人和直属上级为核心；用户列表头像为空时可显示默认头像，避免破图。
2. 企业微信扫码登录成功后，基于用户本人 OAuth 授权补齐头像、邮箱和手机号。后端用回调返回的 `userid` 匹配本地 `User.Wecom`，拿到字段后回填 `User.Avatar`、`User.Email`、`User.Phone`；后续组织同步在企业微信未返回这些字段时会保留已回填值。
3. 头像 URL 建议缓存成本地永久头像，避免企业微信临时头像 URL 过期或跨域访问失败。
4. 如果后续业务强依赖手机号或邮箱，优先从 HR、LDAP、Excel 导入等人事主数据源补齐，并继续以企业微信 `userid` 作为稳定身份标识，不用手机号或邮箱做主键。

### 成员部门关系

成员部门关系保存到 `wecom_user_department`，并同步到现有 `User.Groups`。

同步 `User.Groups` 时只增删企业微信来源部门组，不删除手工用户组、角色组或其他来源组。同一用户在同一组织下最多只有一个启用主部门关系，主部门事实来源是 `wecom_user_department.is_main`。

### 部门负责人关系

部门负责人保存到 `wecom_department_leader`，支持同一部门多个负责人。管理范围计算必须读取这张表所有启用负责人，不能只读 `Group.Manager`。

`wecom_department_leader.is_primary` 是主负责人事实来源，`Group.Manager` 和部门映射表里的主负责人缓存只用于兼容展示。

### 直属上级关系

直属上级保存到 `wecom_user_direct_leader`，只来自企业微信成员字段 `direct_leader`。

不能从通讯录展示层级、部门树、成员排序或“同部门领导”推断直属上下级。部门负责人关系和直属上级关系是两类独立关系。

## 4. 当前用户可管理范围接口

下游系统应通过后端接口获取当前登录用户可见范围：

```http
GET /api/org-management-scope/current
```

接口要求登录态。普通用户只能查询自己的范围，不能传入任意 `userId` 模拟查询他人范围。

范围规则：

- 全局管理员或目标组织管理员：返回目标组织内全部启用部门和启用用户。
- 部门负责人：返回其负责部门、所有子部门，以及这些部门内的启用成员。
- 多负责人部门：每个负责人都获得该部门及子部门范围。
- 直属上级：返回直接下属和递归间接下属。
- 同时具备部门负责人和直属上级身份：返回去重后的并集。
- 普通用户没有负责人范围和下属范围时：只返回本人范围。

响应会包含：

- `scopeType`：`admin`、`department-manager`、`direct-leader`、`self` 或组合值。
- `departments`：本地 Group 标识、企业微信部门 ID、父部门标识、展示名。
- `users`：本地 User 标识、企业微信 userid、完整 external ID、状态。
- `filterUserIds`：下游报表过滤建议使用的稳定用户标识集合。

`aicodex-insight` 做 AI 用量过滤时，应以后端返回的 `filterUserIds` / 企业微信 userid / 完整 external ID 为准，不要依赖前端隐藏数据实现权限控制。

## 5. 同步状态和失败策略

首版采用手动全量差异同步：

1. 管理员在后台点击“开始全量同步”。
2. 后端创建 `wecom_organization_sync_run` 执行记录，并向前端快速返回 `running` 状态和 run ID。
3. 后台任务获取企业微信部门、成员、成员部门、部门负责人和直属上级完整快照。
4. 按稳定企业微信 ID 计算差异。
5. 插入新增对象，更新已有对象和关系。
6. 只有完整成功且配置允许时，才对本次快照缺失的历史同步对象执行软禁用。
7. 同步成功后写回配置的 `last_run_id` 和 `last_synced_at`；如果仅该展示元信息写回失败，不反向改写已成功的 run 终态。

同步状态：

- `running`：正在执行。
- `succeeded`：完整快照拉取、差异应用和必要软禁用都成功。
- `failed`：关键阶段失败，本次结果不能代表组织真实快照。
- `partial`：可安全记录的部分失败，不执行缺失数据软禁用。

失败处理：

- 获取 token 失败、部门/成员未完整拉取、关键字段缺失、核心落库失败，都不能执行软禁用。
- 失败或部分失败必须保留执行记录和脱敏错误摘要。
- 同组织已有未过期 `running` 记录时，新的同步请求返回重复运行错误。
- 如果发现过期 `running` 记录，可以先标记为 `failed`，写入 `error_code = stale_running`，再允许新同步。
- 过期 running 记录不能参与缺失数据软禁用。

## 6. 首版边界

首版明确不做：

- 自动定时同步。
- 企业微信通讯录回调增量同步。
- 清空本地组织数据后重建。
- 完整 dry-run 预览。
- `aicodex-api` 登录迁移。
- `aicodex-insight` 报表功能。

后续可以在同步服务稳定后扩展定时全量同步和企业微信回调增量同步。即使引入回调，也建议保留定时全量同步作为兜底，用于修正事件丢失、乱序或处理失败造成的数据漂移。

## 7. 数据库表和迁移升级

首版新增 7 张 Xorm 管理表：

- `wecom_organization_sync_config`
- `wecom_organization_sync_run`
- `wecom_department_mapping`
- `wecom_user_mapping`
- `wecom_user_department`
- `wecom_department_leader`
- `wecom_user_direct_leader`

新增表通过 `admin/object/ormer.go` 里的 `Engine.Sync2(new(...))` 注册。首次部署或应用启动时，Xorm 负责创建缺失表和补齐新增字段。

字段约束：

- 新增同步表时间字段使用 Go `time.Time` 或可空时间类型，PostgreSQL 下应落为 `timestamptz`，API 按 RFC3339 输出。
- 新增同步表布尔字段使用 Go `bool` 和 PostgreSQL `boolean`，并显式声明 `json` tag 与 `xorm` tag。
- 关系表的 `name` 使用固定长度 `rel-<sha256>` 稳定标识，不拼接原始 userid。
- 权限计算相关关系必须使用独立关系表，不能依赖 `mediumtext` 或序列化数组。

升级策略：

- 允许自动同步：新增表、新增可空字段、新增普通索引、新增状态字段。
- 谨慎处理：新增唯一约束，必须先确认历史数据没有重复。
- 禁止隐式自动执行：删除字段、重命名字段、收窄字段长度、变更字段类型、批量清洗生产数据。
- 复杂升级需要单独的幂等升级脚本或升级函数，执行前备份数据，并提供验证 SQL。

## 8. PostgreSQL 测试环境验证清单

真实 PG 信息放到 `deploy/.env` 后，再执行测试环境验证。验证前确认测试库允许创建 7 张企业微信同步表，并且验证过程不能清理既有用户、组织、用户组或认证配置。

必须验证：

- 应用启动后 7 张表可以由 `Sync2` 创建。
- `created_at`、`updated_at`、`started_at`、`finished_at`、`last_synced_at` 等字段在 PG 中是 `timestamptz` 或等价带时区时间类型。
- `is_enabled`、`is_main`、`is_leader`、`is_primary`、`soft_disable_missing_data` 等字段在 PG 中是 `boolean`。
- 配置保存接口不会把脱敏 Secret 覆盖真实 Secret。
- 连接测试失败时不会写入用户、用户组或同步关系。
- 重复触发同步时能拦截未过期 running。
- stale running 过期后可恢复，并且不会触发软禁用。
- 关系表重复同步不会产生重复关系。
- 软禁用关系恢复后，启用状态和最近同步 run 能正确更新。
- JSON/text 排查字段能正常写入和读取。
- 当前用户无负责人和下属时，管理范围接口返回本人或显式空范围，不会扩大成全组织。

`1.12` 和 `6.8` 只有在上述测试环境验证完成后才能勾选。

## 9. 后台页面与接口基础验收

以下验收不依赖真实企业微信配置，适合等待企业微信应用、域名或公网入口期间先完成。

页面入口：

- 管理后台左侧菜单应出现“企业微信同步”入口。
- 进入页面后标题应为“企业微信组织架构同步”。
- 表单应包含目标组织、企业 ID（Corp ID）、自建应用 Secret、启用同步、全量同步成功后软禁用缺失数据。
- 页面提示应明确要求填写自建应用 Secret，并说明“通讯录同步 Secret”可能返回 `48009`。
- 未启用同步时，“开始全量同步”按钮不可执行。

配置与错误提示：

- 配置保存接口使用 `POST /api/wecom-org-sync/config`。
- 测试连接接口使用 `POST /api/wecom-org-sync/config/test`。
- 连接测试失败时，只展示脱敏后的企业微信错误摘要，不展示 Secret。
- 企业微信未配置完成时，连接测试失败不应写入用户、用户组或同步关系。
- 重复触发同步时，应展示后端返回的 running 冲突错误。
- 手动启动接口返回 `running` 后，应通过同步记录列表或详情继续观察最终状态。

同步记录：

- 同步记录列表应展示运行 ID、状态、阶段、执行人、部门新增/更新/禁用、成员新增/更新/禁用和错误摘要。
- `running`、`succeeded`、`failed`、`partial` 应显示为中文状态。
- 错误摘要用于排障，但不得包含 Secret、数据库密码或完整敏感响应。

权限与接口边界：

- `/api/wecom-org-sync/*` 只允许全局管理员或目标组织管理员操作。
- 普通用户不能通过传入任意组织扩展同步配置或同步记录查询范围。
- `GET /api/org-management-scope/current` 只计算当前登录用户范围，不允许普通用户传入任意用户模拟查询。
- 管理范围接口在无有效关系数据时，不得回退成全组织范围。

## 10. 企业微信真实联调清单

拿到企业微信侧配置后，按以下顺序联调。

企业微信前置配置：

- 使用已认证企业或具备完整自建应用配置能力的测试企业。
- 准备一个自建应用 Secret，不使用“管理工具 > 通讯录同步”的 Secret。
- 自建应用可见范围覆盖待同步的部门和成员。
- 完成可信域名或接收消息服务器 URL 前置配置。
- 在自建应用中配置企业可信 IP，填入服务调用企业微信时的公网出口 IP。
- 当前测试环境已观察到的出口 IP 是 `110.53.201.122`，如网络出口变化，应以企业微信错误中的 `from ip` 为准。

连接测试：

- 在 `aicodex-admin` 企业微信同步页填写目标组织、Corp ID、自建应用 Secret。
- 点击“保存”，确认接口返回成功且页面回显 Secret 为脱敏值。
- 点击“测试连接”，期望返回部门数量、成员数量，且无缺失字段。
- 如果返回 `40013 invalid corpid`，优先检查是否把自建应用 `AgentId` 填到了 `Corp ID` 字段；企业 ID 应从企业微信管理后台“我的企业/企业信息/企业 ID”获取，通常是 `ww...` 开头。
- 如果返回 `60020`，检查自建应用企业可信 IP。
- 如果 `user/list_id` 返回 `48002`，说明当前自建应用没有调用“获取成员 ID 列表”的权限；当前实现会自动回退到按部门读取成员详情的 `user/list`。如果回退后仍返回 `48002`，需要继续检查自建应用的通讯录读取权限和可见范围。
- 如果返回 `48009`，检查是否误用了通讯录同步 Secret，或自建应用权限不足。
- 如果提示缺失 `department_leader`、`direct_leader`、`is_leader_in_dept`，检查应用可见范围和通讯录字段权限。

全量同步：

- 确认“启用同步”已打开。
- 点击“开始全量同步”，期望创建一条 `running` 同步记录，接口快速返回 run ID。
- 同步完成后，期望状态为 `succeeded`，并展示部门、成员和关系的新增/更新/禁用统计。
- 同步中途失败时，期望状态为 `failed` 或 `partial`，且不执行缺失数据软禁用。
- 重复点击“开始全量同步”时，期望返回 running 冲突，不启动第二个任务。

数据核对：

- 企业微信部门应映射为本地 `Group`，`Group.Name` 使用 `wecom-dept-<corp_id>-<department_id>`。
- 企业微信成员应映射为本地 `User`，并保存企业微信 `userid`。
- 成员部门关系应写入 `wecom_user_department`，并同步到用户部门组。
- 部门负责人应写入 `wecom_department_leader`，多负责人都应保留。
- 直属上级应写入 `wecom_user_direct_leader`，不得从部门层级推断。
- 非企业微信来源的用户组关系应保留，不应被同步删除。

管理范围核对：

- 全局管理员或目标组织管理员应能看到全组织范围。
- 部门负责人应能看到负责部门、子部门和对应成员。
- 多个部门负责人都应获得对应部门范围。
- 直属上级应能看到直接和间接下属。
- 普通成员无负责人和下属关系时，只能看到本人范围。
