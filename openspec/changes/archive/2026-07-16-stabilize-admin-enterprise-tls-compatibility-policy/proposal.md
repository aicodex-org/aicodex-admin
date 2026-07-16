## Why

ADFS、Active Directory 同步和 SMTP 仍硬编码跳过 TLS 证书校验，既扩大中间人攻击风险，也无法让运维方按连接选择系统信任、自定义 CA 或受控的 legacy 兼容模式。为同时保证旧部署不中断和新配置默认严格，需要用持久化 `tlsPolicy` 的 presence 明确区分尚未迁移的存量连接与新建连接。

## What Changes

- 定义三业务域共用的 TLS policy 语义：系统信任、自定义 CA、显式 legacy insecure opt-in，以及无效配置的 fail-closed 行为。
- 定义 copy-safe、脱敏的解析与诊断契约；诊断不得包含证书内容、凭据、私有连接目标或原始配置。
- 为 Provider/Syncer 增加持久化 `tlsPolicy`：新建空值规范化为 `system`，存量空值解释为 `legacy-unmigrated` 并保持各连接升级前的严格/兼容行为，更新空值保持已保存状态，显式 policy 完成逐连接迁移。
- `custom-ca` 复用目标记录现有 `Cert` 引用，只读取 `Type == "SSL"` 的 `Certificate` 公钥材料，绝不读取或传播 `PrivateKey`。
- 保持 ADFS 已有注入 HTTP client/Transport 契约，保持 Active Directory 和 SMTP 各自的连接生命周期。
- 建立存量无配置、新配置无显式 policy、自定义 CA、legacy opt-in、无效配置和注入 Transport 的迁移等价表。
- 分阶段实施：后端 resolver、Provider/Syncer、ADFS、Active Directory、SMTP 与 API 已先行闭环；并行锁释放后串行接入前端 UI，最终 RC 不保留未闭环的部分实现。

## Capabilities

### New Capabilities

- `admin-enterprise-tls-compatibility`: 规定 ADFS、Active Directory 同步和 SMTP 的显式 TLS policy、兼容迁移、诊断脱敏与业务 client 边界。

### Modified Capabilities

- 无。

## Impact

- 目标实现边界：`admin/idp/adfs.go`、`admin/object/syncer_activedirectory.go`、`admin/email/smtp.go` 及最窄共享 policy resolver。
- 完整实施打通 ADFS per-provider client、SMTP provider 构造、Active Directory 与 web-admin Provider/Syncer 配置输入的 policy/presence 传递链；前端写集已在最新基线释放，仍不修改 package/lock 或非目标 Provider。
- 新字段通过现有 Provider/Syncer `Sync2` schema 路径创建；不批量更新存量行，空值本身保留为可审计迁移队列。
- 不改变 OAuth callback、数据库以外的 runtime config、CI、Web3、其它 Provider 行为或 `test` 分支。
- 不访问真实企业服务，不自动修改真实配置或数据库；本地测试只能证明代码级 TLS 契约，不能表述为真实 ADFS/LDAP/SMTP E2E。
