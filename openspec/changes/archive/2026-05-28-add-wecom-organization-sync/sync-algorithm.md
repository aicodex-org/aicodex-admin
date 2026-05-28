## Sync Algorithm

本文件记录企业微信组织同步的执行流程、幂等、软禁用和失败恢复策略。主设计见 [design.md](./design.md)。

## First Version Strategy

第一版采用“手动全量拉取 + 按稳定 ID 差异更新 + 完整成功后软禁用缺失数据”策略：

1. 从企业微信完整拉取当前权限范围内的部门、成员、部门负责人、直属上级和成员部门关系。
2. 基于企业微信稳定 ID 与本地映射做差异计算。
3. 对新增对象执行插入。
4. 对已存在对象更新展示字段、父子关系、成员关系、负责人关系、直属上级关系和状态字段。
5. 对本次完整成功结果中缺失的历史同步对象执行软禁用。

同步前置约束：

- 目标组织必须是企业微信 Corp ID 绑定出的独立业务组织，不能是 `built-in`。
- 如果目标组织尚不存在，配置保存阶段应基于 Corp ID 初始化业务组织及其默认应用；同步执行阶段只接受已经解析好的业务组织配置，并在启动前补齐历史缺失的默认应用。

首版不做：

- 清空重建。
- 自动定时同步。
- 通讯录回调增量同步。
- 完整 dry-run 预览。

## Normalized Snapshot

企业微信客户端对同步服务输出统一的规范化快照。

部门快照应包含：

- `id`
- `parentid`
- `name`
- `order`
- `department_leader`

成员快照应包含：

- `userid`
- `department`
- `main_department`
- `is_leader_in_dept`
- `direct_leader`
- `status`
- 可用的展示、联系方式、头像、职位字段

实现时不应把同步服务绑定死在单个企业微信历史接口路径上。企业微信客户端可以根据官方推荐接口组合获取部门 ID、单个部门详情、成员 ID、成员详情或部门成员详情，但对同步服务输出必须保持同一份规范化快照契约。

## Run Lifecycle

同步执行分为四个阶段：

1. `fetching`：获取 token、部门列表、成员列表。
2. `planning`：规范化企业微信快照并计算本地差异。
3. `applying`：写入 Group、User、映射表、用户组关系、负责人关系、直属上级关系。
4. `finalizing`：记录统计数据，并在完整成功时执行缺失数据软禁用。

状态定义：

- `running`：同步仍在执行。
- `succeeded`：完整快照拉取、差异应用、关系同步和必要软禁用全部成功。
- `failed`：关键阶段失败，结果不可作为组织真实快照。
- `partial`：非关键字段或个别对象处理失败，但不会执行缺失对象软禁用；首版实现如果无法安全区分，可统一按 `failed` 处理。

## Running Lock And Recovery

同一组织同一时间只允许一个运行中的同步任务。

规则：

- 查询运行中任务时按 `organization + status = running` 判断，服务层加互斥锁，避免重复同步。
- 运行中任务必须定期更新 `heartbeat_at` 和 `lease_expires_at`。
- 如果发现运行记录超过租约仍未更新，后续触发可以先把该记录标记为 `failed` 并写入 `error_code = stale_running`，再创建新的同步记录。
- 过期运行记录不得触发缺失数据软禁用。

## Differential Application

### Organization

- `Organization.Owner` 固定为 `admin`。
- `Organization.Name` 使用稳定 `wecom-<CorpID短码>`，不随企业微信企业名或根部门名变化。
- `Organization.DisplayName` 首次创建时可用兜底名称，成功同步到企业微信根部门后可更新为根部门名称。
- 如果管理员已经手工修改业务组织显示名，后续同步不自动覆盖。
- `built-in` 只保留系统管理用途，不承载企业微信普通用户和部门。

### Department

- `Group.Owner` 使用目标组织。
- `Group.Name` 使用稳定生成值，例如 `wecom-dept-<corp_id>-<department_id>`；该字段在当前表结构中是全局唯一索引，不能只依赖部门 ID。
- `Group.DisplayName` 使用企业微信部门名称。
- `Group.ParentId` 使用父部门对应的本地 `Group.Name`。
- `Group.Type` 使用 `wecom-department`。
- `Group.Manager` 使用主负责人对应的本地用户标识，仅用于兼容展示。
- `Group.IsTopGroup` 根据企业微信根部门判断。
- `Group.IsEnabled` 表示该部门当前仍存在于企业微信通讯录中。

### User

