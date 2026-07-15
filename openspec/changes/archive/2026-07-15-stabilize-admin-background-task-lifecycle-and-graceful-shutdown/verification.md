# 验证记录

## 验证范围

- Admin 顶层 lifecycle 的 signal、幂等 Stop、启动失败逆序回滚、HTTP graceful drain/timeout 强制收口和脱敏日志。
- Webhook delivery、Gateway projection refresh、Organization sync scheduler 的 cancel/stop/wait、停止后不再 tick、在途 context 取消和安全重启。
- `main.go` 单文件构建兼容、受影响 Go 测试、全量 hermetic suite、静态检查和 OpenSpec 严格校验。
- 本 change 只验证源码、单元/进程内 HTTP 行为和构建层级；未把这些证据表述为部署环境或端到端验收。

## TDD 契约证据

- 顶层 orchestration 初始测试先因 lifecycle 类型与接口不存在而编译失败；最小实现后，SIGINT/SIGTERM 等价输入、重复 signal/Stop、启动失败 rollback、HTTP 提前返回和 Beego graceful mode 冲突均转为 GREEN。
- HTTP 测试使用独立 loopback listener 与真实 `net/http.Server`。移除 graceful wait/force close 时，相应 in-flight completion 与 timeout 用例按预期失败；恢复实现后，请求完成、timeout 中断、Run 有界返回和 listener 释放均通过。
- 三个 worker 的 lifecycle 测试先暴露无 done/wait、默认 scheduler owner 丢失和 queued tick 竞态；增加 generation cancel/done 与 ticker case 二次检查后转为 GREEN。
- 测试只向注入的 signal channel 写入合成 `os.Signal` 值，没有向当前测试进程发送真实终止信号。

## 自动化测试与质量门禁

- 聚焦 lifecycle：`go test -count=1 -covermode=count -coverprofile=<temp>/lifecycle.out ./lifecycle`，通过；package statements coverage 为 `81.5%`。
- 聚焦 worker：`go test -count=1 -tags skipCi -covermode=count -coverprofile=<temp>/object.out ./object -run 'Test(WebhookDeliveryWorker|GatewayProjectionRefresh|OrganizationSyncScheduler|DefaultOrganizationSyncScheduler)'`，通过；rebase 后 `object` 历史大包整体为 `2.4%`，仅作为背景，不作为本 change 门槛。
- 并发敏感重复：四组 Stop/queued-tick 回归用例 `-count=20`，通过。
- full hermetic suite：`go test -count=1 -tags skipCi ./...`，通过。
- formatter：`go run mvdan.cc/gofumpt@v0.10.0 -w <changed-go-files>`，通过，未扩散文件集合。
- vet：`go vet ./...`，通过。
- 单文件入口：`go build -o <temp>/aicodex-admin-lifecycle-build.exe main.go`，通过，临时产物已删除，证明既有 `go build main.go` 入口仍包含 lifecycle 接线。
- 固定 lint：以当前 Go 1.26.5 在临时目录重建同一 `golangci-lint v2.11.4`，执行 `golangci-lint run --config ../.golangci.yml --modules-download-mode=readonly ./...`，结果 `0 issues`；`go.mod/go.sum` 无 diff。
- OpenSpec：RC 阶段 target strict、all changes strict、main specs strict 均通过；archive 同步并修复 Purpose/语言/EOF 后，main specs 为 `45 passed, 0 failed`。
- `git diff --check`：通过；所有测试/构建前后 `git status --porcelain` 文件集合一致，无 coverage/build 产物进入仓库。

### lint 环境说明

仓库现有 `admin/vendor/modules.txt` 与 `go.mod` 不一致。PATH 中的 v2.11.4 lint 二进制由 Go 1.25.8 构建，默认 vendor 模式在 package loading 阶段退出；改用 `-mod=mod` 后又因当前依赖含 Go 1.26 源码而触发工具 panic，并会重分类一项 `go.mod` 依赖。验证没有同步 vendor 或修改模块写集，而是精确恢复该临时变化、用当前 Go 1.26.5 重建相同 lint 版本，并用 `--modules-download-mode=readonly` 完成只读验证。

## Changed production statements coverage

使用两个 coverprofile 与 `git diff --unified=0 origin/hfl-test-base` 的新增/修改 production lines 相交；新增 `admin/lifecycle/lifecycle.go` 全文件计入统计，稳定单文件入口 `main.go` 的 4 条接线语句按未覆盖计入，没有排除低覆盖实施文件。

| 实施文件 | 覆盖 statements | 总 statements | 覆盖率 |
|---|---:|---:|---:|
| `admin/lifecycle/lifecycle.go` | 106 | 130 | 81.54% |
| `admin/object/gateway_organization_projection_refresh_worker.go` | 46 | 49 | 93.88% |
| `admin/object/organization_sync_scheduler.go` | 78 | 81 | 96.30% |
| `admin/object/webhook_worker.go` | 31 | 32 | 96.88% |
| `admin/main.go` | 0 | 4 | 0% |
| **合计** | **261** | **296** | **88.18%** |

结果达到 changed production statements coverage `>=85%` 门槛。`main.go` 只保留 signal 注册和可导入 orchestration 接线，行为测试集中在 `admin/lifecycle`，没有为入口机械行补低价值测试。

## Archive 后 closeout 验证

