# 验证记录

## 验证范围与证据层级

本记录分别保留 Admin 本地源码门禁与已授权 60 测试环境运行态证据。60 证据只证明本次 RC 在受控测试环境中的鉴权、用量读取、fail-closed 与脱敏边界，不得解释为生产可用结论；运行态请求未修改 saved config、Profile、secret reference、真实凭据或数据库。

## TDD RED / GREEN

- RED：shared runtime resolution API 尚不存在时，新增 object 测试因缺少类型/函数编译失败。
- RED：legacy 数值等价用例曾返回 `admin_runtime_config_invalid`，暴露默认值/归一化不兼容。
- RED：Gateway shared-resolution 用例曾因 refresh 未携带同一 `Resolution` 编译失败；迁移后又锁定 `invalid_config`、`projection_token_missing` 与 typed blocker 的兼容组合。
- RED：controller 集成首轮暴露 unresolved reference 主错误码顺序和 trust default required scopes 分词错误；全包回归又暴露直接注入 resolver config 的零值 resolution 短路，以及 status 丢失 copy-safe endpoint/token presence 分类。
- RED：归档前 review 暴露 saved trust policy 的数字/布尔/混合非字符串字段可能被宽松忽略，并使非 ready resolution 保留 enabled 语义；保存校验和 bearer 授权入口现均显式 fail closed。
- RED：单次 bearer 请求原先会重复加载 trust config，存在同一请求混用不同策略快照的风险；回归测试锁定 audience、application、issuer 与 scope 只消费一次 resolution snapshot。
- RED：usage resolver 不可用时原先会为判断 saved policy 再加载一次配置，可能让同一请求把 saved-disabled snapshot 稀释成 legacy fallback；回归测试锁定 resolver 和 fail-closed 判断复用同一次 resolution snapshot。
- GREEN：新增 typed resolver/material provider、copy-safe presence metadata 和稳定 source/blocker；运行路径统一消费 typed resolution，status/diagnostics 保留既有 preflight/stable alias 语义。

## Go 测试

- `go1.25.8 test -vet=off -p 1 ./object -run 'RuntimeConfig|ServiceCredential|GatewayProjection' -count=1`：通过，覆盖 usage resolver、trust、Gateway、Doctor、status copy-safe 与 stable alias 回归。
- `go1.25.8 test -vet=off -p 1 ./controllers -count=1`：通过，包含 `current-user`/scope mapping、trust legacy/saved enabled/saved disabled/store unavailable、handoff status/diagnostics 与 resolver client 等价回归。
- rebase 到最新 `origin/hfl-test-base` 后再次运行上述 controllers 全包与 object 聚焦命令：均通过，证明最终 RC 源码状态未受并行 base 提交影响。
- 60 验收文档收口前使用重启后当前工具链 `go version go1.26.5 windows/amd64` fresh 重跑 controllers 全包与 object 聚焦测试：均通过；覆盖率分别为 20.7% 与 8.8%。
- `go1.25.8 test -vet=off -p 1 ./object -count=1`：已运行但未形成全包通过证据；无关的 desktop discovery 用例受本机非默认 issuer 环境值影响，随后 DB dump fixture 因本地数据库不可用而 panic。本 change 聚焦 object suite 已独立通过；未修改 desktop discovery、DB fixture、schema 或 migration。

## 覆盖率

- `go1.25.8 test -vet=off -p 1 ./object -run 'RuntimeConfig|ServiceCredential|GatewayProjection' -coverprofile=<temp-object-cover> -count=1`：通过；object 大包整体覆盖率为 8.8%，不作为本 change 门槛。
- `go1.25.8 test -vet=off -p 1 ./controllers -coverprofile=<temp-controller-cover> -count=1`：通过；controllers 大包整体覆盖率为 20.7%，不作为本 change 门槛。
- 使用 `git diff --unified=0` 的 touched line 与两个 coverprofile statement block 相交核算本 change 实施代码：覆盖 `532/585` statements，changed-statement coverage 为 **90.9%**，达到 85% 门槛。统计包含全部受影响 production files，未排除低覆盖实施文件。
- 60 验收文档收口前重新生成两个 coverprofile 并复算：13 个 changed production files 均匹配 coverage block，结果仍为 `532/585`（**90.9%**）。

## 静态与规格门禁

- `go1.25.8 vet -p 1 ./object ./controllers`：rebase 前后均通过，无诊断输出。
- 当前 `go1.26.5` 工具链再次执行 `go vet -p 1 ./object ./controllers`：通过，无诊断输出。
- `openspec validate consolidate-insight-runtime-config-resolution --strict`：通过。
- `openspec validate --changes --strict`：通过，1 个 active change。
- `openspec validate --specs --strict`：通过，39 个主规格。
- `git diff --check`：通过。
- 源码检查确认三组 consumer 不再直接读取对应 `conf.GetConfig*` 形成第二套最终决策；Gateway publish/readiness/status/refresh/observability 通过同一 typed resolution。