- 首先用目标组织 + 企业微信 `userid` 匹配已绑定用户，匹配字段优先级为 `User.Wecom`、`User.ExternalId`、扩展属性中的 `wecomUserId`。
- 已绑定用户同步时不修改 `User.Name`。
- 新建用户时使用企业微信 `userid` 生成稳定 `User.Name`，并处理非法字符和大小写策略。
- `User.Wecom` 保存企业微信 `userid`。
- 完整外部标识保存到 `wecom_user_mapping.external_id`。
- 现有 `User.ExternalId` 字段长度为 `varchar(100)`，只有当 `wecom:<corp_id>:<userid>` 不超过长度限制时才可直接写入；否则必须写入长度受控的 hash 标识。
- `User.Properties` 可保存 `wecomCorpId`、`wecomUserId`、`wecomStatus`、`wecomSyncSource` 等非关系型扩展信息。
- 头像、手机号、邮箱等敏感资料字段按“非空覆盖”处理，企业微信未返回时保留本地已有值，避免覆盖后续 OAuth 登录或人事主数据的回填结果。

### User Groups

`User.Groups` 同步只允许增删企业微信同步来源的部门组：

- 只处理 `Group.Type = wecom-department` 且属于当前同步组织的组。
- 不得覆盖或删除用户已有的手工用户组、角色相关组或其他来源组。
- 成员从企业微信部门用户组中移除时，只移除对应企业微信来源部门组关系，保留用户对象和非企业微信来源用户组。

### Relationships

- 部门负责人来自企业微信部门维度的 `department_leader` 或成员维度的 `is_leader_in_dept`，落到 `wecom_department_leader`。
- 成员部门关系来自成员维度的 `department` / `main_department`，落到 `wecom_user_department`。
- 直属上级来自成员维度的 `direct_leader`，落到 `wecom_user_direct_leader`。
- 通讯录展示层级只表示部门树和成员归属，不用于推断直属上级或部门负责人。

## Source Of Truth Rules

主负责人：

- `wecom_department_leader.is_primary` 是主负责人唯一事实来源。
- `Group.Manager` 和 `wecom_department_mapping.primary_leader_wecom_user_id` 是兼容展示缓存。
- 缓存字段必须在同一事务或同一同步阶段内从关系表派生更新。
- 同一 `organization + corp_id + department_id` 下最多只能有一条启用的 `is_primary = true` 记录。

主部门：

- `wecom_user_department.is_main` 是主部门唯一事实来源。
- `wecom_user_mapping.main_department_id` 是兼容查询缓存。
- 缓存字段必须在同一同步阶段内从关系表派生更新。
- 同一 `organization + corp_id + wecom_user_id` 下最多只能有一条启用的 `is_main = true` 记录。

## Soft Disable

完整全量同步成功后，若某个此前由企业微信同步创建或绑定的部门/成员/关系本次未出现在企业微信返回结果中：

- 部门设置为不可用或同步状态缺失，不删除 Group。
- 成员设置为不可用、删除状态或同步状态缺失，不删除 User。
- 成员从企业微信部门用户组中移除时，只移除对应企业微信来源部门组关系。
- 部门负责人关系和直属上级关系设置为不可用或缺失，不物理删除关系记录。

如果本次同步没有完整成功，只能记录失败执行结果，不得对缺失部门、缺失成员或缺失关系做软禁用。

## Failure Handling

关键失败包括：

- 获取 token 失败。
- 部门列表或成员列表未完整拉取。
- 必需字段缺失导致无法建立稳定映射。
- 本地核心对象或映射表写入失败。
- 用户组关系、部门负责人或直属上级关系写入失败。

失败处理原则：

- 在完整快照不可用或核心落库失败时，不得软禁用缺失数据。
- 能使用数据库事务覆盖的写入应放在事务内。
- 如果某些现有组件难以纳入同一事务，应通过 `last_seen_run_id` 和 `finalizing` 阶段控制软禁用，确保失败重跑可恢复。
- 过期或崩溃遗留的 `running` 记录只能被标记为失败类状态，不能被当作完整快照参与软禁用。
- 同步过程应幂等；同一份企业微信快照重复执行不应产生重复用户、重复部门或重复关系。

## Future Extensions

- P1 可以增加定时全量差异同步，例如每天凌晨或每 6 小时执行一次。
- P2 可以增加企业微信通讯录回调事件做增量更新，用于缩短组织变更生效时间。
- 即使引入回调增量，也应保留定时全量差异同步作为兜底，用于修正事件丢失、乱序、重复或处理失败造成的数据漂移。
- 后续如果业务要求上线前必须二次确认大规模变更，可以在同步服务稳定后追加 dry-run，并复用同一套同步计划计算逻辑。