- `openspec archive -y stabilize-admin-background-task-lifecycle-and-graceful-shutdown`：完成，创建 `admin-background-task-lifecycle` 主规格并向 `organization-sync-scheduler` 主规格追加 cancel/wait 契约。
- `openspec validate --changes --strict`：通过，active changes 为空。
- `openspec validate --specs --strict`：通过，`45 passed, 0 failed`。
- `go test -count=1 ./lifecycle`：通过。
- `go test -count=1 -tags skipCi ./object -run 'Test(WebhookDeliveryWorker|GatewayProjectionRefresh|OrganizationSyncScheduler|DefaultOrganizationSyncScheduler)'`：通过。
- `go build -o <temp>/aicodex-admin-lifecycle-closeout.exe main.go`：通过，临时产物已删除。
- `go vet ./lifecycle ./object`：通过。
- `git diff --check` 与相关文件 EOF newline 检查：通过。
- archive/主规格修复只移动或修改 OpenSpec Markdown，没有改变 Go 源码、依赖、构建配置或测试；因此复用同一最终源码状态下已经通过的 full hermetic suite、固定 lint 和 `261/296 = 88.18%` changed production statements coverage，不把复用证据扩大为未执行的进程 smoke 或 race detector。

## Race 与进程 smoke

- `go test -race` 未运行：当前 Windows Go 环境为 `CGO_ENABLED=0` 且没有 `gcc`，工具明确返回 `-race requires cgo`。本 change 以 mutex/atomic、代际 done channel、`-count=20` queued-tick 回归和 full hermetic suite 作为替代证据；这不等同于 race detector 已通过。
- 本地独立进程 SIGTERM smoke 为 `NOT_RUN`：Admin 启动需要项目配置与数据库/schema 初始化，当前 workspace 没有可证明安全且 hermetic 的独立数据库配置；Windows 本地也没有与生产 POSIX SIGTERM 等价且不改变测试进程的受控路径。为避免使用真实配置、凭据或数据库，没有启动 Admin 进程。
- RC 与 self-closeout 阶段均未部署或终止 60 环境。HTTP graceful completion、timeout、端口释放与无 panic 已由真实 loopback `net/http.Server` 进程内测试覆盖，但不能替代部署环境 smoke。

## Lifecycle 范围与 legacy 排除

已纳入并由顶层按顺序管理：HTTP server、Webhook delivery worker、Gateway projection refresh worker、Organization sync scheduler。shutdown 顺序为 HTTP drain/force close → Organization scheduler → Gateway refresh → Webhook；启动失败只逆序释放已成功启动的受控资源。

以下现有 goroutine/任务没有稳定且可等待的进程级 Stop owner，本 change 保持其启动行为并明确排除：LDAP/LDAPS、RADIUS、LDAP autosync、token cleanup、site monitor、CLI downloader、throughput loop、sync-users、CasWAF proxy，以及 scheduler 已派发到 provider service 的 WeCom/Feishu/DingTalk sync runs。未为这些任务虚构 Stop；进程退出时由 OS 回收不等同于 graceful shutdown 契约。

## 剩余风险

- Webhook transport 不接收 context；Stop 会阻止新 polling 并等待当前轮，但单次 legacy I/O 可能占满顶层 timeout。
- Beego `web.Run` 不返回底层监听错误；signal 前提前退出只能记录稳定 `http_server_exited` 分类，底层框架仍可能保留自己的 Critical 日志。
- legacy goroutine 与已派发 provider runs 仍不在 graceful scope；如需覆盖，应由各自 owner 通过独立 change 暴露真实 cancel/stop/wait。
- 部署环境 SIGTERM、真实健康检查和端口释放仍未执行；主控已接受该环境风险，不能把它改写为已通过。

## 交付与 closeout 状态

- RC 阶段已把工作分支无冲突 rebase 到当时最新 `origin/hfl-test-base@c0064c6d`，保持一个本 change 逻辑提交并完成全量 RC 门禁。
- 主控 RC 审计通过后明确授权 `self-closeout=true`，change 已 archive，两个 delta specs 已同步到主规格；最终提交按 closeout 流程在最新远端 base 上重新验证后非强制推送 `hfl-test-base`。
- 整个交付不部署 60、不操作 `test`；固定 Admin-0 workspace 在 base 推送后回到 clean/aligned base，再删除工作分支并释放 lease。

## Pre-archive review 结论

- 规格与实现：proposal/design/tasks、两个 delta specs、生产接线和测试描述同一 lifecycle 范围；已完成任务均有代码或验证证据。
- 注释：已检查新增/实质修改的 lifecycle owner、HTTP adapter、worker cancel/done、scheduler Stop/Wait 与默认 owner；关键公共契约和非显然并发边界有中文导向性注释，没有发现阻断级注释缺口。
- 文档语言：proposal、design、tasks、verification 和 delta specs 以简体中文说明为主；保留的 `Requirement`、`Scenario`、`SHALL/MUST`、命令、代码标识与 lifecycle/HTTP 等术语属于 OpenSpec 或技术语境。
- 脱敏：验证记录未写入真实 IP、私有 URL、账号、token、Cookie、连接串或凭据；测试源码中的 `super-secret` 等字符串仅是证明日志不泄漏的合成 canary，不是环境数据。
- 主规格：`organization-sync-scheduler` delta 已合并到既有主规格，`admin-background-task-lifecycle` 主规格已创建；两个主规格的 Purpose、中文新增正文与 EOF 已在 archive 后复核。
- 运行态口径：本地进程 smoke 缺少安全 hermetic DB/配置和等价 POSIX SIGTERM 条件，已明确 `NOT_RUN`，不冒充部署验收。
- 审查结论：本次审查范围内未发现实现、测试、规格、注释、文档语言或脱敏阻断问题；主控已接受记录中的 SIGTERM smoke/race detector 环境风险，并授权 archive 与 base closeout，但这些未执行项仍不得表述为通过。
