## Context

最新基线只有以下三处硬编码 `InsecureSkipVerify: true`：

- ADFS 的 `SetHttpClient` 会把调用方注入 client 的 `Transport` 替换为 insecure transport，违反既有 `admin-idp-http-client-contract`。
- Active Directory 同步仅在 LDAPS 端口创建 insecure `tls.Config`，连接按操作创建和关闭。
- SMTP 仅对 `SUBMAIL` 创建 insecure `tls.Config`，并保持 `gomail.Dialer` 生命周期。

三者只能共享 policy 语义和解析结果，不能共享业务 client。主控已选择 Provider/Syncer 新增 `tlsPolicy` 字段的 presence 作为最小迁移世代信号：存量行新增列后保持空值，新建行由服务端持久化 `system`，不增加全局部署版本或 `tlsPolicyVersion`，也不批量改写真实数据。

字符串请求字段的“缺失”和“空值”虽然无法区分，但两者在更新语义中都表示保持已保存状态，因此单字段足以实现契约。现有 `Cert` 模型对 `Type == "SSL"` 明确允许只保存 `Certificate` 公钥材料；目标类型可复用 `Cert` 作为 CA 对象引用，并强制不读取 `PrivateKey`。

## Goals / Non-Goals

**Goals:**

- 为 ADFS、Active Directory 同步和 SMTP 定义一致的 `system`、`custom-ca`、`legacy-insecure` policy 语义。
- 用 `tlsPolicy` presence 区分 `legacy_unmigrated` 与显式配置，保持旧部署连接行为并让新建配置默认严格。
- 明确 Add/Update 持久化、无效配置 fail-closed、copy-safe 脱敏诊断和 schema/fixture 契约。
- 保留 ADFS 注入 client/Transport identity，并保留 Active Directory 与 SMTP 各自连接生命周期。

**Non-Goals:**

- 不建设通用证书管理系统、secret store 或全仓 HTTP/TLS client 框架。
- 不自动迁移存量行，不增加全局部署版本或第二个世代字段，不访问或写入真实环境数据库。
- 不处理其它 Provider、SOCKS5 policy、Web3、Insight runtime config、CI 或 `test` 分支。
- 不把本地 fake server、SQLite 或隔离 PostgreSQL 验证表述为真实 ADFS/LDAP/SMTP E2E。

## Decisions

### 1. 持久化值与运行时解析分离

Provider/Syncer 的 `tlsPolicy` 只持久化空字符串、`system`、`custom-ca` 或 `legacy-insecure`：

- 空字符串只表示存量 `legacy_unmigrated`，不得由新建路径写入；它保留该连接升级前的 TLS 行为，而不是一律放宽为 insecure。
- `system` 使用系统信任根并保持 `InsecureSkipVerify == false`。
- `custom-ca` 使用系统信任根并追加目标记录 `Cert` 引用的 CA 公钥材料。
- `legacy-insecure` 是操作者显式 opt-in，运行时跳过证书校验但诊断 source 为 `explicit`。

运行时把空字符串解析为 source `legacy_unmigrated`，effective mode 按升级前行为等价：ADFS、Active Directory 的 LDAPS 和 `SUBMAIL` 为 `legacy-insecure`；其它 SMTP 原本没有 insecure TLS config，因此保持 `system`。这既保留旧连接行为，也明确空值不是显式安全配置。未知值、空白变体、缺少 CA、非 SSL 证书对象、无效 PEM 或冲突组合在拨号前失败。

### 2. 单字段 presence 形成 Add/Update 世代契约

| 输入场景 | 持久化结果 | 运行时结果 | 诊断 source |
|---|---|---|---|
| 存量 ADFS、LDAPS 或 `SUBMAIL` 记录 `tlsPolicy == ""` | 保持空值 | effective `legacy-insecure` | `legacy_unmigrated` |
| 存量其它 SMTP 记录 `tlsPolicy == ""` | 保持空值 | effective `system` | `legacy_unmigrated` |
| 新建记录未提供/空 policy | 服务端写入 `system` | 严格系统信任 | `explicit` |
| 更新存量记录未提供/空 policy | 保持数据库原值；存量空值仍为空 | 行为不变 | 由已保存值决定 |
| 显式 `system` | 规范 `system` | 严格系统信任 | `explicit` |
| 显式 `custom-ca` + 有效 SSL Cert | 规范 `custom-ca` | 系统信任 + 连接级 CA | `explicit` |
| 显式 `legacy-insecure` | 规范 `legacy-insecure` | 连接级跳过校验 | `explicit` |
| 未知/冲突/无效 CA | 不写入 | fail-closed，不拨号 | 稳定错误码 |

