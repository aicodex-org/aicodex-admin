# Verification

## 结果摘要

- 本 change 只使用本地单元测试和编译检查验证，不打开真实 gate，不写真实 fixture，不访问生产/类生产环境。
- 验证记录未写入真实 token、Cookie、私有 URL、真实组织树或真实 subject 明细；测试中使用 `gateway.example.invalid` 和 synthetic org/run id。

## OpenSpec / Diff

- `openspec validate implement-admin-gateway-projection-run-diff-and-retry-readiness --strict`：通过。
- `git diff --check`：通过。

## Backend

- `cd admin && go test ./object -run 'TestGatewayProjectionRunReadiness|TestGatewayProjectionManualPublish'`：通过。
- `cd admin && go test ./object -run 'TestGatewayProjectionRunReadiness' -coverprofile ..\run-readiness-object.cover.out`：通过。
- `go tool cover -func ..\run-readiness-object.cover.out`：新增 `gateway_organization_projection_run_readiness.go` 按变更文件统计覆盖率 `96/110 = 87.3%`，达到 85% 门槛；`object` package 总覆盖率因包体较大显示为 2.2%，不作为本 change 覆盖率口径。
- `cd admin && go test ./controllers -run '^$'`：通过，验证新增 controller 编译。
- `cd admin && go test ./routers -run '^$'`：通过，验证新增 route 编译。
- `cd admin && go test ./object ./controllers ./routers`：未作为通过项。该命令触发既有 `TestDumpToFile` 连接本地 MySQL `localhost:3306` 失败，以及既有 `TestAICodexDesktopApplicationDiscoveryContract` 断言失败；与本 change 新增 run readiness 路径无关，已用上面的聚焦命令覆盖本 change。

## Frontend

- `cd web-admin && yarn test --watchAll=false --runTestsByPath src/backend/PlatformApiMappingBackend.test.js src/PlatformApiMappingPage.test.js`：退出码 0，通过相关 backend/page 测试。

## 脱敏与边界

- 响应 DTO 只返回 aggregate counts、stable failure alias、retry action、source/projection version summary 和 latest in-process run reference。
- 未返回 publisher endpoint/token、Authorization、Cookie、raw gateway response、完整组织树或 subject 明细。
- 未修改飞书/企微组织同步实现；未读取 API/Gateway/Insight runtime facts。

## 剩余风险

- 当前 latest publish run 来自进程内 observability，不是持久 audit store；服务通过 `runReference.storageScope=latest_in_process_observability` 明示该限制。
- `safe_retry` 只表示 Admin producer 视角可 retry，不证明 Gateway/API/Insight 授权成功。
