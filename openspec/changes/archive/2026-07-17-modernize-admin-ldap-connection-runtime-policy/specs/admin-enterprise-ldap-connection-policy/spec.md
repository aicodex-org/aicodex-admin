## ADDED Requirements

### Requirement: LDAP 与 Active Directory 必须复用 typed runtime connection policy
Generic LDAP 与 Active Directory Syncer MUST 把 transport、连接级 TLS config、operation timeout 和 copy-safe diagnostic 解析为同一 typed runtime policy，再由共用 connector 建立并绑定连接。运行时 policy MUST NOT 持久化目标、账号、password、证书材料或 raw config。

#### Scenario: Generic LDAP 解析运行时 policy
- **WHEN** Generic LDAP 根据 `enableSsl`、`allowSelfSignedCert`、host 与 port 建立连接
- **THEN** resolver 返回 `ldap` 或 `ldaps` transport、独立 TLS config、固定 timeout 与 copy-safe diagnostic
- **AND** diagnostic 不包含 host、完整 URL、username、password 或证书材料

#### Scenario: Active Directory 解析运行时 policy
- **WHEN** Active Directory Syncer 建立 LDAP 连接
- **THEN** resolver 继续消费既有 `ResolveSyncerTLSPolicy` 的 mode/source/CA 结果
- **AND** 不重新解释或持久化 `tlsPolicy`、Cert 或迁移世代

### Requirement: Generic LDAP TLS 必须严格验证并保持 self-signed 兼容
Generic LDAP 的 LDAPS 连接在 `allowSelfSignedCert=false` 时 MUST 使用系统 trust、显式 server name 且 `InsecureSkipVerify=false`；在 `allowSelfSignedCert=true` 时 SHALL 只对当前 LDAPS 连接保持历史 `legacy-insecure` 行为。明文 LDAP MUST NOT 因该字段创建 TLS 或 insecure 全局状态。

#### Scenario: 严格 LDAPS
- **WHEN** `enableSsl=true` 且 `allowSelfSignedCert=false`
- **THEN** TLS config 使用目标 host 作为 `ServerName` 并执行系统证书与主机名验证
- **AND** 自签名、未知 CA 或 server name 不匹配时 fail-closed

#### Scenario: 存量 self-signed 兼容
- **WHEN** `enableSsl=true` 且 `allowSelfSignedCert=true`
- **THEN** 仅该连接的 effective mode 为 `legacy-insecure`
- **AND** diagnostic source 为 `allow_self_signed_cert`，不得影响其它 LDAP、HTTP 或全局 TLS client

#### Scenario: 明文 LDAP 忽略 TLS 兼容字段
- **WHEN** `enableSsl=false`
- **THEN** transport 为 `ldap` 且 TLS mode 为 `disabled`
- **AND** `allowSelfSignedCert` 不触发 TLS config 或跳过校验行为

### Requirement: Active Directory 必须保持 enterprise TLS policy 等价
Active Directory MUST 保持既有 `system`、`custom-ca`、`legacy-insecure` 与空值 `legacy_unmigrated` 语义。LDAPS MUST 显式设置 server name；无效 policy、CA 或明文 transport 冲突 MUST 在拨号前 fail-closed。

#### Scenario: LDAPS 复用 enterprise trust
- **WHEN** Active Directory 使用 port 636 和有效 enterprise TLS policy
- **THEN** runtime policy 克隆既有 TLS resolution 并补充目标 host 的 `ServerName`
- **AND** mode、source、custom CA 与存量空值语义保持不变

#### Scenario: 明文 custom CA 冲突
- **WHEN** Active Directory 非 636 端口解析出 `custom-ca`
- **THEN** 系统在拨号前返回既有 `ca_conflict`
- **AND** 不建立 TCP 连接

### Requirement: dial、bind 与 AD probe 必须有固定可诊断上界
共用 connector MUST 使用 60 秒 `runtime_default` 控制 TCP/TLS dial、bind 与 Generic LDAP root DSE Active Directory probe，且 SHALL NOT 修改包级 `go-ldap.DefaultTimeout` 或新增外部配置 contract。初始连接完成后 SHALL 恢复后续目录查询的既有 timeout 行为。

