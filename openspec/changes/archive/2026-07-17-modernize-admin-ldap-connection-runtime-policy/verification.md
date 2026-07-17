# 验证记录

## 当前状态

- 生命周期：`CLOSING`，controller-authorized closeout。
- 基线：`origin/hfl-test-base@97f3f876b2b113be7e69a788aa45c85afc105082`。
- 启动门禁：workspace clean，目标分支从最新 base 创建，active OpenSpec 为空。
- 当前阶段：实现、本地质量门禁、pre-archive review、post-rebase final gate 与 `sync-specs` archive 已完成；运行时代码未再变化，正在执行归档后 final gate。

## 基线证据

- Generic LDAP 使用 `goldap.Dial` / `DialTLS`，`allowSelfSignedCert` 直接映射 `InsecureSkipVerify`；bind/probe 失败未关闭，`LdapConn.Close()` 在 Unbind 失败时 panic。
- Active Directory 已复用 enterprise TLS resolver，但仍独立 dial/bind；bind 无请求 timeout。
- 本地依赖 `go-ldap/v3@3.4.6` 提供 `DialURL`、`DialWithDialer`、`DialWithTLSConfig` 与 `Conn.SetTimeout`；旧 dial 默认值为 60 秒。
- 当前证据不包含真实 LDAP/AD、60环境、私有 URL 或凭据。

## Pre-implementation Review

- 逐项对照 proposal、design、tasks、delta spec、Generic LDAP/AD 最新实现、`admin-enterprise-tls-compatibility` 主规格与 `go-ldap/v3@3.4.6` 本地源码。
- 产品/配置边界明确：只增加运行时内部类型和错误分类，不新增数据库字段、schema migration、API DTO、环境变量或 UI，不废弃 `allowSelfSignedCert`。
- 兼容边界明确：Generic LDAPS 继续按 `allowSelfSignedCert` 保持 strict/legacy 行为；AD 继续复用既有 enterprise TLS resolver，空 policy、custom CA 与明文冲突语义不变。
- timeout 决策可验证：60 秒等于旧 dial 默认，只把同一上界补到 bind/root DSE probe；初始阶段后恢复请求 timeout，避免无授权改变长查询行为。
- 生命周期与安全边界明确：dial 后失败必须 abort，正常 Close 幂等且有错误返回；普通错误文本只含稳定 stage/code，底层目标、账号、password、证书和 payload 不进入 API/日志/诊断。
- `LdapConn.Close()` 增加 error 返回不会破坏仓库内现有 `defer conn.Close()` 或忽略返回值调用，且不改变 HTTP/API/config contract；它为非 panic 的可观察 close 语义提供最小边界。
- 与现有 enterprise TLS 主规格无冲突：共享的是 LDAP runtime connector，AD 仍按每次业务操作创建/关闭自身连接，不把 ADFS/SMTP 或全局 client 生命周期纳入。
- 未发现需要产品、安全、数据、真实企业目录或跨 owner 决策的阻断项，结论为 implementation-ready。

## 实施前命令证据

| 命令 | 结果 |
|---|---|
| `openspec validate modernize-admin-ldap-connection-runtime-policy --strict` | 通过，1 项 |
| `openspec validate --changes --strict` | 通过，1 项 |
| `openspec validate --specs --strict` | 通过，57 项 |
| `git diff --check` | 通过，无输出 |

## 归档后状态

- archive：`openspec/changes/archive/2026-07-17-modernize-admin-ldap-connection-runtime-policy/`。
- 主规格：`openspec/specs/admin-enterprise-ldap-connection-policy/spec.md`，已同步 7 项 requirement 并补齐中文 Purpose。
- archive 只移动 change artifacts 并创建主规格，运行时代码与测试未改变；归档后的长耗时全仓 suite、coverage 和隔离 linter 可复用同一最终源码证据，仍重跑 OpenSpec strict、diff check、聚焦 Go tests 与必要 vet。

## TDD 与实施证据