Add 总是先规范化再 Insert。Update 先读取数据库原值：请求值为空时复制已保存值，非空时只接受精确规范值；随后再执行 Update。这样旧客户端编辑无关字段不会静默改变 TLS 行为，也无需第二个版本字段。

### 3. `custom-ca` 只复用 SSL Cert 的公钥材料

对象层根据目标记录的 owner/name 解析 `Cert` 引用，只接受 `Cert.Type == "SSL"` 且 `Certificate` 非空。resolver 只接收复制后的证书 PEM 字节，不接收 Cert 对象、引用名或 `PrivateKey`；每个 PEM block 必须是 `CERTIFICATE`，解析出的 X.509 证书必须 `IsCA == true` 且包含 `KeyUsageCertSign`。普通错误和诊断不包含引用名、证书正文、目标地址或凭据。

`custom-ca` 缺少引用或材料、引用到其它证书类型、出现私钥/其它 PEM block、证书不是 CA、缺少签发用途或无法追加到新的系统证书池时均 fail-closed。系统信任或 legacy 模式不得使用 CA 材料；目标类型的显式 policy 与 CA 引用冲突也必须在拨号前拒绝。`legacy_unmigrated` 为保持旧行为忽略历史无效引用，不将其误认成 custom CA。

### 4. 最窄共享 resolver 返回每次独立的解析结果

共享包不导入 `object`、`email` 或 `idp`，只接收规范 policy、可选 CA PEM 与调用方根据升级前行为给出的 legacy equivalent mode，返回：

- 独立 `*tls.Config`；
- 值类型诊断 `{mode, source, customCA}`；
- 稳定错误分类，不包装可能含敏感值的底层错误文本。

legacy equivalent mode 只允许 `system` 或 `legacy-insecure`，且只在持久化 policy 为空时生效；显式 policy 不受该参数影响。每次调用创建新的 `tls.Config` 和证书池。调用方修改先前结果不得影响后续解析、其它业务域或全局 transport。

### 5. 三业务域只适配 policy，不共享连接生命周期

- **ADFS**：`SetHttpClient` 只保存注入 client，不修改 client/Transport。对象/controller 上游为每个 Provider 克隆基础 client/Transport，并从基础 `TLSClientConfig` 克隆非信任设置；policy 只覆盖 `RootCAs` 与 `InsecureSkipVerify`，其中 Root CA pool 再独立复制，随后把 policy-aware client 注入 ADFS。这样保留代理、timeout、mTLS client certificate、TLS 版本、ALPN、ServerName 与验证回调。
- **Active Directory**：对象层解析 Syncer policy/CA，每次 LDAP 操作创建和关闭连接；非 LDAPS 路径保持既有明文连接选择，但仍校验显式 policy 与连接模式不冲突。
- **SMTP**：对象层解析 Provider policy/CA并把解析结果传入 email 包；存量空值仅对历史 `SUBMAIL` 保持 insecure，其它 SMTP 保持原有系统信任；`gomail.Dialer` 生命周期、`SslMode` 和 SOCKS5 行为保持不变。

共享 resolver 不修改 `http.DefaultTransport`、proxy singleton、全局证书池或其它 Provider。

### 6. schema 只新增列，不迁移行

Provider 与 Syncer 模型各新增 `xorm:"varchar(32)" json:"tlsPolicy"`。现有 `Ormer.createTable` 的 `Sync2` 为数据库增加 nullable/空值列；不注册 AICodex-owned data migration，也不执行 UPDATE。SQLite fixture 必须验证列与 Add/Update 语义；可用的隔离 PostgreSQL 使用独立 schema 验证 Sync2、插入与读取并清理。MySQL/MSSQL 无隔离环境时记录剩余风险。

空值行数量可作为未来脱敏迁移队列指标，但本 change 不新增运行时扫描、日志目标或自动迁移任务。

### 7. 后端先闭环，UI 在锁释放后串行接入，但只交付完整 RC

