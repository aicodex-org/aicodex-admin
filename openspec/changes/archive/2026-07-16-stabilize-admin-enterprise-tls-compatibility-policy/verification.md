# 验证记录

## 当前状态

- 生命周期：`ACTIVE`，release-candidate-only。
- 实施前 review：`READY`。
- 基线：`origin/hfl-test-base@ee105281990040f98978e580ca9e61412d72a50f`。
- 主控已选择单字段 presence 迁移语义并开放后端与目标 web-admin Provider/Syncer UI/直接测试写集；package/lock仍保持只读。
- 后端、最新 RTL16.3.2 + DOM10 前端配置入口及组合验证均已闭环；当前只待完整 pre-archive review、单提交收敛与工作分支 RC push。

## 已确认契约

| 场景 | 持久化/解析结果 |
|---|---|
| existing empty ADFS、LDAPS、`SUBMAIL` | 数据库保持空，effective `legacy-insecure`，source=`legacy_unmigrated` |
| existing empty 其它 SMTP | 数据库保持空，effective `system`，source=`legacy_unmigrated` |
| new Add empty | Insert 前持久化 `system` |
| existing unrelated Update empty | 保持数据库旧值，不静默改变行为 |
| explicit policy | 持久化规范值并以 source=`explicit` 退出 unmigrated |
| unknown/blank/conflict | 写入或拨号前 fail-closed |
| custom CA | 仅复用 SSL Cert 的 `Certificate`；要求 X.509 CA + CertSign，不读取 `PrivateKey` |

单字段可行性依据：请求字段缺失与空值在 Update 中都表示 preserve，因此无需 `tlsPolicyVersion`；Add 独立地把空值规范化为 `system`。现有 SSL Cert 支持只保存公开 `Certificate`，再通过 X.509 CA 约束证明目标材料可作为信任根。

## Pre-implementation Review

逐项审查了 proposal、design、tasks、delta spec、最新 Provider/Web3 retirement 契约、IDP client 主规格、Provider/Syncer schema 路径及 Cert 模型。已修复两项可直接收口的问题：

1. 不再把 `Type == "SSL"` 单独视为 CA 证明；增加 PEM block、`IsCA` 与 `KeyUsageCertSign` 校验。
2. Web3 closeout 后 Provider/IDP 后端锁已经释放，文档更新为完整后端可实施、仅 UI 串行等待。
3. 存量空值不再一律解释为 insecure；按基线证明的连接历史行为分别保持 ADFS/LDAPS/`SUBMAIL` insecure 与其它 SMTP system。

当前没有未决产品、安全、数据或 owner 问题；分阶段写集、失败路径、回滚、数据库隔离与最终 RC 门禁均可验收，结论为 implementation-ready。

## 实施前命令证据

| 命令 | 结果 |
|---|---|
| `openspec validate stabilize-admin-enterprise-tls-compatibility-policy --strict` | 通过，1 项 |
| `openspec validate --changes --strict` | 通过，1 项 |
| `openspec validate --specs --strict` | 通过，48 项 |
| `git diff --check` | 通过，无输出 |
| `git diff --check origin/hfl-test-base...HEAD` | 通过，无输出 |
| 中文/敏感值/模板占位符审计 | 通过；未发现凭据、证书正文、私有目标或模板残留 |

## 基线兼容证据

- Web3 retirement 基线已保留：`admin/idp/metamask.go` 与 `admin/idp/web3onboard.go` 不存在，IDP factory 不再构造这两类 Provider。
- 本 change 不恢复退役类型、入口、依赖或 fallback。
- ADFS 最终必须保持注入 client/Transport identity；policy-aware client 在上游按 Provider 构造。
- 不访问 60、共享数据库或真实企业账号。

## 实施阶段证据

