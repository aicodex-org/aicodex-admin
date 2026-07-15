## 1. 基线、设计与实施门禁

- [x] 1.1 记录 `origin/hfl-test-base`、固定 workspace clean 状态、active changes、并行写集和相关 `main`/worker/Beego 源码证据，确认不触碰 schema、runtime config、web-admin 或 workflow。
- [x] 1.2 完成 proposal/design/delta specs/tasks，逐项核对 legacy goroutine inventory、HTTP 普通模式约束、单一 signal owner、rollback、脱敏日志和初始 RC 交付边界。
- [x] 1.3 运行 change strict、all changes strict 与 `git diff --check`，完成实施前 review 循环并确认 implementation-ready。

## 2. 顶层 lifecycle orchestration（TDD）

- [x] 2.1 先新增 lifecycle 聚焦测试，用可注入 fake server/resources/signal source 表达正常 SIGINT/SIGTERM、重复 signal/Stop 只执行一次和 Stop 调用结果一致；运行并确认因 orchestration 尚不存在而 RED。
- [x] 2.2 最小实现受控 resource/server/logger 接口、启动状态、`sync.Once` Stop、完成 channel 和稳定 error code，使正常 signal 与幂等测试 GREEN。
- [x] 2.3 先新增第二/第三个 worker 启动失败及 HTTP 在 signal 前提前退出测试，断言只停止已启动资源且严格逆序；确认 RED 后实现 rollback 与 server 提前退出分类至 GREEN。
- [x] 2.4 先新增 Beego graceful mode 冲突测试，确认 adapter 在 listener 前 fail-fast；实现普通模式 `web.Run`、`web.BeeApp.Server.Shutdown/Close` adapter，并保持底层错误文本不进入 lifecycle 日志。

## 3. HTTP graceful shutdown（TDD）

- [x] 3.1 用独立 loopback listener、真实 `net/http.Server` 和可释放阻塞 handler 添加 in-flight graceful completion 测试，确认当前 lifecycle 无 drain 行为而 RED。
- [x] 3.2 最小实现“HTTP Shutdown 优先、等待成功后再逆序 Stop workers”，验证请求正常完成、listener/端口释放且顺序断言 GREEN。
- [x] 3.3 添加持续阻塞 handler 与短 deadline 测试，断言 timeout 后调用 `Close`、请求连接终止、Run 有界返回且 worker cancel 仍被发出；确认 RED 后实现强制收口与稳定 timeout 日志至 GREEN。
- [x] 3.4 添加 HTTP shutdown error、worker stop timeout/error 的聚焦测试，断言日志仅包含 stage/resource/errorCode/timeout，不包含注入的敏感 error text。

## 4. Webhook 与 Gateway worker 生命周期（TDD）

- [x] 4.1 先为 Webhook default worker 添加 Start/Stop/Wait、重复 Stop 和 stop 后不再 polling 的测试；确认当前实现因无 done/wait 或代际竞态而 RED。
- [x] 4.2 为 Webhook worker 增加 mutex 保护的 generation done 与 `Stop...AndWait(ctx)`，保留现有 Start/Stop compatibility wrapper、polling interval、batch 和 delivery 逻辑，并运行聚焦测试至 GREEN。
- [x] 4.3 先为 Gateway refresh default worker 添加 initial delay cancel、tick cancel、在途 publisher context cancel、重复 Stop/Wait 和 Start-after-Stop 测试；确认 RED。
- [x] 4.4 为 Gateway worker 增加 generation cancel/done，把 run context 传入 `RunOnce`/publisher，并实现幂等 Stop-and-wait；保持 runtime config resolution、refresh 周期、batch 和日志字段不变，运行聚焦测试至 GREEN。

## 5. Organization scheduler 生命周期（TDD）

- [x] 5.1 先添加实例 scheduler cancel 后不再 initial/periodic tick、在途 executor 收到 context cancel、重复 Start/Stop/Wait 和 restart generation 测试；确认当前实现 RED。
- [x] 5.2 为 `OrganizationSyncScheduler` 增加 mutex、cancel、done、running generation，保持 `RunOnce`、持久化 fire/lease 与 provider registry 语义不变，实现实例幂等 Start/Stop/Wait 至 GREEN。
- [x] 5.3 先添加默认 organization scheduler Start/Stop-and-wait 测试，再实现保存默认实例的全局 wrapper，确保数据库初始化后的默认启动顺序不变且 shutdown 后不再 tick。

## 6. 接入 `main()` 与兼容性验证

- [x] 6.1 先添加 production resource wiring/启动顺序测试，断言 Webhook → Gateway refresh → Organization scheduler → HTTP 的正常顺序，以及 shutdown 的 HTTP → Organization → Gateway → Webhook 顺序。
- [x] 6.2 最小修改 `admin/main.go`：保留所有既有初始化、legacy goroutine、端口和静态/过滤器配置，只把三个可控 worker 与最后 `web.Run` 替换为可导入 `admin/lifecycle` 子包的单一 orchestration，并在函数退出时停止 signal notification；不得使用 `os.Exit`，且既有 `go build main.go` / `go run main.go` 必须继续可用。
- [x] 6.3 重读最终 diff，对照 legacy inventory 确认 LDAP/LDAPS、RADIUS、LDAP autosync、token cleanup、site monitor、CLI downloader、throughput、sync-users、CasWAF proxy 和已派发 provider sync run 未被伪装纳入，也未越过强制写集。

## 7. 覆盖率、质量门禁与分阶段交付证据

- [x] 7.1 运行 lifecycle 与三个 object worker 的聚焦测试、race-sensitive 重复运行和受影响 Go package tests；测试前后对比 `git status`，确认没有任务外残留。
- [x] 7.2 生成 coverprofile 并计算 changed production statements coverage，达到至少 85%；同时如实记录 package coverage，不添加只断言 mock/getter 的低价值测试。
- [x] 7.3 运行 full hermetic Go suite、`gofumpt`、`go vet ./...`、固定 `golangci-lint v2.11.4`、OpenSpec target/changes/specs strict 与 `git diff --check`。
- [x] 7.4 若本地具备不使用真实配置/凭据/数据库的安全启动条件，在独立端口执行 health ready → 合成 SIGTERM/等价受控进程信号 → 有界退出 → 端口释放 → 无 panic smoke；否则记录未执行原因与剩余风险，不部署/终止 60。
- [x] 7.5 更新中文 `verification.md`，完成 pre-archive review 循环；fetch 最新 base，确认写集无冲突后先把本 change 收敛为 `origin/hfl-test-base` 上一个逻辑 commit并推送 RC 工作分支，后续 archive/base 收口等待主控显式授权。
