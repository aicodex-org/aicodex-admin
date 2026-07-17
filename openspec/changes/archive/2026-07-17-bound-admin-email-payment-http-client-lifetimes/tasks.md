## 1. 实施前门禁与设计收口

- [x] 1.1 对照最新实现、直接调用方、同域 timeout 惯例和相关主规格完成 proposal/design/spec review，确认四处调用矩阵、15/30 秒依据、truth owner、非目标与回滚边界。
- [x] 1.2 运行 `openspec validate bound-admin-email-payment-http-client-lifetimes --strict`、`openspec validate --changes --strict` 与 `git diff --check`，取得 implementation-ready 结论。

## 2. RED：固定现有缺口与兼容契约

- [x] 2.1 为 Azure ACS 添加 constructor/default timeout、注入 identity、请求签名/header、202/400/401/其它状态、网络错误、timeout/cancel 的直接测试，并确认旧实现按预期 RED。
- [x] 2.2 为 GC 添加 constructor/default timeout、注入 identity、POST/body/成功与业务错误、网络错误、timeout/cancel 的直接测试，并确认旧实现按预期 RED。
- [x] 2.3 为 FastSpring Pay/Notify 添加 constructor/default timeout、共享注入 identity、Basic Auth/URL、成功/非 2xx、404/未完成 pending、完成 paid、网络错误、timeout/cancel 的直接测试，并确认旧实现按预期 RED。

## 3. GREEN：实现有界 client policy

- [x] 3.1 在 Azure ACS 内增加 30 秒独立默认 client 与 nil fallback resolver，保持公开 constructor、请求、签名、状态和错误契约不变。
- [x] 3.2 在 `admin/pp` 增加 15 秒支付域局部 HTTP client helper，并让 GC/FastSpring constructor 与 nil fallback 使用该策略，保持注入 client 原样优先。
- [x] 3.3 将四处裸 client 调用切换到 Provider 持有的有界 client，运行 RED 测试至 GREEN 并完成最小重构。

## 4. 验证与归档前审查

- [x] 4.1 对改动 Go 文件运行仓库固定 `gofumpt`，执行 email/pp 聚焦测试、相关包测试及适用的 `-race`。
- [x] 4.2 生成覆盖率并证明 changed production functions/lines 达到 85%，测试覆盖成功、状态/pending、网络错误与 timeout/cancel，而非只验证 mock 调用。
- [x] 4.3 运行 `-tags skipCi ./...` 全量测试、`go vet`、固定 golangci-lint v2.11.4；区分任何环境/既有 fixture 阻断。
- [x] 4.4 补充中文脱敏 `verification.md`，完成 OpenSpec target/changes/specs strict、注释/语言/脱敏、`git diff --check` 与 pre-archive review READY。

## 5. Release Candidate

- [x] 5.1 fetch/rebase 最新 `origin/hfl-test-base`，重跑受影响门禁并收敛为 latest base + 1 logical commit。
- [x] 5.2 普通 push 工作分支并回传 `RC_READY`；不得 archive、push base、删除工作分支、释放 lease 或 push/merge `test`。
