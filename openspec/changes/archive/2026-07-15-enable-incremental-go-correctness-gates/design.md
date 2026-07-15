## Context

仓库根目录 `.golangci.yml` 使用 golangci-lint v2 配置，当前 `linters.default: none`，仅在 formatter 中启用 `gofumpt`。现有 CI Go-Linter job 和根目录 `make lint` 都从 `admin` Go module 运行 golangci-lint，因此只需修改共享配置即可同时覆盖本地与 CI。最新 `go vet ./...` 稳定报告两个错误：外部结构体 unkeyed literal 和 `panic` 后不可达语句。启用 `govet` 后的全量 lint 分两批暴露了 6 个 `origin/hfl-test-base` 既有 `gofumpt` 问题；主控逐批核对并授权把纯机械格式化纳入本 change，最终使用全 admin `gofumpt -l .` 确认没有遗漏，作为完整门禁转绿的前置基线清理。

## Goals / Non-Goals

**Goals:**

- 让 `admin` Go module 的 `go vet ./...` 和仓库现有 golangci-lint 命令通过。
- 在现有 lint 入口增量启用 `govet`，同时保持 `gofumpt` formatter。
- 用最小源码修复消除当前确定性错误，并保持字段映射、panic 语义、API 与运行时行为不变。
- 只机械清理全量 lint 与全 admin 扫描已证实的 6 个格式基线，并让 Makefile 注释准确描述当前规则。

**Non-Goals:**

- 不修改 `.github/workflows/build.yml`，不新增 CI job。
- 不启用 `errcheck`、`staticcheck` 或其它 lint 规则集，不添加排除项。
- 不对 6 个格式基线文件做测试或业务逻辑重构。
- 不处理 runtime config、Go fixture/schema、前端构建或其它技术债。

## Decisions

1. 在现有 `.golangci.yml` 的 `linters.enable` 中只增加 `govet`。这能让本地 `make lint` 与 CI Go-Linter 复用同一规则，不产生 workflow 写集冲突。备选方案是新增独立 `go vet` CI job，但会重复检查并违反本 change 的 workflow 边界；一次性启用更多 linter 则会把无关存量债务混入交付。
2. 将 `casdoor.Config` 改为具名字段初始化，并按依赖 `v1.8.0` 的字段定义保持原有顺序映射：`clientId`→`AccessID`、`clientSecret`→`AccessKey`、`endpoint`→`Endpoint`、`cert`→`Certificate`、`region`→`ApplicationName`、`content`→`OrganizationName`、`bucket`→`Provider`。这消除对外部结构体字段顺序的脆弱依赖，但不改变传入值。
3. 仅删除 `panic(err)` 后的不可达 `return`。`panic` 已终止当前控制流，因此删除语句不改变成功或失败路径。
4. 把首次失败的 `go vet ./...` 作为 RED 证据；修改后重跑 `go vet`、受影响包测试/覆盖率和 golangci-lint 作为 GREEN 与回归证据。该 change 不引入新函数或新业务分支，不为静态可判定语句添加低价值 mock 测试。
5. 使用 golangci-lint `v2.11.4` 内置的 `gofumpt v0.9.2` 对 6 个指定文件做机械格式化，并逐文件审查 diff。该清理只删除多余空行、按 gofumpt 规则合并相邻 package-level `var` 声明，或在 typed composite literal 中省略冗余 `&Group` 类型，不改变值、断言或控制流。
6. 只更新 Makefile 的本地 lint 注释；CI workflow 属于并行 Vite change 的潜在写集，保持不变。

## Risks / Trade-offs

- [风险] golangci-lint 的 `govet` 分析集合可能与独立 `go vet` 有版本差异 → 使用 CI 固定的 golangci-lint `v2.11.4` 和当前 Go module 分别验证，两条门禁都必须通过。
- [风险] 具名字段写错会改变 Casdoor 配置语义 → 实施前已对照依赖 `github.com/casdoor/oss v1.8.0` 的 `Config` 定义核对全部字段映射，实施后复查最终 diff。
- [取舍] 本次只建立第一层 correctness gate，仍可能存在 `errcheck`/`staticcheck` 能发现的问题 → 保持增量范围，后续通过独立 change 评估，不用排除规则掩盖债务。
- [风险] 机械格式化误带业务改动 → 固定 6 个文件和 gofumpt 版本，格式化前后逐项审查 diff，并运行直接相关测试；最终 `gofumpt -l .` 必须无输出。

## Migration Plan

1. 修复两个当前基线错误并验证 `go vet ./...`。
2. 启用 `govet`，按现有 CI 等价命令运行 golangci-lint。
3. 若门禁暴露超出当前两个问题的新确定性错误，只修复与 `govet` 直接相关且不改变业务语义的问题；出现范围扩张时停止收口而不是增加排除。
4. 回滚只需恢复 `.golangci.yml` 和两处最小源码 diff，不涉及数据迁移、配置迁移或部署步骤。

## Open Questions

- 无。当前范围、版本、验证入口和非目标均由仓库基线与任务约束确定。
