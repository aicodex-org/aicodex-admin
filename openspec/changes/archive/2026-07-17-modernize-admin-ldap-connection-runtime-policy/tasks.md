## 1. 基线与设计门禁

- [x] 1.1 在最新 `origin/hfl-test-base` 盘点 Generic LDAP、Active Directory、调用方、现有 enterprise TLS 主规格与测试。
- [x] 1.2 核对 `go-ldap/v3@3.4.6` 的 `DialURL`、`DialWithDialer`、`DialWithTLSConfig`、`SetTimeout`、`Unbind` 与 `Close` 语义。
- [x] 1.3 创建完整中文 proposal/design/spec/tasks，运行 target/changes/specs strict 与 `git diff --check`。
- [x] 1.4 完成 pre-implementation review，确认产品、配置、TLS 兼容、timeout、错误脱敏和写集边界为 READY。

## 2. Typed runtime policy（TDD）

- [x] 2.1 先写 RED resolver 测试，覆盖 Generic LDAP/LDAPS、`allowSelfSignedCert` 兼容、AD 389/636、enterprise TLS mode/source、server name、60 秒 timeout 与 copy-safe diagnostic。
- [x] 2.2 实现 Generic LDAP 与 Active Directory 到共用 `ldapConnectionRuntimePolicy` 的解析；每次克隆 TLS config，不修改全局 `go-ldap.DefaultTimeout`。
- [x] 2.3 增加稳定 stage/code error 测试，证明错误和诊断不包含 host、完整 URL、username、password、证书或 raw payload。

## 3. 连接、timeout 与生命周期（TDD）

- [x] 3.1 先写 RED 测试覆盖 dial/bind/probe 失败后的 socket close、短 timeout 和 Active Directory bind 兼容语义。
- [x] 3.2 使用 `DialURL`、连接级 `net.Dialer` 与 `Conn.SetTimeout` 实现共用 dial/bind；初始阶段结束后恢复请求 timeout，避免改变后续目录查询策略。
- [x] 3.3 实现 managed connection：失败 abort、正常 Unbind + fallback Close、`Close() error` 幂等且不 panic。
- [x] 3.4 接入 Generic `GetLdapConn()` 与 Active Directory Syncer，保持既有调用、用户/组查询、同步和 TestConnection 行为。

## 4. 回归测试与质量门禁

- [x] 4.1 运行 focused RED/GREEN 与 `admin/object` 相关 package tests，覆盖 LDAP/LDAPS、Generic/AD、bind/probe/timeout/close 和旧配置兼容。
- [x] 4.2 运行 race 与受影响实现 changed coverage，达到 85% 或记录阻断；不得用低价值断言制造覆盖率。
- [x] 4.3 运行 `go vet`、仓库固定 gofumpt/golangci 适用门禁，分类任何既有环境阻断。
- [x] 4.4 运行 OpenSpec target/changes/specs strict、`git diff --check`、中文/脱敏/TBD/EOF 与临时产物检查，更新 `verification.md`。
- [x] 4.5 完成 pre-archive review READY；真实 LDAP/AD 未验证明确列为 remaining risk。

## 5. RC-only 交付

- [x] 5.1 fetch/prune 并审计最新 base；若前进则 rebase，重跑受影响门禁。
- [x] 5.2 收敛为 latest base + 1 logical commit，普通 push 工作分支；不 archive、不 push base/test、不删除分支、不释放 lease。
- [x] 5.3 通过 `send_message_to_thread` 向 controller/return thread 回传 RC_READY envelope、验证、覆盖率、兼容行为和风险。
