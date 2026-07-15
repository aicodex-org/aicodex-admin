# admin-go-correctness-gates Specification

## Purpose
定义 Admin Go 模块的增量 correctness 静态门禁，确保仓库同时保留 `gofumpt` 格式检查与 `govet` 正确性分析，并约束门禁修复不改变业务语义。

## Requirements
### Requirement: Admin Go 模块执行 correctness 静态门禁
仓库 SHALL 让 `admin` Go module 在执行 `go vet ./...` 以及使用仓库 `.golangci.yml` 的 golangci-lint 时通过 `govet` correctness 检查。

#### Scenario: 当前 Go 源码通过独立 vet
- **WHEN** 开发者从 `admin` Go module 目录执行 `go vet ./...`
- **THEN** 命令 SHALL 以退出码 0 完成，且不报告确定性 correctness 错误

#### Scenario: 现有 Go-Linter 复用 govet 配置
- **WHEN** CI 或开发者使用仓库现有 golangci-lint 入口扫描 `admin` Go module
- **THEN** `.golangci.yml` SHALL 启用 `govet` 并让命令以退出码 0 完成

### Requirement: 增量门禁保持既有范围与行为
仓库 SHALL 在保留 `gofumpt` formatter 的同时只增量启用 `govet`，且为满足该门禁所做的源码修复 MUST 不改变业务接口、配置值映射或运行时控制流语义。

#### Scenario: Casdoor 配置改用具名字段
- **WHEN** `NewCasdoorStorageProvider` 构造外部 `casdoor.Config`
- **THEN** 每个既有参数 SHALL 映射到与修改前字段顺序对应的同一字段

#### Scenario: 删除 panic 后不可达语句
- **WHEN** 代理目标 URL 解析失败并执行 `panic(err)`
- **THEN** 失败路径 SHALL 保持 panic 语义，且源码中 MUST 不保留 panic 后的不可达 `return`

#### Scenario: 不扩大 linter 与排除范围
- **WHEN** 审查增量门禁的 `.golangci.yml` 配置
- **THEN** 变更 SHALL 不启用 `errcheck`、`staticcheck` 或其它新增 linter，也 SHALL 不增加排除规则
