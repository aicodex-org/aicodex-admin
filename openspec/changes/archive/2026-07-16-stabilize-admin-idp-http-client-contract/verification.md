# 验证记录

## 结论与范围

本 change 统一了 Gitee、LinkedIn、Casdoor、Lark 与 WeChat Mini Program 的出站 HTTP client 契约。验证证明注入 client 及其 `Transport` 不被覆盖；未注入时使用30秒整体超时的独立 fallback；响应状态、body 生命周期、请求创建错误和错误脱敏均有本地回归保护。测试使用 fake `RoundTripper` 或本地测试边界，不访问真实第三方账号，不表述为第三方 E2E。

系统审计覆盖 `admin/idp` 全部30个 `SetHttpClient` 实现。除本 change 纳入的五个 Provider 外，其他遗留 body、状态、query token 与 TLS 兼容债务均保持后续范围；`metamask.go`、`web3onboard.go`、`provider.go`、controller 注入逻辑、CI workflow、数据库/schema、runtime config 与前端依赖没有修改。

## TDD RED / GREEN

- 共享 helper RED：`resolveIdPHTTPClient` / `executeIdPRequest` 尚不存在，测试因缺少符号失败；最小实现后，注入指针/Transport、30秒 fallback、成功与错误 body close、non-2xx 和脱敏错误均 GREEN。
- Gitee、LinkedIn、Casdoor RED：命中全局 client/包级 `PostForm` 绕过、credential 进入 query、profile 请求绕过注入、忽略请求创建错误与状态等现状；改为 form/header 与共享 helper 后 GREEN。
- Lark、WeChat Mini Program RED：命中 `http.DefaultClient` / 无超时空 client、3xx 被当成功和 Provider body 错误回显；改造后状态、fallback、注入与错误脱敏均 GREEN。
- 首轮覆盖率仅 `88/107（82.2%）`；按未覆盖语句补充 Casdoor 请求/Provider 错误、Gitee 资源请求、LinkedIn profile request、Lark HTTP 200 Provider 错误/空 token 与 Mini Program 请求创建错误等高价值断言后，聚焦测试继续通过。

## Go 测试

- 工具链：`GOTOOLCHAIN=go1.25.8`，与仓库 `go.mod` / CI 对齐。
- `go test ./idp -run 'Test(IdPHTTPClient|ExecuteIdPRequest)' -count=1`：通过。
- `go test ./idp -run 'Test(Gitee|LinkedIn|Casdoor)IdProviderHTTPContract' -count=1`：通过。
- `go test ./idp -run 'Test(Lark|WeChatMiniProgram).*HTTPContract' -count=1`：通过。
- `go test ./idp -run 'TestLarkIdProvider' -count=1`：通过。
- `go test ./idp -count=1`：通过。
- `go test ./... -count=1`：已真实运行但退出非0；受影响 `idp` 及 controllers/object/storage 等多数包通过，既有 `sync` / `sync_v2` 测试依赖不可用数据库，`util` 依赖当前环境版本值，`xlsx` 缺本地 fixture。上述失败包不在本 change 写集，未通过修改 fixture、schema 或环境断言制造全仓绿灯。
- 全量测试产生的版本文件和 locale 生成副作用均依据测试前 clean 状态精确回收，未保留写集外差异。

## Changed implementation coverage

- 命令：`go test ./idp -count=1 -covermode=atomic -coverprofile=<temp-profile>`。
- 统计方法：将 `git diff --unified=0` 的新增/修改 production 行与 coverprofile statement block 相交；统计对象完整包含 `http_client.go`、`gitee.go`、`linkedin.go`、`casdoor.go`、`lark.go`、`wechat_miniprogram.go`，未排除低覆盖文件。
- 最终结果：`101/110` statements，**91.8%**，达到85%门槛；`idp` 大包整体为19.6%，仅反映大量未触碰 Provider 的历史基数，不作为本 change 门槛。分母变化来自归档前审查新增的Lark code脱敏实现。
- 两个本任务临时 coverage profile 均已删除；未清理或改动其它既有本地覆盖率文件。

## 格式、静态分析与 lint

- `gofumpt v0.9.2 -l .`：从 `admin` 执行，无输出；只格式化9个本 change Go文件。
- `GOTOOLCHAIN=go1.25.8 go vet ./...`：退出码0，无诊断。
- golangci-lint：固定 `v2.11.4`，由Go `1.25.8`构建。按 workflow 先执行 `go mod vendor`，再执行 `golangci-lint run --config ../.golangci.yml ./...`，结果 `0 issues.`；临时、未跟踪的 `admin/vendor` 已删除。
- `golangci-lint config verify --config ../.golangci.yml`：官方 JSON schema 连接超时，未形成通过证据；该网络 blocker 不影响上述真实源码 lint 扫描，且本 change 未修改 `.golangci.yml` 或新增排除。

