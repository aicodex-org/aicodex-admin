## Context

`admin/main.go` 目前依次完成 Beego/session、路由、数据库/schema、默认对象、日志、legacy goroutine、Webhook、Gateway projection refresh、Organization sync scheduler 和 HTTP 启动，最后阻塞在 `web.Run`。Beego `v2.3.8` 的普通模式把实际 `*http.Server` 暴露为 `web.BeeApp.Server`，因此可以在不修改框架、不启用 Beego 自有 signal handler 的前提下调用标准 `Shutdown(ctx)` 与 `Close()`。此外，LDAP autosync、token cleanup cron 和可选 CasWAF proxy server 也在启动路径中，但它们同样没有进程级可等待 owner。

三个纳入范围的 worker 已具备部分停止基础，但没有完整 wait 契约：Webhook/Gateway 的全局 Stop 关闭 channel 后立即清理 running 状态；Gateway 正在执行的 publish 使用 `context.Background()`；Organization scheduler 的实例可接收 context，但默认入口丢弃实例且没有 Stop/Wait。当前启动路径中的 LDAP、RADIUS、site monitor、CLI downloader、throughput loop 和 sync-users 则没有稳定、窄且可等待的 Stop API。

本 change 与 schema migration、runtime config、web-admin 并行任务隔离。不得修改 `admin/object/ormer.go`、schema registry/migration、runtime config resolution、`web-admin/**` 或 workflow，也不得通过 `os.Exit` 绕过 defer cleanup。

## Goals / Non-Goals

**Goals:**

- 让一个可测试的顶层对象成为 Admin 可控资源与 SIGINT/SIGTERM 的唯一 lifecycle owner。
- 保持现有正常启动顺序；启动失败时只对已成功启动的可控资源执行逆序 rollback。
- shutdown 首先停止 HTTP 接收新请求，允许 in-flight 请求在统一 timeout 内完成，超时后强制关闭并有界返回。
- 为 Webhook、Gateway refresh 和默认 Organization scheduler 提供幂等 cancel/stop/wait，禁止 cancel 后产生新的 tick。
- 使用稳定的资源名、阶段、错误码和 timeout 记录可操作但不包含配置值、请求内容或凭据的日志。
- 通过依赖注入测试 signal、重复 Stop、rollback、真实 `net/http.Server` drain/timeout 和 scheduler cancel，不向测试进程发送真实终止信号。

**Non-Goals:**

- 不改变端口、session、路由、API、runtime config、Provider/Insight usage、schema bootstrap、默认对象或 legacy goroutine 的正常启动行为。
- 不启用 Beego `Graceful` 模式，不修改 Beego 源码，不复制其未导出的完整启动流程。
- 不重写 LDAP/RADIUS server owner、LDAP autosync、token cleanup cron、site monitor 自恢复、CLI downloader、throughput、sync-users 或 CasWAF proxy server 调度模型；它们只进入 verification inventory。
- 不把 Organization scheduler 已经派发到 provider service 的 WeCom/Feishu/DingTalk 异步 sync run 解释为 scheduler 自身 goroutine；停止 scheduler 不等待这些独立业务 run。
- 不保证无法响应 context 的单次 legacy Webhook I/O 会在 timeout 前自然结束；顶层 timeout 后进程退出是最终边界。
- 实施与 RC 验证阶段不部署或终止 60 环境；archive 与 `hfl-test-base` 收口只在主控审计通过并明确授权 `self-closeout=true` 后执行，始终不操作 `test`。

## Decisions

### 1. 顶层 orchestration 使用小接口和显式状态，不把业务初始化搬入框架

新增可导入的 `admin/lifecycle` 子包，定义可注入 HTTP server、受控 resource、signal channel 和 logger。必须使用子包而不是 `package main` 旁路文件，因为仓库的 Makefile、CI smoke 和 Docker 启动仍以 `go build main.go` / `go run main.go` 为稳定入口，Go 单文件构建不会自动包含同目录其它 `package main` 文件。`main()` 继续按当前顺序完成配置、数据库、默认对象、legacy goroutine与日志初始化；只把三个可控 worker 和最后的 HTTP 阻塞运行交给 lifecycle。

受控 resource 使用稳定 name、`Start() error` 和 `Stop(context.Context) error`。生产 adapter 调用现有 object 包入口；测试 fake 可以表达第二个/第三个 worker 启动失败。lifecycle 记录成功启动的 resource 列表，任何 Start 失败或 HTTP 在 signal 前提前退出都按该列表逆序 Stop。

