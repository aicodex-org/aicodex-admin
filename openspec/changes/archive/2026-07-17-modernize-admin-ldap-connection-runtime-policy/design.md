## Context

当前 Generic LDAP 的 `GetLdapConn()` 直接调用已废弃的 `goldap.Dial` / `DialTLS`，LDAPS 只设置 `InsecureSkipVerify: allowSelfSignedCert`，随后无界执行 bind 和 `isMicrosoftAD()` root DSE search。bind 或 probe 失败会直接返回而不关闭连接；`LdapConn.Close()` 调用 `Unbind()` 并在失败时 panic。

Active Directory Syncer 已接入 `ResolveSyncerTLSPolicy`，但仍自行 dial/bind。它在 bind 失败时会关闭连接，不过使用的旧 dial API 只给 dial 提供 `go-ldap.DefaultTimeout`，bind 没有请求 timeout，也没有共用诊断和关闭语义。

本仓库固定依赖 `github.com/go-ldap/ldap/v3 v3.4.6`。该版本的 `DialURL` 支持连接级 `DialWithDialer`、`DialWithTLSConfig`，`Conn.SetTimeout` 会给 LDAP request/bind/search 加请求上界；因此无需新增依赖、全局变量修改或额外 goroutine 取消框架。

## Goals / Non-Goals

**Goals:**

- 让 Generic LDAP 与 Active Directory 复用一个 typed runtime connection policy 和 dial/bind/lifecycle 实现。
- 保持 `allowSelfSignedCert` 及既有 enterprise TLS policy 的存量连接行为。
- 为 dial、bind、Generic LDAP root DSE probe 与关闭流程提供稳定、可测试的有界时间语义。
- 所有失败路径关闭 socket，`Close()` 幂等、非 panic，且错误/诊断 copy-safe。
- 用本地 fake listener/test server 覆盖协议与生命周期高风险分支。

**Non-Goals:**

- 不建设全仓网络 client 框架、LDAP 配置中心、secret store、LDAP 管理 UI 或目录同步产品能力。
- 不新增 timeout 配置字段、schema migration、API DTO 或环境变量。
- 不废弃、重命名或自动迁移 `allowSelfSignedCert`。
- 不改变 LDAP 用户/组查询、认证 filter、同步映射或 enterprise TLS policy 的持久化语义。
- 不把本地 fake server 测试表述为真实 LDAP/AD E2E。

## Decisions

### 1. 共用 typed runtime policy，但不持久化运行时状态

对象层新增内部 `ldapConnectionRuntimePolicy`，只在单次连接解析时持有：

- `ldap` / `ldaps` transport；
- 规范化的 host/port 与仅供 dial 使用的目标；
- 每次独立克隆的 `tls.Config`；
- operation timeout；
- copy-safe diagnostic `{transport, tlsMode, tlsSource, timeoutMillis, timeoutSource}`。

目标地址、bind 用户和 password 不进入 diagnostic。policy 不写数据库、不进入 API DTO、不记录 raw config。Generic LDAP 与 Active Directory 分别把既有模型解析为该类型；共用 connector 只消费解析结果和 bind credential，不拥有配置真值。

### 2. 60 秒 runtime default 保持 dial 兼容并扩展到 bind/probe

`go-ldap v3.4.6` 的旧 `Dial` / `DialTLS` 默认使用包级 `DefaultTimeout=60s`。本 change 使用私有常量 60 秒和 source=`runtime_default`：

- `net.Dialer.Timeout` 控制 TCP/TLS 建连；
- `Conn.SetTimeout` 控制 bind 与 root DSE probe；
- 初始连接阶段结束后恢复请求 timeout 为零，避免把本 change 扩大为 LDAP 用户/组长查询策略变更；
- managed `Close()` 在 Unbind 前临时恢复 60 秒 timeout，保证关闭不会无限等待。

该默认值固定在代码与测试中，不读取数据库、环境变量或全局 `go-ldap.DefaultTimeout`。测试可直接构造较短 timeout 的内部 policy 验证真实等待上界，不改变生产默认。

### 3. Generic LDAP 精确保留 `allowSelfSignedCert` 旧语义

Generic LDAP 解析规则为：

| transport | `allowSelfSignedCert` | effective TLS mode | source |
|---|---:|---|---|
| LDAP | `false` / `true` | `disabled` | `transport` |
| LDAPS | `false` | `system` | `allow_self_signed_cert` |
| LDAPS | `true` | `legacy-insecure` | `allow_self_signed_cert` |

LDAPS 的 `system` 使用系统 trust store、`InsecureSkipVerify=false`，并把模型 host 复制到连接级 `ServerName`；主机名或 IP 与证书不匹配时 fail-closed。`legacy-insecure` 仅对该连接继续设置 `InsecureSkipVerify=true`，明确诊断为历史兼容，不修改全局 TLS 状态。明文 LDAP 不因为遗留字段为 `true` 创建伪 TLS policy。

### 4. Active Directory 继续由 enterprise TLS resolver 决定信任

Active Directory 仍先调用 `ResolveSyncerTLSPolicy`：

