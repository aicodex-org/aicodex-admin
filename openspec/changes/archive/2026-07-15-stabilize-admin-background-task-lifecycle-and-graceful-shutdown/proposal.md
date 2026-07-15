## Why

Admin 进程目前在单个 `main()` 中启动 HTTP、多个 worker 和 legacy goroutine，却没有统一的 signal owner、资源回滚或有界停止契约。进程收到 SIGINT/SIGTERM 时可能直接终止正在处理的请求，并遗留仍在 tick 或执行 I/O 的后台任务，因此需要在不改变正常启动行为的前提下建立可测试的顶层 lifecycle。

## What Changes

- 新增单一、可注入的 Admin 顶层 lifecycle orchestration，统一管理启动顺序、启动失败逆序回滚、SIGINT/SIGTERM 和幂等 `Stop`。
- shutdown 先让 HTTP server 停止接收新请求，在配置的 timeout 内等待 in-flight 请求；超时后强制关闭连接，并记录包含阶段、资源、稳定错误码和 timeout 的脱敏日志。
- 为 Webhook delivery、Gateway organization projection refresh 与默认 Organization sync scheduler 补齐明确的 cancel/stop/wait 契约，确保 shutdown 后不再 tick，并能在统一 timeout 内等待退出。
- 保持当前 session、路由、端口、API、runtime config、Provider/Insight 用量、schema bootstrap、默认对象初始化和正常启动顺序不变。
- 调查并记录 LDAP、RADIUS、site monitor、CLI downloader、throughput loop、sync-users 等 legacy goroutine；本 change 不为缺少稳定停止边界的任务虚构 Stop，也不扩大为跨模块重写。
- 以不向当前测试进程发送真实终止信号的自动化测试覆盖 signal、重复 signal/Stop、启动失败回滚、HTTP graceful completion/timeout 和 scheduler cancel 后不再 tick。

## Capabilities

### New Capabilities

- `admin-background-task-lifecycle`: 规定 Admin 进程的单一 lifecycle owner、启动回滚、HTTP graceful shutdown、有界超时、幂等停止、可控 worker 范围和脱敏诊断。

### Modified Capabilities

- `organization-sync-scheduler`: 为默认组织同步调度器补充可取消、可等待且 cancel 后不再 tick 的进程停止契约。

## Impact

- 进程入口与新 orchestration：`admin/main.go` 及新增的 `admin/lifecycle` 可导入实现/测试，兼容既有 `go build main.go` / `go run main.go`。
- 可控 worker：`admin/object/webhook_worker*`、`gateway_organization_projection_refresh_worker*`、`organization_sync_scheduler*` 的最小启停、cancel、wait 改动。
- HTTP：继续使用现有 Beego `v2.3.8` server、地址和 handler；不修改 Beego 依赖或共享框架。
- 对外兼容：不修改 HTTP API、端口、持久化 schema、runtime config 解析、认证、前端或部署配置。
- 交付边界：本 change 先产出 release candidate 工作分支供主控审计；审计通过后按 `self-closeout=true` 完成 archive 与 `hfl-test-base` 收口，始终不部署 60、不操作 `test`。