#### Scenario: dial timeout
- **WHEN** 目标在 runtime default 内无法完成 TCP/TLS 建连
- **THEN** 连接失败并返回 stage=`dial` 的稳定 timeout code
- **AND** 错误不包含目标地址或完整 LDAP URL

#### Scenario: bind timeout
- **WHEN** socket 已建立但服务端未在 operation timeout 内响应 bind
- **THEN** connector 返回 stage=`bind` 的稳定 timeout code并关闭 socket
- **AND** diagnostic 只报告 timeoutMillis 与 source=`runtime_default`

#### Scenario: root DSE probe timeout
- **WHEN** Generic LDAP bind 成功但 root DSE probe 未在 operation timeout 内响应
- **THEN** `GetLdapConn()` 返回 stage=`probe` 的稳定 timeout code并关闭 socket
- **AND** 不返回半初始化连接

### Requirement: 所有失败路径必须关闭连接且 Close 幂等
dial 成功后的任何 bind 或 probe 失败 MUST 关闭底层 socket。正常 managed `Close()` MUST 最多执行一次 Unbind，MUST 在 Unbind 失败时继续关闭 socket，MUST NOT panic，并 MUST 对重复调用返回稳定结果。

#### Scenario: bind 失败清理
- **WHEN** Generic LDAP 或 Active Directory bind 返回错误
- **THEN** 已建立 socket 在函数返回前关闭
- **AND** 调用方不会获得可继续使用的 connection

#### Scenario: probe 失败清理
- **WHEN** Generic LDAP root DSE probe 返回错误
- **THEN** 已绑定 connection 被 abort 并关闭 socket
- **AND** probe error 的 server payload 不进入对外错误

#### Scenario: 重复 Close
- **WHEN** 调用方对同一 managed connection 连续或通过 defer 重复调用 `Close()`
- **THEN** 底层关闭只执行一次且不 panic
- **AND** 后续调用返回与首次相同的 nil 或 copy-safe close error

### Requirement: 连接错误与诊断必须 copy-safe
LDAP runtime error MUST 只暴露稳定 stage/code；diagnostic MUST 只包含 transport、TLS mode/source、timeout value/source 与必要布尔元数据。错误、诊断、普通日志和 API MUST NOT 回显 bind password、完整私有 LDAP URL、host、username、证书正文或原始第三方 payload。

#### Scenario: 私有目标拨号失败
- **WHEN** 底层 dial error 包含私有 host、port 或完整 URL
- **THEN** 对外错误只返回 `ldap_dial_failed` 或 `ldap_dial_timeout`
- **AND** 原始目标不出现在错误或 diagnostic

#### Scenario: bind 或 probe 返回敏感文本
- **WHEN** LDAP server error 包含 DN、账号或第三方 diagnostic message
- **THEN** 对外错误只保留对应 stage/code
- **AND** raw server text 不进入 API、普通日志或 copy-safe diagnostic

### Requirement: 现代化不得改变外部 LDAP 配置与同步契约
本 change MUST 保持 `allowSelfSignedCert`、Active Directory `tlsPolicy`、现有 LDAP/Syncer API DTO、用户/组读取、认证与同步调用契约；MUST NOT 新增 schema migration、timeout 字段或真实凭据依赖。

#### Scenario: 既有调用方升级
- **WHEN** controllers、LDAP autosync、LDAP password check 或 Active Directory sync 调用现代化连接层
- **THEN** 既有成功路径与 response envelope 保持
- **AND** 调用方无需提交新字段或迁移数据

#### Scenario: 本地测试证据边界
- **WHEN** fake listener/test server 与注入 dialer 测试通过
- **THEN** 验证结论只声明连接、TLS、timeout 与 lifecycle 代码边界
- **AND** 不表述为真实企业 LDAP/AD、证书链或目录权限 E2E 已通过