选择该方案而不是把全部 `main()` 初始化拆成几十个 resource，是为了让本 change 保持窄写集，同时仍能验证关键启动/回滚不变量。也不使用仅靠顶层 `defer Stop()` 的隐式方案，因为它无法区分未启动资源、HTTP drain 顺序和并发重复 Stop。

### 2. 普通 Beego server 由顶层调用标准 Shutdown，signal 只在顶层注册

生产 HTTP adapter 的 `Run()` 先校验 `web.BeeApp.Cfg.Listen.Graceful == false`，再保持调用 `web.Run(":<port>")`；正常端口、handler、timeout、静态路径与 Beego 初始化行为不变。若未来配置启用 Beego 自有 graceful 模式，adapter 以稳定 `beego_graceful_mode_conflict` fail-fast 并触发 rollback，避免两个 signal owner 或对错误 server 调用 Shutdown。`Shutdown(ctx)` 调用 `web.BeeApp.Server.Shutdown(ctx)`，`Close()` 调用同一 server 的强制关闭。由于 `web.Run` 不返回底层 listen error，signal 前提前返回统一分类为 `http_server_exited`，仍会触发资源 rollback；生命周期日志不复制可能含环境细节的底层错误文本。

不启用 Beego `Graceful`：该模式会自行注册 SIGINT/SIGTERM、使用框架全局 timeout 并形成第二个 signal owner。也不直接新建另一套 `http.Server` 驱动 `web.BeeApp.Handlers`，因为这会复制 Beego 未导出的模板、handler 和 listener 初始化，增加 TLS/FCGI/端口行为漂移。

生产 `main()` 使用缓冲 signal channel，并只注册 `os.Interrupt` 与 `syscall.SIGTERM`。测试直接注入 channel 中的合成 `os.Signal` 值，不调用 `signal.Notify`，更不向当前测试进程发信号。

### 3. Stop 由 `sync.Once` 收口，HTTP drain 永远先于 worker cancel

首次 Stop 创建统一 deadline context并执行：

1. 调用 HTTP `Shutdown(ctx)`，立即停止新连接并等待 in-flight。
2. 若 `Shutdown` 返回 timeout/错误，记录 `http_shutdown_timeout` 或 `http_shutdown_failed`，再调用 `Close()` 强制终止活动连接。
3. 按 Organization scheduler、Gateway refresh、Webhook 的逆序调用 resource Stop。即使 context 已过期，Stop 也必须先发出 cancel/close，再决定等待返回 deadline。
4. 聚合错误供 `Run()`/测试观察；日志仅记录 lifecycle 生成的稳定 errorCode，不直接展开 worker/provider/config 错误。

`sync.Once` 与完成 channel 保证并发或重复 signal/Stop 只执行一次副作用，后续调用等待同一次结果。生产代码从 `main()` 正常返回，让 defer cleanup 生效，不调用 `os.Exit`。

### 4. 三个 worker 补齐 done/wait，但不扩展业务职责

- **Webhook**：保留 polling、batch 与 delivery 逻辑；全局启动状态增加本次运行的 done channel。Stop 原子关闭 stop channel，`Stop...AndWait(ctx)` 等待 goroutine defer 关闭 done。旧 `StopWebhookDeliveryWorker()` 作为兼容 wrapper，保持幂等且不要求调用方处理 error。
- **Gateway refresh**：每次默认运行保存 cancel/done；run 接收 context，并把同一 context 传给 `RunOnce`/publisher。Stop cancel 后 wait，阻止 initial delay、后续 tick，并允许支持 context 的在途 publish 尽快终止。
- **Organization scheduler**：实例内部保存 cancel/done/running；`Start(ctx)` 幂等创建 child context，goroutine退出时清状态；`Stop(ctx)` cancel 并 wait。默认入口保存单例，并提供默认 Stop-and-wait wrapper。cancel 后不会开始新的 scan；已进入的 executor 通过同一 context 收到取消。

每个全局 worker 测试结束都显式 cleanup，避免 package 全局状态污染后续 suite。Start-after-Stop 只有在旧 done 已关闭后才允许新一代运行，避免两个循环短暂并存。

### 5. legacy goroutine 只记录真实边界，不实现假 Stop

