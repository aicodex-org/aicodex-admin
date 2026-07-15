## 1. 固化最新基线与实施边界

- [x] 1.1 读取仓库规则、技术债基线、`.golangci.yml`、现有 Go-Linter job 和直接相关源码，确认写集与非目标。
- [x] 1.2 Fetch 最新 `origin/hfl-test-base`，确认起点 clean、与远端一致、无 active change 或同名分支冲突。
- [x] 1.3 从 `admin` Go module 运行 `go vet ./...`，记录 unkeyed `casdoor.Config` 与 panic 后不可达语句两个稳定 RED 结果。
- [x] 1.4 对照 `github.com/casdoor/oss v1.8.0` 的 `Config` 定义核对七个既有参数的字段映射。
- [x] 1.5 完成实施前 review，修复 proposal、design、spec 和 tasks 的阻断项，并通过 OpenSpec strict 校验。

## 2. 实施最小 correctness 修复

- [x] 2.1 将 `admin/storage/casdoor.go` 的外部结构体初始化改为具名字段，保持全部既有值映射不变。
- [x] 2.2 删除 `admin/service/proxy.go` 中 `panic(err)` 后不可达的 `return`，保持 panic 控制流语义。
- [x] 2.3 在 `.golangci.yml` 中只增量启用 `govet`，保留 `gofumpt`，不新增其它 linter 或排除规则。
- [x] 2.4 使用固定 `gofumpt v0.9.2` 机械格式化全量 lint 与全 admin 扫描确认的 6 个既有基线文件，确认 diff 不改变测试或业务语义，并验证 `gofumpt -l .` 无输出。
- [x] 2.5 更新 Makefile lint 注释，准确描述 `gofumpt` + `govet` 增量规则；保持 CI workflow 不变。

## 3. 验证实现与门禁

- [x] 3.1 对受影响 Go 包运行聚焦测试/覆盖率，记录 correctness-only 修改的覆盖对象、结果与测试质量判断。
- [x] 3.2 从 `admin` Go module 重跑 `go vet ./...`，确认两个基线错误均消失且没有新增错误。
- [x] 3.3 按仓库现有方式使用 golangci-lint `v2.11.4` 和 `.golangci.yml` 运行 `./...`，确认 `govet` 与 `gofumpt` 门禁通过。
- [x] 3.4 运行 `openspec validate "enable-incremental-go-correctness-gates" --strict`、`openspec validate --changes --strict` 与 `git diff --check`。
- [x] 3.5 创建中文 `verification.md`，记录 RED/GREEN、版本、命令、覆盖率口径、证据层级和剩余风险，且不包含敏感环境信息。

## 4. Review 与 self-closeout

- [x] 4.1 完成归档前 review 循环，复查最终源码、注释、文档语言、规格同步、覆盖率和交付单元边界。
- [x] 4.2 Archive change 并同步主规格，验证 active changes、主规格与 archive 副本。