- 初始 focused RED 因共享 `ldapConnectionRuntimePolicy`、connector、managed lifecycle 与稳定错误类型尚不存在而编译失败；随后最小实现使 policy、bind timeout、abort、copy-safe error 与重复 Close 用例通过。
- root DSE 空 attribute value 用例先稳定复现 `index out of range` panic，再通过跳过空值修复；Generic LDAP 探测不再因第三方空 attribute 崩溃。
- Active Directory 用户查询的 managed connection 用例先复现 raw connection 缺失错误，再增加受管 `Search` 委托；成功路径继续使用同一连接并由 defer 执行幂等 Close。
- Generic LDAP policy 覆盖明文 LDAP、严格 LDAPS 与 `allowSelfSignedCert=true` 的连接级 legacy 兼容；本地自签名 TLS listener 证明 strict 路径在 dial 阶段 fail-closed，legacy 路径只放行 TLS handshake，随后仍受 bind timeout 限制并关闭 socket。
- Active Directory policy 继续复用既有 enterprise TLS resolver；389/636、空 policy、显式 system/legacy、custom CA 与明文冲突回归测试保持 mode/source/RootCAs 语义。
- connector 使用 `DialURL`、每连接 `net.Dialer` 和 `Conn.SetTimeout`；初始 bind/probe 后把请求 timeout 恢复为零，关闭时再恢复 60 秒上界，不修改全局 `go-ldap.DefaultTimeout`。
- dial 返回异常 connection、bind/probe 失败与 timeout 均 abort；正常 `Close()` 最多 Unbind 一次并始终执行底层 Close，重复调用返回相同 copy-safe 结果且不 panic。
- runtime error 只持有 stage/code，不保留可解包的 raw cause；测试使用明显占位 sentinel 证明普通字符串、`%#v`、错误链与 diagnostic 均不能恢复目标、完整 URL、bind DN、password 或 server payload。

## 最新本地验证证据

| 命令/边界 | 结果 |
|---|---|
| Go 1.25.8 focused LDAP/AD runtime tests | 通过；覆盖 resolver、LDAP/LDAPS、Generic/AD、TLS、bind/probe timeout、socket cleanup、重复 Close、错误脱敏与空 root DSE attribute |
| `GOTOOLCHAIN=go1.25.8 go test -count=1 ./object ./controllers` | 通过；`object` 与直接调用的 `controllers` package 无失败 |
| `GOTOOLCHAIN=go1.25.8 go test -count=1 -tags skipCi ./...` | 通过；hermetic 全仓 Go suite 无失败 |
| focused `-covermode atomic -coverprofile <temp>` + 基线 diff 统计 | 通过；changed executable statements `164/174 = 94.25%`，达到 85% |
| changed coverage 分文件 | `ldap_conn.go 27/28 = 96.43%`；`ldap_connection_runtime_policy.go 126/135 = 93.33%`；`syncer_activedirectory.go 11/11 = 100%` |
| `go test -race` focused | 未运行：本机 `CGO_ENABLED=0` 且无可用 C compiler，Go 明确返回 `-race requires cgo`；未伪报通过 |
| `GOTOOLCHAIN=go1.25.8 go vet ./...` | 通过，无输出 |
| `gofumpt v0.9.2 -l`（5 个目标 Go 文件） | 通过，无待格式化文件 |
| `golangci-lint v2.11.4 run --config ../.golangci.yml ./object` | 正式 workspace 被既有 vendor 不同步阻断；最终代码在 `<system-temp>` 隔离副本先执行 `go mod vendor` 后为 `0 issues`，副本和进程已清理；更早组合状态的隔离全仓 `./...` 也为 `0 issues` |
| post-rebase focused coverage、`go test ./object ./controllers`、`go vet ./object ./controllers`、OpenSpec target/changes/specs strict、`git diff --check` | 通过；上游仅为无交集 Web Admin/Bun commit，changed coverage 仍为 `164/174 = 94.25%` |

覆盖率统计只计入相对 `origin/hfl-test-base` 新增/修改的生产可执行 statement；`object` 是大型共享 package，其聚焦 package 总覆盖率不用于掩盖 changed coverage。新增测试验证 fail-closed、兼容、timeout 与 lifecycle 业务不变量，没有通过 getter 或纯 mock 调用次数制造门槛。

## 兼容与安全结论

