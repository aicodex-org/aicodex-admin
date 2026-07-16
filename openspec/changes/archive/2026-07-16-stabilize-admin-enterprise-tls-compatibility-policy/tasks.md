## 1. 迁移契约与实施门禁

- [x] 1.1 在最新基线确认 ADFS、Active Directory 与 SMTP 三处硬编码 TLS 跳过校验，并核对 IDP client、Provider/Syncer schema 和 Cert 语义。
- [x] 1.2 确认单字段 presence 可表达迁移世代：existing empty=`legacy_unmigrated`、Add empty=`system`、Update empty=preserve、explicit=promote。
- [x] 1.3 确认 `custom-ca` 只复用 `Type == "SSL"` 的 Cert `Certificate` 公钥材料，不读取 `PrivateKey`，无需新增证书模型。
- [x] 1.4 修订完整中文 OpenSpec，运行 target/changes/specs strict 与 `git diff --check`，完成 pre-implementation review READY。

## 2. Typed TLS policy resolver（TDD）

- [x] 2.1 先写表驱动失败测试覆盖 system、custom CA、explicit legacy、按业务历史行为解析的 legacy unmigrated、unknown/blank、CA 缺失/无效、冲突和错误脱敏。
- [x] 2.2 实现最窄 resolver 与 Add/Update policy 规范化；resolver 接受经校验的 legacy equivalent mode，并返回独立 `tls.Config` 和值类型 `{mode, source, customCA}` 诊断。
- [x] 2.3 验证修改先前 config/diagnostic 不影响后续解析、系统根、全局 transport 或其它业务域。

## 3. Provider/Syncer 持久化与 schema

- [x] 3.1 为 Provider/Syncer 增加 `tlsPolicy` 持久化字段；Add 空值写 `system`，Update 空值保持数据库原值，未知值在写入前失败。
- [x] 3.2 以 SQLite fixture 真实验证 `tls_policy` 列、existing-empty、new-add-empty、unrelated-update-preserve、explicit-promote 和失败不改值。
- [x] 3.3 增加隔离 PostgreSQL integration 路径并在环境可用时执行；当前未提供授权 DSN，已完成 integration tag 编译并记录真实执行阻断与脱敏清理契约。
- [x] 3.4 确认 schema 同步不批量 UPDATE 存量行，不新增 `tlsPolicyVersion` 或自动迁移任务；记录 MySQL/MSSQL 环境缺口。

## 4. Active Directory 与 SMTP 适配

- [x] 4.1 先补 Active Directory policy/CA/拨号前 fail-closed 测试，再接入 resolver，保持每次操作创建/关闭 LDAP connection。
- [x] 4.2 先补 SMTP system/custom CA/legacy/source/冲突测试，证明空值仅对 `SUBMAIL` 保持 insecure、其它 SMTP 保持 system，再接入 resolver并保持 `gomail.Dialer`、SSL mode 与 SOCKS5 行为。
- [x] 4.3 在 object 层按 owner/name 解析 SSL Cert，只复制 `Certificate`；缺失、错误类型、空材料和无效 PEM 返回脱敏稳定错误。

## 5. Provider API、ADFS 与配置入口

- [x] 5.1 为 Provider Add/Update contract 补测试，验证旧客户端新建默认 system、无关更新保持、显式迁移与未知值 fail-closed。
- [x] 5.2 为 ADFS 注入 identity 先写失败测试，移除 Provider 内 Transport 覆盖，并在上游构造 per-provider policy-aware client。
- [x] 5.3 验证 ADFS proxy/default transport、30 秒 fallback、OAuth endpoint/callback 和错误脱敏契约保持不变；三种 policy 只覆盖 trust 字段并保留基础 mTLS/TLS版本/ALPN/验证回调。
- [x] 5.4 补充严格 TS union 与复用的 AntD policy fields；仅 ADFS、dialer-backed Email、Active Directory 显示，新增草稿默认 system，存量空值显示待迁移且保持空值。
- [x] 5.5 实现 custom CA 的 SSL Cert 名称选择与 policy/Cert 联动；不读取证书正文或私钥，不修改 package/lock、tsconfig、API envelope 或其它 Provider 入口。
- [x] 5.6 增加纯TS validator及 Provider/Syncer RTL16 聚焦测试与 zh/en i18n，覆盖显示范围、new default、existing preserve、explicit promote、custom CA、unknown/conflict save阻断、legacy warning、重复提交与后端错误；运行 incremental TS gate、typecheck、相关 Jest 与 build。

## 6. 验证与 RC 交付

- [x] 6.1 运行 resolver、idp、email、object、controllers 聚焦及相关 package 测试；changed implementation coverage 为 88.3%。
- [x] 6.2 运行固定 `gofumpt v0.9.2`、Go 1.25.8 全仓 `go vet` 与 `golangci-lint v2.11.4`；固定 linter 在隔离副本先同步 vendor 后为 0 issues。
- [x] 6.3 运行 OpenSpec target/changes/specs strict、`git diff --check`、中文/脱敏/占位符/EOF 及临时产物审计，更新 `verification.md`。
- [x] 6.4 完成 pre-archive review；收敛为 latest base + 1 logical commit并推工作分支，release-candidate-only 不 archive、不合入 base/test、不释放 lease。
