# 验证记录

## 结论

当前实现已消除最新 `go vet` 的两个确定性 correctness 错误，并按主控扩展的最小写集机械清理全 admin 扫描确认的 6 个既有 `gofumpt` 基线文件。`gofumpt -l .` 无输出，固定 CI 版本 golangci-lint 全量扫描输出 `0 issues.`，聚焦测试、覆盖率和 OpenSpec 校验通过。归档前 review 状态为 **READY**。

## RED 基线

- 命令：从 `admin` Go module 执行 `go vet ./...`。
- 工具链：本机 Go `1.26.5`。
- 结果：退出码非 0，稳定报告：
  - `storage/casdoor.go:9:21`：`github.com/casdoor/oss/casdoor.Config struct literal uses unkeyed fields`；
  - `service/proxy.go:39:3`：`unreachable code`。
- 根因核对：`github.com/casdoor/oss v1.8.0` 的 `Config` 字段顺序与原七个值的映射已逐项核对；`panic(err)` 已终止控制流，后续 `return` 不可达。

## GREEN 验证

### Go correctness

- 命令：`$env:GOTOOLCHAIN='go1.25.8'; go vet ./...`。
- 结果：退出码 0，无诊断。该工具链与 `admin/go.mod` 的 `toolchain go1.25.8` 及 CI `GO_VERSION` 一致。
- 补充：本机 Go `1.26.5` 下重跑 `go vet ./...` 同样退出码 0。

### 聚焦测试与覆盖率

- 命令：`$env:GOTOOLCHAIN='go1.25.8'; go test -count=1 -timeout 2m -coverprofile storage_coverage.out ./storage`。
- 结果：退出码 0；`storage` 包整体覆盖率为 2.2%，这是 legacy 包中其它未触碰 provider 的存量覆盖状态。
- 受影响实现覆盖对象：`storage/casdoor.go` 的 `NewCasdoorStorageProvider`。
- Changed implementation coverage：`go tool cover -func storage_coverage.out` 显示该函数覆盖率为 100.0%，达到 85% 门槛。
- 测试质量：`TestNewCasdoorStorageProviderPreservesConfigFieldMapping` 使用本地 `httptest` HTTP 边界验证 provider 查询，并直接断言全部七个 `casdoor.Config` 字段映射；不是只断言 mock 调用次数。
- `service/proxy.go` 的最终 diff 只删除 panic 后不可达语句，没有新增或改写可执行语句，因此没有新增 changed statement 覆盖分母；控制流正确性由 RED/GREEN `go vet` 直接验证。
- 首批格式基线聚焦测试：
  - `go test -count=1 -timeout 3m -tags skipCi ./controllers -run 'TestGetExistUserByBindingRule|TestGetOAuthLinkIdentifierUsesDingTalkSyncedUserId'`：通过；
  - `go test -count=1 -timeout 3m -tags skipCi ./object -run 'TestNewAICodexDesktopApplicationHasFixedOIDCContract|TestEnsureAICodexDesktopApplicationContract|TestAICodexDesktopApplicationRequires|TestOrganizationSyncDefaultScheduleStore|TestOrganizationSyncProviderConfigDefaultWrappers'`：通过。
- 第二批格式基线聚焦测试：`go test -count=1 -timeout 3m -tags skipCi ./object -run 'TestResolveLarkUserByIdentifierCandidatesReturnsHistoricalMatch|TestOrganizationSyncExportHelperEdgeCases|TestApplicationResolveProviderLoginOrganization'`：通过。
- 一次过宽的 object 聚焦正则误包含既有陈旧 `TestAICodexDesktopApplicationDiscoveryContract`，该测试因 issuer 断言失败；收窄到本 change 直接触碰的 constructor/PKCE/schedule 测试后通过。本 change 未修改该已知陈旧 OIDC 断言。
- 清理：本地 coverage profile 已删除，未写入仓库。

### golangci-lint

