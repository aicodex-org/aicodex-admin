## 验证结论

当前 release candidate 已解除已知阻断：独立前端 blocker patch 在基线中清理真实的同 namespace 重复 key 后，本 change 已 rebase 包含该修复、Vite change 和后续前端修复的最新 `origin/hfl-test-base`，完整 hermetic 入口通过。Go 测试分层、SQLite registry fixture、60 PostgreSQL integration 和 correctness gate 均已有对应层级证据；本 change 仍保持 RC-only，不自行 archive 或合入共享分支。

本轮 RC pre-archive review 结论为 **READY**：主控已接受有证据的 coverage 例外，MySQL/MSSQL 按下述层级保留为非阻塞风险；OpenSpec 文档以中文说明为主，新增 registry/fixture 的关键注释已说明复用边界与性能原因，验证记录已脱敏。主规格将在后续获得授权的 archive 流程同步，本 worker 不执行 archive。

## Hermetic 与聚焦测试

- `go test -count=1 ./i18n -run '^TestFindDuplicateKeysInJSON' -v`：通过。不同 namespace 可复用同名 key；同 namespace 原始 JSON 重复返回完整 `namespace:key`。
- `go test -count=1 ./object -run '<registry/fixture/OIDC focused tests>' -v`：通过。SQLite registry 两次同步、39 个模型集合、OIDC discovery 当前合同和组织同步 fixture 均通过。
- `go test -count=10 ./util -run '^Test_GetCurrentTime$'`：通过，时间窗口断言未复现跨秒竞态。
- `go test -count=1 ./object -run '^(TestGenerateRsaKeys|TestGenerateEsKeys|TestGenerateRsaPssKeys)$' -v`：通过；运行前后 `git status --porcelain=v1` 完全一致。
- `GOTOOLCHAIN=go1.25.8 go test -count=1 -tags skipCi ./...`：在最新基线上通过，所有 package exit 0；`i18n` 0.355 秒、`object` 5.564 秒。运行前后 `git status` 无新增变化。
- 本机没有 `make`，因此使用 Makefile 中完全等价的 `go test` 命令验证；CI/Linux 继续使用 Makefile target。

## 数据库 integration

- 缺少环境变量时运行 build-tagged PostgreSQL integration：按预期非零退出，只报告缺少 `AICODEX_TEST_DB_DRIVER`，未输出环境值。
- 60 PostgreSQL 测试环境：在唯一隔离 schema 内创建并逐表检查 39 个 registry model，第二次 `Sync2` 成功；marker hash 为 `sha256:a77e0098d1fd2297`，schema cleanup 与远端 test binary cleanup 均完成。
- 最终 rebase 一致性检查：locale/Vite 及后续前端 base commits 未修改 `aicodex_schema_registry.go`、integration test 或 `ormer.go`，SQLite 聚焦测试在最新 base 重新通过，因此上述 60 PostgreSQL 证据继续对应相同 schema 实现；未重复写入真实测试库。
- 60 验证只读取已授权的私有环境/运维说明；未部署、未重启服务，本文不包含 DSN、账号密码、主机、端口、token、Cookie、raw payload 或私有 URL。
- MySQL 5.7：保留为 CI disposable service 的 legacy compatibility job；本机没有可用 MySQL，未宣称本地运行态通过。
- MSSQL：仅由全仓编译、`go vet` 和 driver 边界覆盖；没有授权运行环境，不宣称真实数据库兼容。

## 覆盖率

- 命令：`go test -count=1 -tags skipCi -coverprofile <ignored-test-results>/object.coverage.out ./object`。
- `object` package statement coverage：`40.4%`，低于 85%。该包包含大量本 change 未触碰的 legacy 实现。
- `aicodexOwnedSchemaModels`：`100.0%`；`syncAICodexOwnedSchema`：`100.0%`。
- 生产 `createTable()` 是大型 bootstrap 函数，package coverage 中为 `0.0%`；本 change 通过 SQLite 和 60 PostgreSQL 对共享 registry 的生产调用边界提供行为证据。
- 主控已接受明确例外：40.4% 是包含大量未触碰 legacy 实现的 package 平均值，不能代表本 change 新增 registry helper 的覆盖情况；本记录同时保留完整 package 数字与新增 helper 的 100% 函数覆盖，没有排除受影响文件、缩小 package 统计口径或添加只为执行行号的低价值测试。

## Correctness 与文档门禁

- `golangci-lint fmt ./...`（v2.11.4）：通过，无格式化残留。
- `go vet ./...`：通过。
- `GOTOOLCHAIN=go1.25.8 golangci-lint run ./...`（v2.11.4）：`0 issues`。运行前按仓库 `make lint` 语义执行 ignored `go mod vendor`；默认 Go 1.26.5 与以 Go 1.25.8 构建的 linter 不兼容，故使用 `go.mod` 声明的 toolchain。
- `.github/workflows/build.yml`：Go hermetic、PostgreSQL 状态和 MySQL compatibility 为独立 job；frontend/Vite/lint build tooling 段未被本 change 修改。
- 最新 Vite base 结构化对比：除本 change 所有的 Go test jobs 与 `backend.needs` 外，其余 workflow jobs 与 `origin/hfl-test-base` 完全一致；`web-admin`、locale、`.golangci.yml` 和 Go module 均不在本 change diff。
- final fetch 后 base 仅追加 `.gitignore` 的本地规划目录规则；rebase 前后 `admin` tree object 完全一致，因此复用同一最终 Go 源码上的 fresh hermetic、vet、lint 与 coverage 结果，并在 rebase 后再次运行 i18n/SQLite registry 聚焦测试、OpenSpec strict 和 diff check。
- `openspec validate stabilize-admin-go-test-baseline-and-fixtures --strict`、`openspec validate --changes --strict`、`openspec validate --specs --strict`：全部通过。
- `git diff --check`：通过；workflow YAML 解析通过。

## 剩余非阻塞风险

- locale 重复 key 由独立前端 patch 在 base 修复，本 change 未修改 locale，也未通过 skip、allowlist 或弱化断言处理；完整 hermetic 重跑已通过。
- `object` package 总覆盖率仍为 40.4%；主控已接受上述有证据的覆盖率例外，不要求继续补低价值测试。
- MySQL 5.7 compatibility 只能在 CI disposable service 中取得运行态证据；若工作分支 CI 不可观察，则作为合入后的 compatibility gate，不阻塞本 RC。
- MSSQL 没有运行态证据。
- 本 change 只建立当前 bootstrap registry，不建立 schema version、migration history 或 rollback；后续 migration change 仍需独立实施。