Web3 closeout 后先完成 resolver、Provider/Syncer schema 与 Add/Update、ADFS per-provider client、AD/SMTP 适配、controller API 和测试。Testing Library change RELEASED 后，web-admin Provider/Syncer UI 与直接测试写集已开放；package/lock仍保持只读，不得恢复Web3入口或旧RTL兼容过滤，也不得建立重复字段或临时旁路。

后端实现可形成工作分支进度，但不能单独标记最终 RC、archive 或合入 base。当前补齐显式 policy 输入和 legacy 状态后，必须完成组合验证与浏览器fixture smoke，才能回传 `RC_READY`。

### 8. UI 复用既有 payload，区分新建默认与存量待迁移

Provider/Syncer backend 已深复制完整对象并通过既有 Add/Update API 提交 JSON，因此 UI 不新增 endpoint、API envelope 或重复状态字段。TypeScript 模型只补充 `tlsPolicy?: "" | "system" | "custom-ca" | "legacy-insecure"`，Syncer 模型同时显式收紧既有 `cert/sslMode` 字段。

- 新建 Provider/Syncer 草稿显式初始化 `tlsPolicy="system"`，与服务端 Add fallback 一致，避免保存成功但未重新拉取时误显示待迁移。
- 编辑存量空值时保持空字符串，显示中文/英文“待迁移”警告和不可重新选择的当前占位项；无关保存继续提交空值。UI 不得使用 `value || "system"` 静默晋级。
- 只有 ADFS、dialer-backed Email Provider 与 Active Directory Syncer 显示 TLS policy；Azure ACS、Custom HTTP Email、SendGrid、Resend 等 HTTP 邮件 Provider 及其它类型不显示该控件。
- `custom-ca` 才显示 CA 引用 Select，并只列出 `Type == "SSL"` 的 Cert 名称。组件不读取、复制或渲染证书正文/私钥；切换到 `system` 或 `legacy-insecure` 时清空目标记录的 Cert 引用，后端仍是最终校验者。
- 显式 `legacy-insecure` 使用 AntD warning 文案说明证书校验关闭；存量空值只显示“待迁移/保持升级前行为”，不得伪装成显式 legacy 选择。状态必须有文字，不只靠颜色。

Provider OAuth/Email 与 Syncer connection 表单复用一个窄 TSX policy fields 组件和稳定 union；新增可见文案同步维护 zh/en locale。聚焦测试覆盖显示范围、新建默认、存量 preserve、显式晋级、custom CA 联动、错误恢复与提交 payload；不修改 package/lock、tsconfig 或构建基础设施。

页面在保存前使用同一纯TS validator拒绝未知policy、`custom-ca`缺少或引用非SSL Cert、非custom policy残留CA引用；错误只引用policy/CA对象类别，不回显未知原值、证书材料或目标。Provider沿用现有`submitting`门禁，Syncer补同等loading/disabled与单请求语义。公共字段组件只接收投影后的 `{name}` SSL Cert选项，不接收Certificate/PrivateKey字段。

## Risks / Trade-offs

- [部分存量连接继续 insecure] → 仅 ADFS、LDAPS、`SUBMAIL` 保持升级前 insecure；其它 SMTP 不被放宽。所有空值都明确 source=`legacy_unmigrated`，以后逐连接显式保存完成迁移。
- [schema 由 Sync2 管理且数据库实现存在差异] → 验证 SQLite 与可用隔离 PostgreSQL；MySQL/MSSQL 无环境时明确记录风险。
- [Cert 是跨业务通用模型] → 仅目标类型 + `custom-ca` 解释为 CA，强制 `Type == "SSL"`，只读 `Certificate`。
- [前后端分阶段可能产生契约漂移] → UI 已在最新RTL基线串行接入，使用同一纯TS validator和后端聚焦测试闭环；不提交部分RC。
- [显式 legacy 仍降低安全性] → 只允许按连接 opt-in，诊断脱敏，且不提供全局 insecure 开关。

## Migration Plan

1. 发布模型列与服务端 Add/Update 规范化；不批量改写存量行。
2. 存量空值继续旧行为并显示 `legacy_unmigrated`；新建记录即使来自旧客户端也持久化 `system`。
3. 操作者逐连接选择 `system`、`custom-ca` 或 `legacy-insecure` 并保存，退出 unmigrated 状态。
4. 使用脱敏空值计数观察剩余队列，不输出目标、CA、证书或凭据。
5. 回滚应用版本时保留新增列和值；旧版本忽略该列。回滚单连接时显式选择 policy，不把已迁移记录自动清空。
