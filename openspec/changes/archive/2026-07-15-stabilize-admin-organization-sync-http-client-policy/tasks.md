## 1. RED：固定 transport policy 契约

- [x] 1.1 新增 table-driven 测试，覆盖钉钉、飞书和企业微信构造器的默认 client 非 nil、`Timeout == 30 * time.Second` 且三者一致。
- [x] 1.2 新增 table-driven 测试，覆盖三个 client 的 nil fallback policy 及显式注入 `*http.Client` 的指针 identity 保持。
- [x] 1.3 新增 table-driven 测试，覆盖已取消 context、短 context deadline 和带短 timeout 的显式 client 面对慢 `httptest.Server` 时有界返回，并断言原始私有 URL/凭据不出现在错误文本中。
- [x] 1.4 运行聚焦测试并记录因当前 `http.DefaultClient` 零 timeout、Feishu 构造器 nil client 或未脱敏 transport cause 导致的预期失败证据。

## 2. GREEN：实现统一默认 policy

- [x] 2.1 新增 `admin/object/organization_http_client_policy.go`，集中定义 30 秒 timeout、独立默认 client 构造、injected-or-default 选择和安全 transport cause 分类。
- [x] 2.2 修改三个公开构造器和 `httpClient()` fallback 使用统一 helper，保持显式注入 client 原样优先且不修改全局 HTTP 状态。
- [x] 2.3 确保三个 client 的 transport 错误可见文本保留 provider alias 且不泄漏 URL/凭据；DingTalk/Feishu 收敛原始 cause，WeCom 复用既有安全 `SafeMessage`。
- [x] 2.4 运行新增聚焦测试至通过，再运行三个既有 organization client 测试，确认 token、headers、分页、fallback、DTO 和 provider 错误解析兼容。

## 3. 质量验证与归档前审查

- [x] 3.1 通过固定 `golangci-lint v2.11.4 fmt` 的 `gofumpt` formatter 格式化受影响 Go 文件，并运行 `admin/object` 聚焦测试；changed production statements coverage 为 16/16（100%）。
- [x] 3.2 运行 full hermetic Go suite、`go vet ./...` 和固定 `golangci-lint v2.11.4 + repo .golangci.yml`；临时 ignored vendor/linter 已清理，测试前后 `git status` 无任务外 tracked 产物。
- [x] 3.3 运行 OpenSpec target、`--changes --strict`、`--specs --strict`、`git diff --check` 和 `golangci-lint fmt --config ../.golangci.yml --diff`（`gofumpt`），并完成 artifacts/规格语言、注释与验证记录脱敏检查。
- [x] 3.4 新增中文 `verification.md`，按证据层级记录命令、coverage、provider 行为兼容、browser/60=N/A、真实 provider E2E 未执行及未使用真实凭据的边界。
- [x] 3.5 完成 pre-archive review，结论为可进入 RC 收口；按 `release-candidate-only` 保持 change active，不 archive、不合入 base/test、不释放 lease。

## 4. Release candidate 收口

- [x] 4.1 基于最新 `origin/hfl-test-base` 检查分支 ancestry，将本 change 收敛为一个 Conventional Commit。
- [x] 4.2 在 rebase 后最终源码状态重跑 OpenSpec、base-range diff、格式化、聚焦 provider/policy 测试和 `go vet ./...`，确认工作区 clean。
- [x] 4.3 仅推送 `hfl-test/stabilize-admin-organization-sync-http-client-policy` 工作分支，并回传结构化 RC 状态：`push_test=false`、`lease_release=false`、`needs_master_decision=true`。