## 脱敏与契约等价检查

- `ServiceCredentialGovernanceConfig` 继续只保存 owner、source class、reference alias/status、caller、bounded policy、remediation 与 blocker metadata。
- material、typed presence booleans 和 trust allowlist 均标记为不可 JSON 序列化；copy-safe JSON 测试断言不包含 endpoint、token、secret 或完整私有 URL。
- resolver 与 Gateway audit 新增内容仅为 adopted source 和稳定 config error code；未增加 endpoint、token、Authorization、raw payload 或 raw response。
- 接入包 schema、secure handoff、Insight/Admin Provider DTO、Profile 启用契约、Go fixture/schema migration 和既有 stable reason alias 未修改。
- Gateway projection blocked/partial 只影响 producer 路径，不参与 Profile、总览或人员用量授权判断。

## 60 测试环境部署与运行态证据

- 授权与工具：按授权读取私有测试环境/运维说明，未把 token、Cookie、密码、DSN、完整私有 URL 或真实账号写入本记录。`browser-act` 本机入口不可用且未擅自安装，改用 Playwright CLI 复用独立登录会话；真实页面标题为“用量概览 - AICodex Insight”。
- 部署与回退：部署前 Admin 代码回退点为 `0b5368a89`，旧镜像摘要前缀为 `be846f9e`；部署 RC `a377f7827` 后镜像摘要前缀为 `a00136ae`，容器重建、HTTP health 与 healthy 状态均通过。未触发回退；后续仅补充本验证文档，不改变已部署生产代码。
- Admin provider trust：运行态 handoff status 为 `legacy_env_config`，audience/issuer/required-scope 计数分别为 `1/1/2`，`current-user` 与 `current-user/scope` 的真实 Insight 调用均在 Admin 脱敏访问日志中返回 HTTP 200；这证明当前 60 token 继续通过同一 audience、issuer 和 required-scope 校验。默认 required scopes、issuer mode 与 audience fallback 的无 saved-config 等价由聚焦 Go 回归覆盖。
- Usage identity：60 saved resolver 状态为 `saved_manual` + unresolved reference，stable blocker 为 `admin_service_credential_reference_missing`。已有本地 confirmed mapping 的真实 Insight 用户仍返回 `mappingStatus=OK`，`current-user/scope` 为 `ALL_COMPANY`、4 个可查询 API users，说明本地映射优先且未被 blocked resolver 误伤。另一个只读 Admin 会话缺本地映射时，`current-user` 返回 HTTP 503、`PROVIDER_UNAVAILABLE/MISSING`，未回落 legacy 或扩大 identity；其管理员 scope 仍按既有规则返回 HTTP 200、`ALL_COMPANY`。
- 五类用量请求：同一真实登录态下，`summary`、`timeseries`、`by-user`、`reports/organization-tree`、`by-department` 均返回 HTTP 200 / 业务码 0；当前窗口趋势点 0、人员 0，组织树根节点 2 且 `mappingStatus=OK`，部门用量 3 行。只记录计数，未保存完整组织树或 raw response。
- Gateway projection 隔离：handoff status/observability 均采用 `saved_manual`，group disabled 与 legacy disabled 稳定阻断 publisher；readiness 返回 `fix_publisher_config`、`safeToRetry=false`，ingestion status 保持既有 `provider_unavailable` / `invalid_config` alias。refresh 读取同一 resolution，保持 disabled、`interval=900s`、`initialDelay=60s`、`batchSize=50`。与此同时 Connection Profile 仍显示已启用，概览、人员和上述五类用量请求未被 projection blocked/partial 误伤；未执行 manual publish 或 refresh write。
- Status/Doctor 脱敏：只读 status 与把现有 saved copy-safe metadata 原样送入 diagnostics 的预检均成功。Doctor 分别返回 trust `ready`、resolver `blocked`、projection `disabled`、keep-in-env `keep_in_env` 及稳定 alias/source/blocker；JSON 自动扫描未发现 URL 或 `token`、`Authorization`、`Cookie`、`password`、`clientSecret`、`privateKey`、`endpoint`、`baseUrl`、`rawPayload` 字段。Gateway observability/readiness/ingestion 响应同样未发现这些字段。

## 剩余风险

- 默认 material provider 只支持 legacy/saved keep-in-env；60 当前 saved manual resolver reference 未解析，因此本轮只证明“本地 confirmed 优先”和“缺映射时 unresolved fail-closed”，没有在不改真实配置/凭据的前提下制造 resolver positive fallback。
- 60 当前没有可运行的 Gateway projection publisher；本轮验证了相同 typed blocker 在 status/readiness/ingestion/refresh 的传播和对 Profile/用量链路的隔离，没有执行真实 publish。
- `./object` 全包仍依赖本机 desktop discovery 环境与数据库 fixture；这些非本 change 写集问题不应通过修改 fixture/schema 绕过。