- TDD 证明普通 SMTP 空 policy 仍使用 system trust，只有 `SUBMAIL` 空 policy 保持历史 insecure；Active Directory 的 389/636 空 policy 诊断分别为 system/legacy-insecure。
- `custom-ca` 只通过显式列投影读取 Cert `type` 与 `certificate`，并覆盖带表名前缀的 owner→admin fallback；生产查询不选择 `PrivateKey`。
- ADFS 上游 client 克隆按 system/custom-ca/legacy-insecure 三模式验证：只覆盖并独立复制 `RootCAs` 与 `InsecureSkipVerify`，保留基础 ServerName、mTLS certificate、TLS版本、ALPN与验证回调，不修改基础 transport/config。
- SQLite 已覆盖旧 Provider/Syncer 表经 `Sync2` 增加 `tls_policy` 后存量行保持空值，以及 Add/Update/冲突不写入语义。
- 聚焦 `tlspolicy`、`email`、`idp`、`object`、`controllers` 包测试已在最终组合状态重新通过。
- Provider/Syncer UI 只接收投影后的 SSL Cert 名称；新建目标草稿为 `system`，编辑存量空值保持 `legacy_unmigrated`，unknown、缺失/不可用 CA 与 policy/Cert 冲突均在请求前阻断。
- 浏览器人工审查曾发现 Syncer 桌面 warning 被大型编辑页首列规则压缩到 184px；增加结构回归测试后改为“空标签列 + 自适应内容列”，修复后 1440 与 390 视口均清晰、无页面级溢出。
- PostgreSQL integration 代码可编译，但本地未提供授权隔离 DSN 且无 Docker CLI，尚未真实执行；MySQL/MSSQL 同样无隔离环境。

## 最新验证证据

| 命令/验证边界 | 结果 |
|---|---|
| `GOTOOLCHAIN=go1.25.8 go test -count=1 -tags skipCi ./...`（`admin/`） | 通过；全量 hermetic Go suite 无失败 |
| `GOTOOLCHAIN=go1.25.8 go test -count=1 ./tlspolicy ./idp ./email ./object ./controllers` | 通过；resolver、三业务域、对象持久化与 controller 聚焦测试无失败 |
| `GOTOOLCHAIN=go1.25.8 go test ./controllers -run 'Test(SetProviderHTTPClientBuildsProviderScopedADFSTransport\|CloneHTTPClientWithTLSPolicyPreservesBaseTLSSettingsForAllModes)$' -count=1` | 通过；审查回归覆盖连接级client与system/custom-ca/legacy-insecure三模式的基础TLS设置保真 |
| `go test -covermode=atomic -coverpkg=... -coverprofile=... ./tlspolicy ./email ./idp ./object ./controllers -count=1` | 通过；按 `origin/hfl-test-base` 新增/修改生产语句合并五个测试二进制的重复 block，`188/213 = 88.3%`，达到 85% |
| `go test -tags=integration ./object -run '^$' -count=1` | 通过；只证明 integration 代码可编译，未连接数据库 |
| `GOTOOLCHAIN=go1.25.8 go vet ./...`（`admin/`） | 通过，无输出 |
| `gofumpt v0.9.2 -l .`（`admin/`） | 通过，无待格式化文件 |
| 一次性本地副本：`GOTOOLCHAIN=go1.25.8 go mod vendor` 后 `golangci-lint v2.11.4 run --config ../.golangci.yml ./...` | 通过，`0 issues`；副本已验证位于系统临时根并删除，正式 workspace 未改 vendor/go.mod |
| 正式 workspace 直接运行固定 linter | 真实执行后被既有 `vendor/modules.txt` 与 `go.mod` 不一致阻断；未把该环境问题伪报为 lint 通过，改用与仓库 `vendor` 前置步骤等价的隔离副本得到上项证据 |
| `yarn test:ci --runTestsByPath ... --coverage`（4 个目标 suite） | 通过，`4/4 suites`、`112/112 tests`；四个受影响前端实施文件 statements `594/689 = 86.21%`、lines `592/687 = 86.17%`，达到 85% |
| `yarn typecheck`、`yarn lint` | 通过；TypeScript 无错误，ESLint `exit 0`；仅输出非阻断的 Browserslist 数据更新提示 |
| `node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base` | 通过，无新增业务 JS/JSX 或测试类型回退 |
| `yarn build` | 通过；public scripts 编译与 Vite 8 production build 成功，仅有仓库既有 direct-eval、chunk size 与浏览器 external 提示 |
| Playwright CLI + 本地 Vite preview + 脱敏 `/api/**` fixture | 通过；Provider/Syncer 各验证 Add=`system`、存量空值无关保存仍为空、custom CA 缺引用不发请求、有效名称保存、切换 system 清空 Cert、显式 legacy 保存与 reload 保持；console/pageerror/requestfailed 均 0 |
| 浏览器布局审查 | 通过；1440px Provider/Syncer 与 390px Syncer 的 `documentWidth == viewportWidth`，修复后的 warning 不再逐词换行；DOM 未出现证书或私钥 sentinel |
| OpenSpec target / changes / specs strict | 通过，分别 `1/1`、`1/1`、`49/49` |
| `git diff --check`、中文/敏感值/TBD/EOF、根目录 planning residue 审计 | 通过；无输出、无敏感环境标识、无模板残留、EOF 正常、根目录无 planning 文件 |

