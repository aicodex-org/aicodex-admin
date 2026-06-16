## 背景

`aicodex-admin` 已有企业微信组织架构手动全量差异同步、运行记录、租约心跳和 stale running 恢复能力。生产交付认证中心时大概率会多节点部署，单节点内存定时器无法保证“只触发一次”，也无法在节点重启后保留可排查的调度记录。

当前项目已依赖 `github.com/robfig/cron/v3`，但现有用法主要是本地进程定时任务。企业微信组织同步后续还可能扩展到钉钉、飞书，因此本次不把定时能力写死在企业微信服务里，而是新增通用组织同步调度层。

## 目标与非目标

**目标：**

- 提供通用组织同步调度模型，支持 `provider + jobType + organization` 维度配置。
- 在多节点同时运行时，同一调度窗口只派发一次组织同步任务。
- 让企业微信全量差异同步接入定时调度，定时触发 run 记录使用 `triggerType=scheduled`。
- 默认关闭定时同步，管理员显式开启后才执行。
- 保留现有企业微信 run lease/running 锁，避免调度器绕过执行并发保护。
- 管理页展示和保存企业微信定时配置，便于测试环境和生产环境运维。

**非目标：**

- 不引入 Quartz、Temporal、Asynq、消息队列或新的分布式任务框架。
- 不实现企业微信通讯录回调增量同步。
- 不为钉钉、飞书实现具体同步逻辑，只定义可复用的调度执行器边界。
- 不提供跨 provider 的通用后台管理页；首个入口仍在企业微信组织同步页面。
- 不做 missed schedule 大规模补偿，本次只处理当前和最近一个可到达调度窗口。

## 设计决策

### 1. 使用本地 tick + DB fire 表，而不是引入定时任务框架

每个 admin 节点启动一个轻量本地调度循环，周期性扫描启用的 `OrganizationSyncSchedule`。节点本地只负责发现“可能到期”的 schedule，真正的集群去重依赖数据库中的 `OrganizationSyncScheduleFire` 唯一窗口键和 fire lock lease。

fire 表必须至少保存 `schedule_name`、`window_start`、`locked_by`、`locked_at`、`lock_expires_at`、`status`、`run_id`、错误摘要和尝试次数。`schedule_name + window_start` 是唯一窗口；`locked_by + lock_expires_at` 表示当前有效派发者。节点只能在插入新 fire 成功，或成功接管已过期且未进入终态的 fire 后调用 executor。

备选方案是引入 Quartz 类调度框架或分布式任务框架。该方案功能完整，但会引入新的运行组件、锁语义、监控和部署复杂度。当前认证中心已有数据库且同步频率低，用数据库唯一约束即可满足 P0 可靠性。

### 2. 调度配置通用化，WeCom API 暴露便捷字段

新增通用表：

- `organization_sync_schedule`: 保存 `provider`、`job_type`、`organization`、`cron_expression`、`timezone`、`is_enabled`、`last_fire_at`、`last_run_id` 和最近错误摘要。
- `organization_sync_schedule_fire`: 保存单次调度窗口的派发结果，使用 `schedule_name + window_start` 唯一键防止多节点重复派发。

企业微信配置 API 和页面暴露 `scheduleEnabled`、`scheduleCron`、`scheduleTimezone` 等便捷字段，但这些字段的持久化来源是通用 schedule 表。这样既避免前端一次性改造过大，也避免未来钉钉、飞书重复造表。

### 3. stale fire 可恢复，但真实同步仍由 provider run lock 去重

如果节点抢到 fire 后在创建 run 前崩溃，fire 会停留在 `acquired` 或 `dispatching` 这类非终态。其他节点在 `lock_expires_at` 之后可以接管同一个 fire 继续派发，避免一个窗口永久丢失。

这种恢复语义意味着“fire 派发尝试”可能超过一次，但同一窗口仍只有一条 fire 记录；实际 provider run 必须继续通过 provider 自身的运行锁保证不会重复执行。企业微信场景复用现有 `organization + running + lease_expires_at` 约束，所以即使 stale fire 恢复和原节点迟到重叠，也不会创建两个有效同步 run。

### 4. fire 记录表示“派发结果”，run 记录表示“同步结果”

调度器成功抢到 fire 后调用 provider executor。企业微信 executor 只负责创建 scheduled run 并启动异步全量同步，fire 状态记录为 `dispatched`，并写入 `runId`。同步最终成功、失败或部分成功继续由现有 `WecomOrganizationSyncRun` 记录表达。

如果企业微信已有运行中的 run，executor 返回跳过派发，fire 状态记录为 `skipped`，错误分类使用 `already_running`。这不是调度器失败，也不会绕过企业微信现有运行锁。

### 5. cron 解析和时区由服务层校验

保存 schedule 时必须校验 cron 表达式和时区。默认 cron 使用每天凌晨执行的 5 段表达式，默认时区使用 `Asia/Shanghai`。调度循环按 schedule 时区计算窗口，再统一用 UTC 写入 `window_start`、`last_fire_at` 等时间字段。

### 6. 企业微信 run 创建接口支持 trigger type

现有 `StartManualRunWithResult` 和 `StartManualRunAsync` 保持兼容，内部委托到可传 `triggerType` 的通用启动方法。新增 scheduled 启动方法由调度器调用，actor 使用 `scheduler:<node-id>`，以便后台运行记录可区分人工触发和系统触发。

### 7. WeCom schedule 字段不污染 WeCom 配置表

企业微信配置接口可以返回 `scheduleEnabled`、`scheduleCron`、`scheduleTimezone`、`scheduleLastFireAt` 等便捷字段，但持久化必须来自通用 schedule 表。实现时应使用响应 DTO 或 `xorm:"-"` 临时字段，避免把调度字段误加到 `wecom_organization_sync_config` 表。

## 风险与取舍

- [数据库唯一约束未创建或历史数据重复] -> 新表是 additive schema，首版无历史数据；实现必须用真实数据库测试验证 `schedule_name + window_start` 唯一约束，若 `Sync2` 无法可靠创建则补显式唯一索引或事务性接管逻辑。
- [节点抢到 fire 后崩溃导致窗口丢失] -> fire 记录包含锁过期时间，其他节点可接管未进入终态的过期 fire；provider run lock 继续防止实际同步重复执行。
- [节点时间不一致导致窗口判断偏差] -> 窗口最终以 UTC `window_start` 唯一键去重；生产仍应保持节点 NTP 正常。
- [调度器派发成功但异步同步失败] -> fire 只表达派发结果，最终失败可从 run 记录查看，避免重复记录两套终态。
- [cron 配置错误导致任务不执行] -> 保存配置时校验表达式和时区，页面展示最近调度错误。
- [多节点同时扫描造成数据库压力] -> schedule 数量预期较小，扫描周期按分钟级；后续如规模扩大再增加分页、nextRunAt 或租约批量领取。

## 迁移计划

1. 新增 `OrganizationSyncSchedule` 和 `OrganizationSyncScheduleFire` Xorm 对象。
2. 在 `object/ormer.go` 注册 `Sync2`，启动时创建缺失表和字段，并验证组合唯一约束实际存在。
3. 在 `admin/main.go` 建表后启动组织同步调度器；定时同步默认关闭，不会自动触发现有企业微信配置。
4. 管理员在企业微信同步页面保存定时配置后，后台写入通用 schedule 表。
5. 回滚到旧版本时，新表保留但旧代码不读取；已创建的 WeCom run 记录仍可按原有页面查看。

## 待确认问题

暂无。当前范围只实现数据库去重的定时全量同步；回调增量同步和跨 provider 统一管理页后续单独设计。
