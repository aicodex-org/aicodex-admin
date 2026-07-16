## ADDED Requirements

### Requirement: 企业 TLS policy 必须显式且按连接生效
ADFS、Active Directory 同步和 SMTP MUST 使用按连接解析的 `system`、`custom-ca` 或 `legacy-insecure` policy；实现 SHALL NOT 从端口、Provider 类型或全局默认推断显式跳过证书校验的意图。

#### Scenario: 系统信任模式
- **WHEN** 连接的持久化 policy 为 `system`
- **THEN** 客户端使用系统信任根验证服务端证书
- **AND** `InsecureSkipVerify` 保持为 `false`

#### Scenario: 自定义 CA 模式
- **WHEN** 连接的持久化 policy 为 `custom-ca` 且引用有效 SSL Cert
- **THEN** 客户端在系统信任基础上追加该 Cert 的 `Certificate` 公钥材料
- **AND** CA 只影响该连接且 `PrivateKey` 不被读取

#### Scenario: 显式 legacy 兼容模式
- **WHEN** 连接的持久化 policy 为 `legacy-insecure`
- **THEN** 只有该连接可以跳过证书校验
- **AND** 系统产生 source=`explicit` 且不包含连接目标、证书或凭据的诊断

### Requirement: tlsPolicy presence 必须作为最小迁移世代信号
Provider 和 Syncer MUST 持久化 `tlsPolicy`。存量空值 SHALL 表示 `legacy_unmigrated`；新建记录的空值 MUST 在服务端规范化并持久化为 `system`，不得增加全局默认版本或自动批量改写存量行。

#### Scenario: 存量 insecure 连接继续兼容
- **WHEN** 已存在的 ADFS、Active Directory LDAPS 或 `SUBMAIL` 记录 `tlsPolicy` 为空
- **THEN** 运行时 effective mode 为 `legacy-insecure`
- **AND** 诊断 source 为 `legacy_unmigrated`，不得表述为显式安全配置

#### Scenario: 存量严格 SMTP 不被放宽
- **WHEN** 已存在的非 `SUBMAIL` SMTP 记录 `tlsPolicy` 为空
- **THEN** 运行时 effective mode 为 `system`
- **AND** 诊断 source 为 `legacy_unmigrated`，不得因迁移世代空值跳过证书校验

#### Scenario: 旧客户端新建记录
- **WHEN** Add 请求未提供 `tlsPolicy` 或值为空
- **THEN** 服务端在 Insert 前把 `tlsPolicy` 规范化为 `system`
- **AND** 再次读取该记录时数据库值为 `system`

#### Scenario: schema 增加列不改写存量行
- **WHEN** Provider/Syncer 表通过既有 schema 同步增加 `tls_policy` 列
- **THEN** 已有行保持空值并形成可审计迁移队列
- **AND** 系统不执行自动 UPDATE 或连接级迁移

### Requirement: 更新必须保持存量行为并支持显式晋级
Update 请求的 `tlsPolicy` 未提供或为空时 MUST 保持数据库已保存值；显式规范值 MUST 持久化并退出 `legacy_unmigrated`，未知值 MUST 在写入前失败。

#### Scenario: 更新存量无关字段
- **WHEN** 存量记录的 `tlsPolicy` 为空且 Update 请求未提供或传入空值
- **THEN** 更新后数据库 `tlsPolicy` 仍为空
- **AND** 连接继续以 source=`legacy_unmigrated` 和升级前等价的 effective mode 解析

#### Scenario: 显式 policy 完成迁移
- **WHEN** 存量记录通过 Update 显式提交 `system`、`custom-ca` 或 `legacy-insecure`
- **THEN** 服务端持久化精确规范值
- **AND** 后续诊断 source 为 `explicit`

#### Scenario: 未知 policy 拒绝写入
- **WHEN** Add 或 Update 请求包含未知、仅空白或大小写不规范的 policy
- **THEN** 服务端返回稳定的无效策略错误
- **AND** 数据库原值不改变

### Requirement: custom CA 必须复用受控 SSL Cert 公钥材料
`custom-ca` MUST 复用目标 Provider/Syncer 的现有 `Cert` 对象引用，只接受 `Type == "SSL"` 且非空的 `Certificate`；其中每个 PEM block MUST 是 X.509 `CERTIFICATE`，并 MUST 满足 `IsCA == true` 与 `KeyUsageCertSign`。实现 MUST NOT 读取、复制、记录或返回 `PrivateKey`。

#### Scenario: 有效 SSL Cert
- **WHEN** `custom-ca` 引用可访问且仅包含具备 CA 签发约束的有效 X.509 PEM
- **THEN** resolver 为该连接创建独立 Root CA pool
- **AND** 诊断只报告 customCA=true，不包含 Cert 名称或正文

#### Scenario: Cert 缺失或语义无效
- **WHEN** `custom-ca` 缺少 Cert、引用不存在、Cert 类型不是 SSL、Certificate 为空、包含私钥/其它 PEM block、证书不是 CA、缺少签发用途或 PEM 无效
- **THEN** 系统在拨号前 fail-closed
- **AND** 错误不包含引用名、证书正文、私有目标或凭据

#### Scenario: policy 与 CA 引用冲突
- **WHEN** 目标连接显式选择 `system` 或 `legacy-insecure` 但同时声明该 Cert 为 custom CA
- **THEN** 系统在拨号前返回稳定冲突错误
- **AND** 不静默忽略显式冲突

### Requirement: TLS policy 解析与诊断必须 copy-safe
共享 resolver MUST 为每次解析返回独立 `tls.Config`、独立证书池和值类型诊断；诊断 MUST 只暴露规范 mode、source、customCA 布尔值和稳定错误码。