## OpenSpec 与差异卫生

- `openspec validate stabilize-admin-idp-http-client-contract --strict`：通过。
- `openspec validate --changes --strict`：1个 active change 通过，0个失败。
- `openspec validate --specs --strict`：46个主规格通过，0个失败。
- `git diff --check`：通过。
- 写集审计：无 `.github`、controller、Web3 Provider、runtime config、数据库/schema、前端文件差异；中文、脱敏与 EOF 审计在 pre-archive review 中继续复核。
- 验证记录未包含真实 token、secret、Cookie、账号、私有地址、连接串或第三方响应 body。

## 证据层级与剩余风险

- 当前证据覆盖本地单测、changed-statement coverage、格式与静态分析；没有真实第三方 Provider credential 或网络 E2E，因此不声称第三方端点已实际联通。
- ADFS、Active Directory、SMTP 的 `InsecureSkipVerify` 兼容设计，以及其它 legacy Provider 的 body close、non-2xx、query token 和日志回显债务仍需独立 change。
- 全仓 Go tests 仍受数据库、环境值和 fixture 基线阻断；本 change 的 `idp` 包与直接契约测试已独立通过。
- 外部 schema 下载超时只影响 `golangci-lint config verify` 的附加校验；固定版本全量 lint 已按 CI vendor 前置完成。

## Pre-archive review 修复

- 审查发现Lark token响应的 `code` 是 `interface{}`，原实现会原样输出任意字符串，可能把body中的credential带入错误。先增加恶意字符串code回归并确认RED，再将错误诊断限制为数值code或 `unknown`；聚焦与 `idp` 全包测试转为GREEN。
- 审查修正了Casdoor token字段集合和Provider数量的两处规格歧义；未改变生产接口或第三方端点。
- 最终状态：**READY**。本轮发现的Lark错误字段泄漏已修复；复查范围内Blocking 0、Fixable 0。
- 注释 Review：共享client/响应边界已有中文注释；补充Lark数值code白名单原因和MiniProgram官方query例外/脱敏边界说明。Provider方法未新增公共接口，其余修改为清晰的既有接口实现，无阻断级注释缺口。
- OpenSpec 文档语言：proposal、design、tasks、verification 与delta spec正文以简体中文为主；`Requirement`、`Scenario`、`MUST`、Provider/API/字段名和命令保留为规范或技术关键字。未发现 `TBD`、模板残留或语义不一致。
- 验证文档与脱敏：说明性正文为中文，未发现真实环境地址、凭据、第三方原始body或可反推账号的信息；所有测试URL使用保留测试域名。
- 运行态口径：证据限定为本地单测、覆盖率和静态门禁，没有把fake transport表述为真实Provider E2E。
- 主规格同步：当前为新增 capability，archive 将同步 `admin-idp-http-client-contract` 主规格；archive后必须重新检查主规格与归档副本的语言和 strict 状态。
- 交付单元：pre-archive时 `HEAD` 是最新 `origin/hfl-test-base` 的祖先且远端领先2个纯文档提交；当前change仍为工作区差异、0个change commit。按已授权closeout在archive后形成单commit、rebase最新base并重跑final gate。

## Archive 后验证

- 归档路径：`openspec/changes/archive/2026-07-16-stabilize-admin-idp-http-client-contract`；active change列表为空。
- 主规格：新增 `openspec/specs/admin-idp-http-client-contract/spec.md`，中文Purpose已替换CLI占位符；主规格与归档delta均包含6条一致Requirement。
- `openspec validate --changes --strict`：无active change，未发现失败项。
- `openspec validate --specs --strict`：47个主规格通过，0个失败。
- 主规格与归档副本的中文、`TBD`、模板残留、脱敏、EOF和 `git diff --check` 审计通过。
- 最终commit/rebase/push前门禁仍按self-closeout继续执行，不复用归档前的旧base状态。

## Self-closeout final gate

- 已fetch/prune并rebase到 `origin/hfl-test-base@0964f859`；远端新增内容仅为技术债文档，rebase前后本change的 `admin/idp` 与OpenSpec内容对比无差异。
- rebase后 `gofumpt v0.9.2 -l admin` 无输出，Go `1.25.8` 的 `go test ./idp -count=1` 与 `go vet ./...` 通过。
- rebase后 `openspec validate --changes --strict` 无active失败项，`openspec validate --specs --strict` 为47/47通过，`git diff --check origin/hfl-test-base...HEAD` 通过。
- rebase后 `origin/hfl-test-base..HEAD` 正好1个本change逻辑提交。固定lint `0 issues.` 与changed-statement coverage `101/110（91.8%）` 复用rebase前同一源码树证据；未把纯文档base更新当作重新计算实现覆盖率的理由。
- `origin/test` 在push前保持 `5420c8c3`；本change不push或merge test。普通base push、工作分支删除与最终clean/aligned状态在仓库外closeout回传证明。
