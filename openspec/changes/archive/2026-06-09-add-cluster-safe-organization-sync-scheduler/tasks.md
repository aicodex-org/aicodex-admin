## 1. OpenSpec 制品

- [x] 1.1 创建集群安全组织同步调度器的 proposal、design、delta specs 和任务清单。
- [x] 1.2 使用 `openspec validate "add-cluster-safe-organization-sync-scheduler" --type change --strict` 校验 change。

## 2. 后端调度器基础能力

- [x] 2.1 新增通用 schedule 和 schedule fire 持久化对象，并通过 additive Xorm 表注册支持 `scheduleName + windowStart` 唯一约束和 fire lock lease 字段。
- [x] 2.2 实现 schedule 校验、默认值、到期窗口计算、fire 领取、stale fire 恢复和 fire 状态更新。
- [x] 2.3 基于现有 `robfig/cron/v3` 依赖或等价轻量 tick 实现 provider executor 注册表和本地调度启动循环。
- [x] 2.4 补充聚焦 Go 测试，覆盖默认关闭、非法 cron/时区拒绝、同窗口去重、stale fire 恢复、缺失 executor、派发结果记录和敏感错误脱敏。
- [x] 2.5 补充数据库驱动测试或等价验证，证明 fire 窗口唯一性由真实持久化层保证，而不只依赖内存 fake。

## 3. WeCom 调度器接入

- [x] 3.1 扩展 WeCom run 启动服务，支持 `manual` 和 `scheduled` trigger types，同时不破坏现有手动 API。
- [x] 3.2 实现 WeCom 定时全量同步 executor，创建 `triggerType=scheduled` 的 run，并启动既有异步全量差异同步。
- [x] 3.3 将 WeCom schedule 设置接入配置读取/保存流程，以通用 schedule 表作为事实来源，并通过响应 DTO 或 `xorm:"-"` 临时字段避免污染 WeCom 配置表。
- [x] 3.4 补充 Go 测试，覆盖 scheduled run trigger type、already-running skip 行为和 schedule 设置保留语义。

## 4. Admin API 与 UI

- [x] 4.1 扩展 `/api/wecom-org-sync/config` 读写行为，返回并持久化定时同步设置。
- [x] 4.2 更新 WeCom 组织同步页面，展示 schedule 启用状态、cron、时区，并在运行历史中区分 scheduled/manual 触发方式。
- [x] 4.3 更新前端 backend 和页面测试，覆盖 schedule 字段往返保存和 scheduled trigger 展示。

## 5. 验证

- [x] 5.1 运行调度器和 WeCom 同步服务的聚焦 Go 测试。
- [x] 5.2 运行 WeCom 组织同步页面/backend 的聚焦前端测试。
- [x] 5.3 运行 `openspec validate "add-cluster-safe-organization-sync-scheduler" --type change --strict` 和 `git diff --check`。
- [x] 5.4 在 `verification.md` 记录命令、结果和剩余风险。
