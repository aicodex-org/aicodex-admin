## 1. 基线与边界证据

- [x] 1.1 在无 MySQL/PostgreSQL 环境重跑 `go test -count=1 -tags skipCi ./...`，记录 i18n、OIDC、SQLite 超时和运行前后工作区状态。
- [x] 1.2 读取 60 私有环境/运维说明并确认只在 Fanley PostgreSQL 测试库使用唯一 schema、可清理对象和脱敏报告；确认不访问 69。
- [x] 1.3 在实施前 review 中逐项核对 proposal/design/spec/tasks、并发写集、主规格和最新代码，运行 strict validate 与 `git diff --check`。

## 2. 陈旧断言与测试产物（TDD）

- [x] 2.1 为 i18n deduplicate 添加“跨 namespace 同名不重复、同 namespace 原始 JSON 重复必须报告”的聚焦测试，先确认当前实现因预期语义失败。
- [x] 2.2 最小改写 token parser 以 namespace 内完整 key 判重，保留 malformed JSON 诊断，并运行 i18n 聚焦测试至 GREEN。
- [x] 2.3 复用已失败的 AICodex Desktop discovery contract 测试，最小更新共享 issuer/JWKS 陈旧期望并确认 scope、refresh token、PKCE 断言继续通过。
- [x] 2.4 复用 tracked key 被覆盖的 RED 证据，将 key/cert 生成文件改写到 `t.TempDir()`，补内容/文件存在性断言并验证测试前后 `git status` 一致。

## 3. Schema registry 与 SQLite fixture（TDD）

- [x] 3.1 先添加 registry 聚焦测试，要求空 SQLite 创建全部 AICodex-owned 表、逐表存在且重复 sync 成功；确认因 helper/registry 尚不存在而 RED。
- [x] 3.2 新增返回 fresh model pointer 的窄 AICodex-owned registry 与 sync helper，让生产 `createTable()` 在一个边界调用它，同时保持所有 legacy Casdoor `Sync2` 在 registry 外。
- [x] 3.3 新增单连接内存 SQLite test helper，并只迁移有超时证据且不与 Admin-3 写集重叠的 file-backed fixture；运行聚焦 object tests 验证行为和耗时。
- [x] 3.4 修改 `organization_sync_api_key_test.go` 前已 fetch/rebase `e3478d8d`，继承 Admin-3 gofumpt 后仅增加 fixture 语义改动。

## 4. Hermetic 与 DB integration 入口（TDD）

- [x] 4.1 根据 `InitConfig()`/外部写入证据给当前 DB 测试增加正向 `integration` tag，给第三方存储/同步脚本增加 `integration && external`，证明 hermetic 不再加载它们。
- [x] 4.2 先添加 build-tagged registry integration 测试并确认缺 driver/DSN 时以清晰非零诊断失败，且诊断不包含环境值。
- [x] 4.3 实现 PostgreSQL 唯一 schema 的创建、`search_path` 限定、registry 重复同步、逐表检查与 `DROP SCHEMA ... CASCADE` cleanup；实现 MySQL 唯一 prefix 与仅本 prefix 表 cleanup。
- [x] 4.4 在 `Makefile` 增加 hermetic、ignored coverage、PostgreSQL integration 和 MySQL compatibility 目标；命令与前置变量使用说明保持简洁。

## 5. 后端 CI 分层

- [x] 5.1 保留现有 `go-tests` job id，将其内容改为无 DB hermetic；另增 MySQL 5.7 compatibility job，并仅让 backend 同时依赖两者以保持 release 门禁，不修改任何 frontend/Vite/lint build tooling 段。
- [x] 5.2 增加 PostgreSQL integration 状态 job：未启用写 `NOT_RUN` summary，启用但 secret 缺失 fail-closed，配置完整才运行测试且不回显 DSN。

## 6. 验证、证据与 RC

- [x] 6.1 运行聚焦测试、无 DB hermetic 全量命令、缺环境 integration、MySQL compatibility（环境可用时）及 schema registry/SQLite fixture 测试，并记录运行前后 `git status`。
- [x] 6.2 在授权 60 PostgreSQL 独立 schema 运行 registry integration，记录脱敏 marker hash/表数量/cleanup 状态；若不能安全创建和清理，作为 RC blocker 停止。
- [x] 6.3 运行受影响 package coverage，报告 package 与新增 helper 函数覆盖；若全 package 低于 85%，说明 legacy package 体积、聚焦覆盖和剩余缺口，不添加低价值测试。
- [x] 6.4 在最新 correctness base 上运行 `go vet ./...`、固定 `golangci-lint v2.11.4`、`openspec validate ... --strict`、`openspec validate --changes --strict` 和 `git diff --check`。
- [x] 6.5 更新中文 `verification.md`，完成 RC 级最终 review；fetch/rebase 最新 `origin/hfl-test-base`，确认未覆盖其他 worker 改动后收敛为单一 commit 并 push 工作分支，不 archive、不合入 base/test。
