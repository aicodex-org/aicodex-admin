# admin-background-task-lifecycle Specification

## Purpose
定义 Admin 进程中 HTTP server 与可控后台任务的统一生命周期契约，确保启动失败可回滚、终止信号只触发一次有界收口，并以脱敏日志暴露可操作的失败分类。

## Requirements
### Requirement: Admin 进程 SHALL 只有一个可控 lifecycle owner
Admin 进程 SHALL 由一个顶层 lifecycle owner 管理 HTTP server、Webhook delivery worker、Gateway organization projection refresh worker 和默认 Organization sync scheduler 的启动与停止，并由该 owner 接收 SIGINT/SIGTERM。

#### Scenario: 首个终止信号触发 shutdown
- **WHEN** 正常运行的 Admin 进程收到 SIGINT 或 SIGTERM
- **THEN** 顶层 lifecycle SHALL 触发且只触发一次有界 shutdown
- **AND** 生产入口 MUST 通过正常返回执行 deferred cleanup，而不是调用 `os.Exit`

#### Scenario: 重复信号和 Stop 保持幂等
- **WHEN** lifecycle 在 shutdown 期间或完成后再次收到终止信号或 `Stop` 调用
- **THEN** HTTP 和每个受控 worker 的停止副作用 MUST NOT 被重复执行
- **AND** 所有调用方 SHALL 观察同一次 shutdown 的完成结果

#### Scenario: 测试不终止当前测试进程
- **WHEN** 自动化测试验证 SIGINT/SIGTERM lifecycle 行为
- **THEN** 测试 SHALL 通过注入的 signal source 表达信号
- **AND** MUST NOT 向当前测试进程发送真实终止信号

### Requirement: Lifecycle SHALL 在启动失败时逆序回滚
Lifecycle SHALL 记录已成功启动的受控资源，并在后续 resource 启动失败或 HTTP server 在终止信号前提前退出时按逆序释放这些资源。

#### Scenario: 中间 worker 启动失败
- **WHEN** 一个受控 worker 启动失败，且它之前已有 worker 启动成功
- **THEN** lifecycle SHALL 只停止已成功启动的 worker
- **AND** SHALL 按与启动顺序相反的顺序停止它们
- **AND** HTTP server MUST NOT 被标记为正常运行

#### Scenario: HTTP server 提前退出
- **WHEN** 所有受控 worker 已启动，但 HTTP server 在收到终止信号前返回
- **THEN** lifecycle SHALL 将其分类为 server startup/runtime failure
- **AND** SHALL 逆序停止所有已启动的受控 worker并有界返回错误

### Requirement: HTTP shutdown SHALL 优先 drain in-flight 请求
Shutdown SHALL 先停止 HTTP server 接收新连接，并在统一 timeout 内等待 in-flight 请求完成；若 timeout 或 server shutdown error 发生，lifecycle SHALL 强制关闭 HTTP server 并继续剩余资源收口。

#### Scenario: In-flight 请求在 timeout 前完成
- **WHEN** shutdown 开始时存在 in-flight HTTP 请求
- **AND** 该请求在 timeout 前完成
- **THEN** 请求 SHALL 正常返回其响应
- **AND** HTTP listener SHALL 释放端口
- **AND** lifecycle SHALL 随后停止受控 workers

#### Scenario: In-flight 请求超过 timeout
- **WHEN** shutdown 开始时存在超过 timeout 仍未完成的 HTTP 请求
- **THEN** lifecycle SHALL 在 timeout 后强制关闭 HTTP server
- **AND** SHALL 在有界时间内返回而不无限等待该请求
- **AND** listener SHALL 释放端口

### Requirement: 受控 worker SHALL 支持 cancel、幂等 Stop 与 wait
Webhook delivery worker、Gateway organization projection refresh worker 和默认 Organization sync scheduler SHALL 在保持现有正常启动周期的同时，提供线程安全、可重复调用的 cancel/stop/wait 契约。

#### Scenario: 停止 Webhook delivery worker
- **WHEN** lifecycle 停止 Webhook delivery worker
- **THEN** worker SHALL 不再开始新的 polling tick
- **AND** Stop SHALL 等待当前循环退出或在调用方 context 到期时有界返回

#### Scenario: 停止 Gateway projection refresh worker
- **WHEN** lifecycle 停止 Gateway projection refresh worker
- **THEN** worker SHALL 取消 initial delay、后续 tick 和支持 context 的在途 publish
- **AND** Stop SHALL 等待本次 worker generation 退出或在调用方 context 到期时有界返回

#### Scenario: 重复停止受控 worker
- **WHEN** 同一 worker 被重复或并发停止
- **THEN** Stop SHALL NOT 重复关闭 channel、panic 或创建新的 worker generation
- **AND** wait SHALL 对同一 generation 返回一致完成状态

### Requirement: Lifecycle 诊断 SHALL 可操作且不泄露敏感信息
Lifecycle SHALL 记录 shutdown stage、稳定 resource name、稳定 error code 和 timeout 等运维字段，但 MUST NOT 记录配置值、请求正文、provider credential、token、Cookie、数据库连接串或原始外部响应。

#### Scenario: HTTP shutdown timeout
- **WHEN** HTTP graceful shutdown 超时
- **THEN** 日志 SHALL 包含 HTTP resource、shutdown stage、稳定 timeout error code 和 timeout duration
- **AND** MUST NOT 包含 in-flight 请求内容、认证信息或 runtime config 值

#### Scenario: Worker 停止失败或超时
- **WHEN** 受控 worker 未能在 shutdown deadline 前退出
- **THEN** 日志 SHALL 标识 worker name、stop stage 和稳定 error code
- **AND** MUST NOT 直接展开 provider、数据库或 credential error text

### Requirement: Lifecycle change SHALL 保持正常运行兼容并明确 legacy 排除项
Lifecycle change SHALL 保持现有 session、路由、端口、API、runtime config、Provider/Insight usage、schema bootstrap、默认对象和正常启动顺序，并 SHALL 明确记录未纳入可控资源范围的 legacy goroutine。

#### Scenario: 正常启动未收到终止信号
- **WHEN** Admin 使用既有配置正常启动且未收到终止信号
- **THEN** HTTP 地址、路由、API、session、schema bootstrap 和 worker 启动顺序 SHALL 与 change 前一致

#### Scenario: Legacy goroutine 缺少稳定 Stop API
- **WHEN** LDAP/LDAPS、RADIUS、LDAP autosync、token cleanup、site monitor、CLI downloader、throughput loop、sync-users、CasWAF proxy 或已派发 provider sync run 没有窄且可等待的进程级 Stop API
- **THEN** 本 change SHALL 在 design/verification 中列出其 owner 与排除原因
- **AND** MUST NOT 通过仅修改标志位或只记录日志来声称它们已经停止