- 固定版本：golangci-lint `2.11.4`，按仓库 `Makefile` 使用 Go `1.25.8` 构建。
- 配置校验：`golangci-lint config verify --config ../.golangci.yml` 退出码 0。
- 全量命令：`$env:GOTOOLCHAIN='go1.25.8'; golangci-lint run --config ../.golangci.yml ./...`。
- 首次真实扫描报告 3 个 `gofumpt` 基线文件；主控授权机械清理后，第二次扫描继续报告最后 3 个基线文件。使用相同 `gofumpt v0.9.2` 执行全 admin `gofumpt -l .`，确认完整剩余清单只有第二批 3 个文件；主控再次核对写集冲突后授权清理。
- 最终完整格式基线清单：`controllers/auth_binding_rule_test.go`、`object/aicodex_desktop_application.go`、`object/dingtalk_organization_sync_persistence_test.go`、`object/lark_user_util_test.go`、`object/organization_sync_api_key_test.go`、`object/provider_item_test.go`。
- 机械格式化最终范围共 6 个文件，只包含删除多余空行、合并相邻 package-level `var` 声明，以及 typed composite literal 中省略冗余 `&Group` 类型；未改变值、断言、控制流或测试语义。
- 最终格式门禁：`go run mvdan.cc/gofumpt@v0.9.2 -l .` 退出码 0、无输出。
- 最终全量 lint：退出码 0，输出 `0 issues.`；`govet` 与 `gofumpt` 均通过。
- 环境诊断：第一次扫描由 Go `1.25.8` 构建的 linter 调用了本机 Go `1.26.5`，触发工具版本 panic；将扫描子进程固定到 CI 的 Go `1.25.8` 后该环境问题消失。该次 panic 不计为源码 lint 结果。

### OpenSpec 与差异卫生

- `openspec validate "enable-incremental-go-correctness-gates" --strict`：通过。
- `openspec validate --changes --strict`：1 个 active change 通过，0 个失败。
- `git diff --check`：通过。
- `.github/workflows/build.yml`：本 change 无 diff；复用现有 Go-Linter job。
- `.golangci.yml`：只新增 `govet`，保留 `gofumpt`，未新增 `errcheck`、`staticcheck` 或排除规则。

## 证据层级与脱敏

本次验证覆盖静态分析、聚焦 Go 测试、changed implementation coverage、配置校验和 OpenSpec 结构校验。该 change 不改变 API、数据库、认证、运行时配置或用户交互，因此不需要真实环境、provider credential 或浏览器验收。记录中不包含 token、Cookie、账号、私有地址或连接串。

## 归档前 Review

- 状态：**READY**。实现、聚焦测试、changed implementation coverage、`go vet`、完整格式扫描、全量 golangci-lint 和 OpenSpec 校验均已取得通过证据。
- 最终代码：复查了 `.golangci.yml`、`Makefile`、`admin/storage/casdoor.go`、`admin/storage/casdoor_test.go`、`admin/service/proxy.go` 和 6 个机械格式化文件的完整 diff；未发现接口、配置值、断言或控制流语义变化。
- 注释：为实质修改的 exported `NewCasdoorStorageProvider` 补充中文 Go doc，说明使用稳定字段名并保持既有映射；`forwardHandler` 仅删除不可达语句，无新增非显然规则或公共契约，不需要额外注释。
- OpenSpec 文档语言：proposal、design、tasks、verification 和 delta spec 的协作正文以简体中文为主；`Requirement`、`Scenario`、`SHALL`、命令、路径、字段名和工具名保留为规范/技术关键字。
- 主规格同步：已通过 archive 新增 `openspec/specs/admin-go-correctness-gates/spec.md`；主规格与 `openspec/changes/archive/2026-07-15-enable-incremental-go-correctness-gates/specs/admin-go-correctness-gates/spec.md` 语义一致，archive 后 strict 与语言校验见后续 final gate。
- 交付单元：当前改动仍是工作区 diff，`origin/hfl-test-base..HEAD` 为 0 个 change commit；写集均属于本 change，允许在 archive 后收敛为单个最终 commit，并基于最新远端 base 重跑 final gate。

## 基线格式处置

- 主控先后授权两批共 6 个确定性格式文件，且确认与 runtime、Vite、Go fixture 并行写集无冲突；本 change 只应用同版本 gofumpt 的机械结果。
- 本 change 未通过扩大排除、关闭 `gofumpt` 或启用其它 linter 制造绿灯。
- Makefile 的本地 lint 注释已更新为 `gofumpt` + `govet`；CI workflow 因并行 Vite change 写集保持无 diff。

## 当前剩余风险

- CI workflow 中既有“gofumpt-only”注释将在本 change 合入后暂时过时；根据主控写集决策由拥有 workflow 的并行 Vite change 处理，本 change 不制造冲突。
- 全量 Go tests 的陈旧 OIDC assertion、fixture/schema 和环境隔离问题属于独立 `stabilize-admin-go-test-baseline-and-fixtures` change；本 change 不把聚焦门禁表述为全量测试通过。
- 本次审查范围内未发现新的 `govet`、字段映射、panic 控制流或机械格式化语义风险。
