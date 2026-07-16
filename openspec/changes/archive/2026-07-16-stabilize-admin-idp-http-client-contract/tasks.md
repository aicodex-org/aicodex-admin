## 1. 审计与实施前门禁

- [x] 1.1 审计 `admin/idp` 全部30个 `SetHttpClient` 实现，记录当前纳入的Gitee、LinkedIn、Casdoor、Lark、WeChat Mini Program证据及后续Provider债务。
- [x] 1.2 运行 `openspec validate stabilize-admin-idp-http-client-contract --strict`、all changes strict与 `git diff --check`，完成pre-implementation review并达到READY。

## 2. 共享HTTP client与响应生命周期TDD

- [x] 2.1 在 `admin/idp/http_client_contract_test.go` 先写 `resolveIdPHTTPClient`/`executeIdPRequest` RED测试：注入client/Transport指针保持、nil fallback为30秒、成功/non-2xx/read error均关闭body、错误不回显body sentinel；从 `admin` 运行对应 `go test ./idp -run 'Test(IdPHTTPClient|ExecuteIdPRequest)' -count=1`，确认因helper缺失而失败。
- [x] 2.2 新增 `admin/idp/http_client.go` 最小私有实现，只负责client解析、Do、2xx判断、读取/关闭body与脱敏stage错误；重跑2.1命令确认GREEN。

## 3. Gitee、LinkedIn与Casdoor TDD

- [x] 3.1 先写三Provider table-driven RED测试：注入RoundTripper实际调用且未被覆盖，token request form字段正确且RawQuery无credential，profile token只在Authorization header，invalid endpoint不调用transport，3xx/4xx/5xx与敏感body错误脱敏，成功token/profile DTO不变。
- [x] 3.2 从 `admin` 运行 `go test ./idp -run 'Test(Gitee|LinkedIn|Casdoor)IdProviderHTTPContract' -count=1`，记录因DefaultClient/包级PostForm/query/状态/body生命周期等当前违规产生的预期RED。
- [x] 3.3 最小修改 `admin/idp/gitee.go`、`linkedin.go`、`casdoor.go` 使用共享helper和安全request编码；不改变endpoint、scope、callback或成功DTO；重跑3.2命令确认GREEN。

## 4. Lark与WeChat Mini Program TDD

- [x] 4.1 先补RED测试：Lark nil fallback为30秒、所有非2xx失败且错误不包含provider `msg/error_description` 中的secret/token；MiniProgram直接构造client有界、注入优先、non-2xx/body close/错误脱敏且保留 `jscode2session` query字段。
- [x] 4.2 从 `admin` 运行 `go test ./idp -run 'Test(Lark|WeChatMiniProgram).*HTTPContract' -count=1`，确认现有DefaultClient/空client/错误回显/状态处理导致预期RED。
- [x] 4.3 最小修改 `admin/idp/lark.go`、`wechat_miniprogram.go` 使用共享helper并收敛错误；重跑4.2及既有Lark tests确认GREEN。

## 5. 代码质量与验证

- [x] 5.1 使用gofumpt格式化全部改动Go文件，运行 `gofumpt -l`确认目标文件无输出，并检查没有格式化无关文件。
- [x] 5.2 从 `admin` 运行聚焦 `go test ./idp -count=1`、全包 `go test ./...` 与必要的race-free重复测试，记录fake transport/server仅为本地契约验证；全仓命令的既有数据库、环境值和fixture blocker按真实结果记录。
- [x] 5.3 生成临时coverprofile并按受影响实现文件统计changed implementation coverage，确认达到85%后删除coverage产物。
- [x] 5.4 从 `admin` 运行 `go vet ./...`，使用Go 1.25.8与golangci-lint v2.11.4按仓库 `.golangci.yml` 及CI的vendor前置执行全量lint，不得新增排除。
- [x] 5.5 编写脱敏 `verification.md`，运行OpenSpec target/all changes/all specs strict、`git diff --check`，并确认无Web3、workflow、schema、runtime config或controller运行逻辑diff。

## 6. Review与self-closeout

- [x] 6.1 完成pre-archive review循环，确认最终Blocking/Fixable均为0、覆盖率达标、注释和错误脱敏门槛满足。
- [x] 6.2 Archive change并同步 `admin-idp-http-client-contract` 主规格，复跑归档后strict/语言/脱敏/EOF审计。
- [x] 6.3 收敛为latest `origin/hfl-test-base` + 1 logical commit并完成push前final gate；普通非强制push base、禁止push/merge test及工作区回收由self-closeout后续操作和最终回传证明。
