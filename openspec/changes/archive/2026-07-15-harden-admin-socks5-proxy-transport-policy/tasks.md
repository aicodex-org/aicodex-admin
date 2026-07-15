## 1. TDD 安全回归测试

- [x] 1.1 在 `admin/proxy/proxy_test.go` 先增加不受信任 TLS、可信测试 CA + 正确 hostname、hostname mismatch 和 plain HTTP 的 hermetic 测试，并运行 RED 证明当前 `InsecureSkipVerify` 或缺失构造边界导致预期失败
- [x] 1.2 先增加 `githubusercontent.com` / `googleusercontent.com` 原始字符串路由、其他目标、大小写敏感兼容和代理不可达 fallback 测试，并运行 RED/基线结果确认既有契约
- [x] 1.3 先增加 transport policy 字段、慢 TLS handshake、慢 response header 和 connect context 取消测试，并运行 RED 证明当前 deadline 缺口
- [x] 1.4 增加探测成功日志不包含完整代理地址的测试，并运行 RED 复现当前敏感地址输出

## 2. 最小 transport policy 实现

- [x] 2.1 克隆并配置标准 `http.Transport`，为默认、fallback 和代理路径设置 10 秒 dial/connect、10 秒 TLS handshake、30 秒 response-header 与 90 秒 idle connection timeout，保持 `http.Client.Timeout == 0`
- [x] 2.2 使用 context-aware SOCKS5 `DialContext` 接入 transport，删除无条件 `InsecureSkipVerify`，保持系统 Root CA、hostname 校验、HTTP keep-alive 和连接复用
- [x] 2.3 保持 `socks5Proxy`、100ms 可达探测、原始字符串路由和不可达直接 fallback；dialer 构造/能力异常安全 fallback，不新增 panic 或 insecure 配置
- [x] 2.4 将代理启用日志改为不含完整地址、URL 或凭据的脱敏信号，并补充必要的中文安全边界注释
- [x] 2.5 每完成一个最小实现步骤后运行 `go test -count=1 ./proxy` 验证 GREEN，并在重构后保持聚焦 suite 全绿

## 3. 覆盖率与兼容验证

- [x] 3.1 使用本地 listener/`httptest` 完成不依赖外网和真实代理的 TLS、HTTP、超时与 fallback smoke，并记录脱敏证据
- [x] 3.2 运行 `go test -coverprofile` 并核对 changed production statements coverage >=85%，测试必须覆盖安全失败与兼容路径而非仅执行行号
- [x] 3.3 运行 proxy 聚焦测试、相关调用方 compile/tests、带 build tag 的直接测试调用方 compile 和全量 hermetic Go 测试，确认测试前后工作区无任务外产物
- [x] 3.4 运行 `gofumpt`、`go vet ./...`、固定 `golangci-lint v2.11.4` 和 `git diff --check`

## 4. OpenSpec 与初始 RC 收口

- [x] 4.1 创建中文 `verification.md`，记录 RED/GREEN、TLS、deadline、coverage、调用方兼容、N/A 环境与脱敏验证证据
- [x] 4.2 运行目标 change、`--changes`、`--specs` strict validate 并完成 pre-archive review 循环，确认本审查范围内 READY
- [x] 4.3 将最终 RC 收敛为基于最新 `origin/hfl-test-base` 的 1 个逻辑 commit，重跑关键验证并推送 `hfl-test/harden-admin-socks5-proxy-transport-policy`
- [x] 4.4 初始 RC 阶段保持 change active、工作分支保留、`push_test=false`、`lease_release=false`，不 archive、不合入或 push `hfl-test-base` / `test`

## 5. 主控授权 self-closeout

- [x] 5.1 主控 RC 审计通过并授权 `self-closeout=true` 后，archive change 并同步 `admin-socks5-proxy-transport-policy` 主规格
- [x] 5.2 修复 archive 后主规格自动生成的占位 Purpose，复查归档副本/主规格语言、UTF-8/LF、EOF 与 strict validate