## 数据库与运行态边界

- SQLite 真实覆盖：从不含 `tls_policy` 的旧 Provider/Syncer 表插入存量行，再执行 `Sync2`；列新增且存量行保持空值。Add 默认 system、Update preserve/promote、unknown/冲突不写均通过。
- PostgreSQL：integration 路径使用随机独立 schema 并在 cleanup 只记录 marker hash；本地未提供 `AICODEX_TEST_DB_DRIVER/AICODEX_TEST_DB_DSN`，且无 Docker CLI，因此未真实执行。
- MySQL/MSSQL：无授权隔离环境，未执行，保留 schema 兼容风险。
- 未访问真实 ADFS、LDAP、SMTP、60环境或共享数据库；当前证据是源码/fixture/构建层，不表述为第三方 E2E。

## Pre-archive Review

- 结论：`READY`。proposal、design、tasks、delta spec、实现、测试和验证记录描述同一最终契约，本次审查范围内未发现阻断问题。
- 单测覆盖率门槛：后端 changed statements `88.3%`，前端目标实施文件 statements `86.21%`，均达到 85%；测试覆盖存量等价、fail-closed、copy-safe、保存幂等和用户可观察状态，不以低价值 getter/mock 调用堆覆盖率。
- 注释审查：Go resolver、Provider/Syncer字段、ADFS client克隆、SMTP/LDAP边界及前端共享helper均有中文导向性注释；保留的英文为 TLS、CA、Provider、API、字段名和标准代码标识。
- 文档语言与脱敏：change artifacts 以简体中文说明为主；`Requirement`、`Scenario`、MUST/SHALL、命令、字段和标准术语按OpenSpec/工程语境保留英文。未发现TBD、私有URL/IP、账号、token、Cookie、证书/私钥正文或raw config。
- 主规格同步：`admin-enterprise-tls-compatibility` 当前主规格不存在，符合新增capability的active change状态；未来获准archive时应由delta创建主规格。本release-candidate-only交付不得提前同步或archive。
- 交付单元：已基于 `origin/hfl-test-base@ee105281` 完成审查；RC收敛为该base之上1个逻辑commit并仅推工作分支，不推base/test、不释放lease。

## 当前剩余风险

- 存量 ADFS、LDAPS 与 `SUBMAIL` 空值按兼容契约继续 insecure；其它 SMTP 不被放宽。所有空值都必须以 source=`legacy_unmigrated` 明确诊断并逐连接迁移。
- PostgreSQL/MySQL/MSSQL 与真实企业服务未做运行态验证，证据层级限制如上。
- 真实数据库/企业服务门禁若由主控要求升级为部署验收，仍需额外授权隔离环境；当前RC不能把源码/本地fixture证据提升为第三方E2E。
- release-candidate-only：不 archive、不合入或推送 base/test、不删除工作分支、不释放 lease。