- port 636 使用 LDAPS，并克隆 resolver 返回的 `tls.Config` 后补充 `ServerName`；
- 非 636 继续使用明文 LDAP；`custom-ca` 与明文 transport 的既有冲突仍在拨号前 fail-closed；
- 空 policy 在 636/非 636 的 `legacy_unmigrated` 等价模式、显式三模式、CA 引用和错误码均不改变。

共用连接层不得重新解释 `tlsPolicy`、Cert 或迁移世代，也不得把 Generic LDAP 的 `allowSelfSignedCert` 规则套到 Syncer。

### 5. `DialURL` 与连接级 option 取代旧 dial API

默认 dial 实现使用 `goldap.DialURL`：

- 地址由 `net.JoinHostPort` 与受控 scheme 构造，不把完整 URL写入错误或诊断；
- 每次创建新的 `net.Dialer{Timeout: policy.Timeout}`；
- LDAPS 传入当前 policy 的独立 `tls.Config`；LDAP 不传 TLS option；
- 不修改 `goldap.DefaultTimeout`，避免其它调用方和并发测试受全局状态影响。

测试通过内部函数变量注入只读捕获 policy 或返回受控连接；生产调用方不暴露该注入点。

### 6. managed connection 统一 bind、abort 与幂等 Close

共用 connector 在 dial 成功后立即创建 managed connection，并在 bind 前设置 operation timeout：

- bind 成功后返回 managed connection；失败时直接 abort 底层 connection，不执行可能再次等待的 Unbind；
- Generic LDAP 的 root DSE probe 失败时同样 abort；
- 正常 `Close()` 通过 `sync.Once` 最多执行一次 Unbind，并无论 Unbind 是否成功都确保底层 `Close()`；
- `Close()` 返回第一次关闭的 copy-safe error，后续重复调用返回相同结果，不 panic。

`LdapConn.Close()` 采用 `Close() error`，现有 `defer conn.Close()` 与忽略返回值的调用语句保持可编译，同时允许测试和新调用方正常观察关闭失败。内部 Active Directory 调用也使用同一 managed connection。

### 7. 稳定错误只表达 stage/code，不回显底层文本

连接错误使用内部 typed error，至少区分：

- `ldap_config_invalid`
- `ldap_dial_failed` / `ldap_dial_timeout`
- `ldap_bind_failed` / `ldap_bind_timeout`
- `ldap_probe_failed` / `ldap_probe_timeout`
- `ldap_close_failed` / `ldap_close_timeout`

`Error()` 只返回稳定 code 与 stage。connector 在构造 runtime error 前完成 timeout/普通失败分类，随后丢弃底层 cause；错误对象本身不保留可被 `Unwrap` 或结构化格式恢复的原始目标与 server payload。上层既有错误 envelope 与 Active Directory “connect/bind”阶段语义保持，但不得包含 host、完整 URL、username、password、证书或 server payload。

### 8. 测试矩阵证明边界，不伪造企业目录 E2E

自动化测试分为：

- resolver 单测：Generic LDAP/LDAPS、AD 389/636、system/custom CA/legacy、server name、诊断脱敏与默认 timeout；
- 注入 connector 测试：dial/bind/probe 失败关闭连接，错误 code/stage 与敏感值不回显；
- 本地 fake listener：接受连接但不响应 bind，验证短测试 timeout 内 fail-closed 且服务端观察到 socket 关闭；
- lifecycle 测试：正常 close、Unbind 失败 fallback、重复 close 非 panic且结果稳定；
- 既有 enterprise TLS policy 回归测试：迁移 source、CA 与明文冲突语义不变。

真实 LDAP/AD 的证书链、目录权限、网络设备和服务端实现差异不在本地自动化证明范围内，作为 RC remaining risk 明确记录。

## Risks / Trade-offs

- [存量 Generic LDAP 自签名连接继续跳过校验] → 仅 `enableSsl=true && allowSelfSignedCert=true` 的当前连接保持旧行为，并以 `legacy-insecure` 诊断标记；本 change 不具备废弃该字段的产品授权。
- [60 秒对故障反馈仍偏长] → 该值与既有 dial 默认一致，避免静默改变租户行为；后续如需可配置 timeout，应另立带 API/schema 决策的 change。
- [底层 LDAP 错误文本不再直接对外] → 以稳定 stage/code 保留可操作语义，避免第三方错误包含私有目标、DN 或 payload；底层 cause 仍可供受控代码分类但不进入普通日志/API。
- [本地 fake server 与真实 AD 存在差异] → 本 change 只声明连接、timeout、TLS 与清理边界通过；真实企业目录兼容保留为部署后验证风险。

## Migration Plan

1. 部署后 Generic LDAP 和 Active Directory 继续读取原模型字段，无 schema 或数据迁移。
2. 存量 `allowSelfSignedCert=true` 的 LDAPS 继续历史 insecure 行为；`false` 继续严格系统信任。
3. 存量 Active Directory `tlsPolicy` 空值与显式值继续由既有 enterprise TLS resolver 解释。
4. 新连接层开始为 dial/bind/probe 应用 60 秒上界，并在失败时关闭 socket。
5. 回滚应用版本不需要回滚数据或配置；旧版本继续忽略本 change 的纯运行时实现。