- Generic 明文 LDAP 不受 `allowSelfSignedCert` 影响；严格 LDAPS 使用系统 trust 与显式 `ServerName`，legacy flag 只对当前连接设置 `InsecureSkipVerify`。
- Active Directory 的持久化 `tlsPolicy`、Cert 引用、空值迁移 source 与 API/config contract 未改变，也未新增 schema 或 timeout 字段。
- 固定 60 秒来源为 `runtime_default`，等于 `go-ldap v3.4.6` 旧 dial 默认；新增上界只覆盖 dial、bind、root DSE probe 与 close，不把后续用户/组长查询改成 60 秒。
- API/普通日志可见 error 不再拼接底层 dial/bind/probe/close 文本；diagnostic 只含 transport、TLS mode/source、customCA、timeoutMillis 与 timeoutSource。
- 未访问 60、共享数据库或真实企业 LDAP/AD，未使用真实账号、password、URL 或证书材料。

## Pre-archive Review

- 结论：`READY`。proposal、design、tasks、delta spec、实现、测试与验证记录描述同一 LDAP runtime policy、TLS 兼容、timeout、cleanup 和 copy-safe error 契约；本次审查范围内未发现未解决的阻断项。
- 已修复 P1 Copy-safe finding：早期 runtime error 的普通字符串虽安全，但仍保留可 `Unwrap` 的 raw cause；新增 RED 后改为分类完成即丢弃 cause，最终错误对象只持有 stage/code，普通字符串、`%#v` 与错误链均不能恢复敏感 sentinel。
- 测试质量：RED/GREEN 覆盖真实本地 TCP/TLS listener、bind timeout 后 socket EOF、strict/legacy 自签名边界、Generic root DSE probe、AD managed query、失败 abort 和幂等 Close；没有使用空 `act`、skip、超时放宽或只断言 mock 次数的低价值用例。
- 单测覆盖率：changed executable statements `164/174 = 94.25%`，三个受影响生产文件分别为 `96.43%`、`93.33%`、`100%`，均达到 85%。
- 注释 Review：审查了 `LdapConn`、Generic/AD resolver、shared connector、managed lifecycle、Search 委托与 legacy insecure 分支；关键安全/兼容原因均有中文导向性注释，保留英文仅为 LDAP、TLS、ServerName、API、stage/code 等标准术语或代码标识。
- OpenSpec/验证语言：proposal、design、tasks、verification 与 delta spec 以简体中文说明为主；`Requirement`、`Scenario`、MUST/SHALL、命令、字段和值保留标准英文。未发现乱码、TBD、未填模板或 EOF 问题。
- 脱敏 Review：仓库文档与最终验证证据不包含真实 IP、私有 URL、账号、password、token、Cookie、证书正文或第三方 raw payload；测试中的 `.example.test`、`private.directory.internal` 与固定字符串均为不可路由 sentinel。
- 运行态证据层级：本地 fake listener/test server 只证明代码级 TLS、timeout 与 lifecycle，不外推为真实企业 LDAP/AD E2E。真实目录 schema、证书部署、ACL、网络设备和服务端实现仍是明确 remaining risk。
- 主规格同步：已通过 `sync-specs` 创建 `admin-enterprise-ldap-connection-policy` 主规格；主规格与 archive delta 的 7 项 requirement/scenario 语义一致，中文 Purpose 已补齐。
- 交付单元：fetch 后 base 前进 1 个纯 Web Admin/Bun commit，已审计与 LDAP 生产/测试/OpenSpec 写集无交集并 rebase 到 `origin/hfl-test-base@97f3f876b2b113be7e69a788aa45c85afc105082`；当前保持 latest base + 1 个逻辑 commit。

## 证据边界与剩余风险

- 不使用真实企业 LDAP/AD 凭据或服务。本地 fake listener/test server 不能证明真实目录 schema、网络设备、证书部署或权限兼容。
- 不新增 timeout 外部配置；生产默认 60 秒与旧 dial 默认一致。若未来需要租户级 timeout，必须另立包含 API/schema 决策的 change。
- Windows 本机无法执行 Go race；并发安全由 `sync.Once`、非 parallel 的全局 dial 注入测试、全仓 `go vet` 与普通测试覆盖，race 仍保留为 CI/具备 CGO 环境的剩余验证项。