| 任务 | 当前 owner/阻塞方式 | 排除原因 |
|---|---|---|
| LDAP/LDAPS | `StartLdapServer` 内创建局部 server/listener 与两个 goroutine | server handle 未暴露，纳入需要重构 listener owner 与 TLS 双 server |
| RADIUS | `StartRadiusServer` 内局部 `radius.PacketServer.ListenAndServe` | 无外部 server handle/Shutdown 契约 |
| LDAP autosync | 全局 synchronizer 只有 per-ID stop channel | 无 StopAll/wait，且现有 stop 可能阻塞在网络同步期间 |
| token cleanup | 局部 cron 实例启动后丢失 | 无全局 owner/Stop/wait |
| site monitor | 无限循环、`time.Sleep`，panic 后递归自启动 | 需重写自恢复与 cancel 语义，超出最小写集 |
| CLI downloader | demo-only SafeGoroutine + hourly ticker | 无 context/owner，且涉及下载流程边界 |
| throughput loop | 无 stop 的每秒 ticker | 不在允许 worker 写集 |
| sync-users | 注册 provider jobs 后用超长 sleep 阻塞 | 真正 job owner/停止语义位于更深层 scheduler |
| CasWAF proxy | `service.Start` 内创建局部 HTTP server/goroutine | 无可从 `main` 访问的 server handle/Shutdown，且 `service` 不在允许写集 |
| provider sync runs | scheduler executor 派发后由 provider service 使用独立后台 context | 属于业务 run owner；停止扫描器不应伪装成停止已派发 run |

这些任务仍按当前顺序启动，进程退出时由 OS 最终回收。verification 明确报告其未纳入，不能把“进程会退出”等同于已实现 graceful Stop。

### 6. 测试与覆盖率按行为边界而非 `main()` 行数组织

新增 lifecycle 单测以 fake resource/server 验证正常 signal、SIGTERM 等价路径、重复 signal/Stop、启动失败逆序 rollback、提前 server exit 和日志字段。HTTP 行为测试使用独立 loopback listener 与真实 `net/http.Server`：一个阻塞 handler 在 deadline 前释放以验证 graceful completion；另一个持续阻塞以验证 timeout 后 `Close()`、Run 有界返回和端口释放。

object 聚焦测试验证三个 worker 的 Stop/Wait 幂等与 cancel 后无新 tick，其中 Organization scheduler 用可控 executor/channel 观察调用次数。changed production statements coverage 使用 coverprofile 映射本 change 修改的生产行，目标不低于 85%；不以超大 `object` package 全包平均值或只断言 mock 调用制造达标。

## Risks / Trade-offs

- [Beego `web.Run` 不返回具体监听错误] → 顶层把 signal 前提前退出稳定分类并 rollback；底层 Beego 仍保留原 Critical 日志，本 change 不复制其可能敏感的 error text。
- [未来配置启用 Beego 自有 Graceful 后顶层 Shutdown 指向错误 server] → adapter 在 listener 启动前 fail-fast，记录稳定冲突码并逆序 rollback，不静默进入双 signal owner 状态。
- [HTTP drain 占满统一 timeout，worker 只获得已过期 context] → 每个 Stop 先发 cancel/close 再等待；整体保持有界，日志逐项记录未等待完成的资源。
- [Webhook 在途 delivery 没有 context API] → Stop 阻止新 polling 并等待当前轮；超时后明确记录风险并让进程返回，不跨模块重写 webhook transport。
- [默认 worker 使用 package 全局状态，测试可能竞态] → mutex 保护代际状态、done 与 cancel；测试串行控制这些入口并通过 cleanup 恢复。
- [新增 `package main` 旁路文件会被既有 `go build main.go` 忽略] → orchestration 放入 `admin/lifecycle` 可导入子包，并把单文件 build/run 作为兼容门禁；不修改 Makefile/workflow。
- [legacy goroutine 与已派发 provider run 仍非 graceful] → verification 保留逐项 inventory，后续应按各自 server/job owner 建独立 change，当前不声称全进程所有 goroutine 都已优雅停止。
- [Windows 本地无法安全模拟 POSIX SIGTERM 或启动依赖真实 DB] → 单测注入 signal；只有具备隔离配置、数据库和独立端口时才做进程 smoke，否则记录未执行原因，不用真实环境替代。

## Migration Plan

1. 先以测试固定 lifecycle、HTTP 和 worker cancel/wait 契约，再接入 `main()`。
2. 发布后正常启动路径、端口和 API 不变；只有收到 SIGINT/SIGTERM 或启动失败时进入新收口路径。
3. 回滚只需回退本 change 单个 commit；不包含 schema、配置或数据迁移。
4. RC 先推送工作分支供主控审查；审计通过后按 `self-closeout=true` archive 并以单个最终提交非强制推送 `hfl-test-base`，不部署 60、不操作 `test`。

## Open Questions

无。timeout 使用现有进程内常量并通过依赖注入在测试缩短；是否将 legacy server/job 纳入后续 change 由各自 owner 单独评估。
