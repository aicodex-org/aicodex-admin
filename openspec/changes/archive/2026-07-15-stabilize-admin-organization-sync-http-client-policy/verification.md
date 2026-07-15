# 验证记录

## 验证范围

本 change 只调整 Admin 钉钉、飞书和企业微信组织通讯录 connector 的默认 HTTP client policy、transport 错误脱敏和 hermetic 回归测试。未修改 endpoint、method、headers、token 获取、pagination、DTO、provider 错误类型、组织同步数据语义、运行时配置、数据库或前端。

## TDD 证据

### RED

- 命令：`go test -count=1 -tags skipCi ./object -run '^TestOrganizationAddressBookClients' -v`
- 结果：按预期失败。三个 provider 的构造器与 nil fallback 均返回 `Timeout == 0`；DingTalk/Feishu transport 错误包含完整本地测试 endpoint。WeCom 既有 `SafeMessage` 已保持安全。
- 测试代码先于生产实现写入；初次编译发现测试错误地比较了不可比较的函数型 transport，修正为可比较的指针型 `RoundTripper` 后重新运行并取得上述行为失败证据。

### GREEN

- 命令：`go test -count=1 -tags skipCi ./object -run '^TestOrganizationAddressBookClients' -v`
- 结果：通过。table-driven adapter 覆盖三个 provider 的 30 秒默认 timeout、独立默认 client、nil fallback、显式注入 identity、context cancellation/deadline、慢 server client timeout、provider 错误 alias 和可见错误脱敏。
- 命令：`go test -count=1 -tags skipCi ./object -run '^Test(DingTalk|Feishu|Wecom)AddressBookClient' -v`
- 结果：通过。既有 token 请求、method/query/header、分页、WeCom fallback、DTO 归一化、HTTP/JSON/provider 错误解析行为保持兼容。

## 覆盖率

- 命令：`go test -count=1 -tags skipCi ./object -run '^Test(OrganizationAddressBookClients|DingTalkAddressBookClient|FeishuAddressBookClient|WecomAddressBookClient)' -coverprofile=<ignored-coverage-profile>`
- 统计对象：本 change 新增 `organization_http_client_policy.go` 全部 statements，以及三个 provider client diff 新增/修改 statements。
- 结果：changed production statements 16/16，覆盖率 100%，达到不低于 85% 的门槛。
- 说明：聚焦测试对整个大型 `object` package 插桩时显示的 2.4% 是整包平均值，不用于掩盖或替代 changed-statements 统计。

## 格式化、全量测试与静态检查

- `golangci-lint fmt --config ../.golangci.yml <affected-go-files>`：通过；使用仓库配置启用的 `gofumpt` formatter，复查 `--diff` 无剩余格式差异。
- `go test -count=1 -tags skipCi ./...`：通过；Admin full hermetic suite 所有 package 退出码为 0。
- `go vet ./...`：通过，退出码为 0。
- `golangci-lint v2.11.4 + ../.golangci.yml + ./...`：通过，输出 `0 issues.`。

### lint 工具链说明

仓库配置要求 `modules-download-mode: vendor`，因此按仓库既有门禁临时执行 `go mod vendor` 生成 ignored `admin/vendor`。全局 `golangci-lint v2.11.4` 由 Go 1.25.8 构建，在分析 vendor 内带 Go 1.26 build constraint 的依赖文件时发生工具自身 panic。为保持 linter 版本和 repo 配置不变，使用 Go 1.26.0 将同一 `golangci-lint v2.11.4` 临时构建到 ignored 测试目录，再执行完整 repo-config lint并通过。临时 vendor、coverage profile 和 linter binary 均已清理，`go.mod`/`go.sum` 无 diff。

## OpenSpec 与工作区卫生

- `openspec validate "stabilize-admin-organization-sync-http-client-policy" --strict`：通过。
- `openspec validate --changes --strict`：通过。
- `openspec validate --specs --strict`：通过。
- `git diff --check`：通过。
- 测试和临时工具清理后 `git status --porcelain=v1 -b`：只包含本 change 的三个 client、对应测试/helper 和 OpenSpec artifacts；无 vendor、coverage、构建、浏览器或测试报告残留。

## RC 与 self-closeout 验证

- 已 fetch 最新远端基线并 rebase 到 `origin/hfl-test-base@10542c65`；远端新增提交只涉及独立 Web Admin Jest change，与本 change 写集无重叠。
- rebase 后 `origin/hfl-test-base..HEAD` 正好 1 个本 change Conventional Commit，且 `git merge-base --is-ancestor origin/hfl-test-base HEAD` 通过。
- rebase 后重新运行 provider/policy 聚焦测试、`go vet ./...`、OpenSpec target/changes/specs strict、`golangci-lint fmt ... --diff` 和 `git diff --check origin/hfl-test-base...HEAD`，均通过。
- RC 阶段仅推送工作分支，未操作 `hfl-test-base`/`test`。主控完成 RC 审计后另行授权 `self-closeout=true`；本 change 已 archive 并同步主规格，最终 base 推送与分支清理由 closeout 外部报告记录。

## 运行态验收口径

- browser/60：N/A。本 change 是后端 connector transport policy，不涉及 Admin UI，也不需要 60 环境登录或浏览器交互。
- 真实 provider E2E：未执行。验证使用 `httptest.Server` 和受控 `RoundTripper`，没有使用真实第三方 token、账号、私有 endpoint 或响应 payload。
- 证据层级：当前结论证明源码、hermetic HTTP contract、context/timeout 行为和静态门禁；不声明真实 DingTalk/Feishu/WeCom provider E2E 或生产可用性验证。

## 兼容性与剩余风险

- 默认未注入路径从无整体 timeout 变为 30 秒；显式注入 client 可继续选择其它 timeout，且指针与配置原样保留。
- context cancellation/deadline 保持更早优先；未增加自动 retry、熔断、TLS bypass 或全仓 HTTP abstraction。
- 未增加响应体大小上限，因为现有 provider 分页证据不足以确定兼容 cutoff。
- transport 错误可见文本不再包含完整请求 URL，诊断粒度相应收敛为 `context canceled`、`context deadline exceeded` 或 `transport error`；provider/operation/错误类型仍保留。
- RC 阶段的 `release-candidate-only` 限制已由主控后续 `self-closeout=true` 授权覆盖；self-closeout 仍不得操作 `test`，真实 provider E2E 边界保持不变。
