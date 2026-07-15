## Why

Admin 后端现有 Go-Linter 仅执行 `gofumpt`，无法阻止已由 `go vet` 稳定识别的 correctness 问题进入基线。当前两个确定性问题范围小、修复不改变运行时语义，适合先建立窄而可持续的增量门禁。

## What Changes

- 修复 `admin/storage/casdoor.go` 中外部 `casdoor.Config` 的 unkeyed struct literal，并保持现有字段映射不变。
- 删除 `admin/service/proxy.go` 中 `panic(err)` 后不可达的 `return`，不改变错误处理行为。
- 机械格式化全 admin 扫描确认的 6 个既有 `gofumpt` 基线文件，不改变测试或业务语义。
- 在 `.golangci.yml` 中增量启用 `govet`，继续保留 `gofumpt` formatter，并复用现有 Go-Linter job。
- 更新 Makefile 的本地 lint 说明，使其准确描述 `gofumpt` + `govet` 规则；不启用 `errcheck`、`staticcheck` 等其它 linter，不增加大面积排除规则，也不修改 CI workflow、业务接口或运行时配置。

## Capabilities

### New Capabilities

- `admin-go-correctness-gates`: 约束 Admin Go 模块必须通过 `go vet`/`govet` correctness 检查，并保持现有格式化门禁。

### Modified Capabilities

- 无。

## Impact

- 配置与说明：`.golangci.yml`、`Makefile`。
- Go 源码：`admin/storage/casdoor.go`、`admin/service/proxy.go`，以及 6 个只做机械格式化的既有基线文件。
- CI：复用 `.github/workflows/build.yml` 现有 Go-Linter job，不修改 workflow。
- API、数据模型、运行时配置、fixture/schema 与 `web-admin` 均不受影响。