#### Scenario: 调用方修改先前结果
- **WHEN** 调用方修改先前获得的 TLS config 或诊断副本
- **THEN** 后续解析结果与其它业务域的 policy 不受影响
- **AND** 不修改全局 HTTP transport、证书池或共享 map

#### Scenario: legacy 诊断脱敏
- **WHEN** policy 解析为 `legacy_unmigrated` 或显式 `legacy-insecure`
- **THEN** 诊断准确区分 source
- **AND** 不包含 target、CA、证书、账号、凭据或 raw config

### Requirement: ADFS 必须保留注入 client 和 Transport 契约
ADFS MUST 原样保存 `SetHttpClient` 注入的 `*http.Client`，并 SHALL NOT 替换、克隆或修改其 `Transport`；按 Provider 生效的 TLS policy MUST 由注入边界上游构造独立 client/Transport 后再传入。

#### Scenario: 调用方注入自定义 Transport
- **WHEN** ADFS 调用方注入带自定义 Transport 的 HTTP client
- **THEN** token 和 profile 请求继续使用同一个 client 与 Transport 指针
- **AND** ADFS Provider 不覆盖其代理、timeout 或 TLS 配置

#### Scenario: 上游应用连接级 trust policy
- **WHEN** ADFS 上游从基础 `http.Transport` 构造连接级 policy client
- **THEN** 新 Transport 只按 policy 覆盖 `RootCAs` 与 `InsecureSkipVerify`
- **AND** mTLS client certificate、TLS 版本、ALPN、ServerName、验证回调及基础 Transport 保持不变
- **AND** 新 client 不复用 resolver 的可变 `tls.Config` 或 Root CA pool

### Requirement: 管理端必须显式呈现迁移状态与受控策略输入
管理端 MUST 仅在 ADFS、dialer-backed Email Provider 与 Active Directory Syncer 编辑上下文提供 TLS policy 输入，并 MUST 通过既有 Provider/Syncer Add/Update payload 提交 `tlsPolicy` 与 Cert 引用。UI MUST NOT 读取、复制、展示或提交 CA 正文与私钥。

#### Scenario: 新建配置默认严格
- **WHEN** 管理员从现有 Provider/Syncer 列表创建新草稿
- **THEN** 草稿中的 `tlsPolicy` 为 `system`
- **AND** 保存沿用既有 API envelope，不增加双状态或临时兼容字段

#### Scenario: 存量空值等待显式迁移
- **WHEN** 管理员编辑 `tlsPolicy` 为空的目标连接
- **THEN** UI 显示“待迁移”警告并保持 payload 空值
- **AND** 无关字段保存不得在前端把 policy 默认为 `system` 或 `legacy-insecure`

#### Scenario: 选择自定义 CA
- **WHEN** 管理员显式选择 `custom-ca`
- **THEN** UI 只展示可引用 SSL Cert 的名称，并要求选择一个引用
- **AND** UI 不访问或渲染 Certificate/PrivateKey 材料，后端继续执行 X.509 CA 与 owner 校验

#### Scenario: 显式选择非 custom CA policy
- **WHEN** 管理员选择 `system` 或 `legacy-insecure`
- **THEN** UI 清空该目标连接用于 custom CA 的 Cert 引用
- **AND** 显式 legacy 以文字 warning 说明证书校验关闭，不只依赖颜色

#### Scenario: 非目标 Provider 不显示策略控件
- **WHEN** 管理员编辑 HTTP API 邮件 Provider 或其它非目标类型
- **THEN** UI 不显示企业 TLS policy/CA 输入
- **AND** 不改变该类型既有配置、保存 payload 与可见行为

#### Scenario: 无效 policy 或 CA 引用阻止保存
- **WHEN** 目标连接包含未知 policy、`custom-ca` 缺少可用 SSL Cert，或非 custom policy 残留 CA 引用
- **THEN** UI 在调用 Add/Update API 前阻止保存并显示可操作错误
- **AND** 提交中重复操作最多产生一个请求，错误不得回显未知原值、证书材料、连接目标或凭据

### Requirement: 业务连接生命周期必须保持隔离
共享 TLS policy SHALL NOT 统一或持有 ADFS HTTP client、Active Directory LDAP connection 或 SMTP dialer 的业务生命周期；三业务域 MUST 保持既有 endpoint、认证流程和成功语义。

#### Scenario: 三业务域应用同一 policy 语义
- **WHEN** ADFS、Active Directory 和 SMTP 分别解析相同的规范 policy
- **THEN** 每个业务域只在自身 client、connection 或 dialer 上应用结果
- **AND** 不修改其它 Provider 或其它连接的 TLS 状态

### Requirement: schema 与持久化必须在隔离数据库验证
Provider/Syncer 的 `tls_policy` 列及 Add/Update 语义 MUST 至少通过 SQLite fixture 验证；当授权的隔离 PostgreSQL 可用时 MUST 在独立 schema 中验证并清理。缺少 MySQL/MSSQL 环境 SHALL 记录为剩余兼容风险，不得伪造通过。

#### Scenario: SQLite schema 与持久化
- **WHEN** SQLite fixture 对 Provider/Syncer 执行既有 schema 同步、Add 和 Update
- **THEN** `tls_policy` 列存在且 new-add、existing-preserve、explicit-promote 行为符合契约

#### Scenario: 隔离 PostgreSQL schema
- **WHEN** 提供授权的 PostgreSQL 测试 DSN
- **THEN** 测试在随机独立 schema 验证列、写入与读取
- **AND** 测试结束删除该 schema，仅报告脱敏 marker hash
