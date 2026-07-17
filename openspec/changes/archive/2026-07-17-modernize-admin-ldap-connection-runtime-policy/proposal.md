## Why

Generic LDAP 与 Active Directory Syncer 当前分别构造连接和 `tls.Config`。Generic LDAP 把 `allowSelfSignedCert` 直接映射为 `InsecureSkipVerify`，dial、bind 与 root DSE 探测缺少统一的有界请求策略；bind 或探测失败后也可能遗留已建立的 socket，`LdapConn.Close()` 还会在 Unbind 失败时 panic。两条企业目录链路需要一个最窄、typed、可测试的运行时连接策略边界，在保持存量配置语义的同时补齐 TLS、timeout、失败清理和脱敏诊断。

## What Changes

- 为 Generic LDAP 与 Active Directory 建立共用的 typed runtime connection policy，统一 transport、连接级 TLS config、固定 timeout 与 copy-safe diagnostic。
- 使用 `go-ldap` 的 `DialURL`、连接级 `net.Dialer` 和 `Conn.SetTimeout`，为 dial、bind 与 Generic LDAP 的 Active Directory root DSE probe 建立 60 秒默认上界；不修改 `go-ldap.DefaultTimeout`，不新增数据库或 API 配置字段。
- Generic LDAP 保持 `allowSelfSignedCert` 兼容：LDAPS 且该字段为 `true` 时继续仅对当前连接应用历史 insecure 行为；为 `false` 时使用系统信任与显式 server name 严格验证。明文 LDAP 不把该字段解释为 TLS policy。
- Active Directory 继续复用既有 `ResolveSyncerTLSPolicy` 的 `system`、`custom-ca`、`legacy-insecure` 与存量空值语义，只把解析结果交给共用连接层，不改变持久化、API 或 UI contract。
- 任何 dial、bind 或 probe 失败都关闭已建立连接；连接 wrapper 的 `Close()` 幂等、非 panic，并以 copy-safe 稳定错误码保留可观察失败语义。
- 错误和诊断只暴露 transport、TLS mode/source、timeout 值/source、失败 stage 与稳定 code，不包含 bind password、账号、完整 LDAP URL、私有目标、证书材料或第三方原始 payload。
- 增加本地 fake listener/test server 与注入 dialer 的自动化测试，覆盖 LDAP/LDAPS、Generic/AD、bind/probe 失败、timeout、重复 close、存量 self-signed 与企业 TLS policy。

## Capabilities

### New Capabilities

- `admin-enterprise-ldap-connection-policy`: 规定 Admin 企业 LDAP/AD 共用连接策略、TLS 兼容、操作 timeout、失败清理和 copy-safe 诊断边界。

### Modified Capabilities

- 无。既有 `admin-enterprise-tls-compatibility` 的持久化与迁移语义保持不变。

## Impact

- 生产实现限定在 `admin/object` 的 LDAP 连接层和 Active Directory Syncer 的最小调用适配。
- 不新增 schema migration、数据库字段、外部 API/config 字段或管理 UI；不废弃 `allowSelfSignedCert`。
- 不访问 60、共享数据库或真实企业 LDAP/AD，不使用真实凭据。本地 fake server 只证明协议边界与生命周期，不表述为真实企业目录 E2E。
- 不修改前端工具链、workflow、Docker、Makefile、技术债路线文档、其它 Provider/Auth 能力或 `test` 分支。
