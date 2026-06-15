# Verification

## 结果摘要

- 本 change 只使用本地单元测试、controller/router 编译检查和前端 Jest 测试验证。
- 未打开真实 gate，未写真实 fixture，未访问生产/类生产环境，未直连 API/Gateway/Insight 数据库。
- 测试中只使用 `gateway.example.invalid` 和 `httptest` synthetic endpoint；验证记录未写入真实 token、Cookie、私有 URL、raw Gateway response、真实组织树或真实 subject 明细。

## OpenSpec / Diff

- `openspec validate implement-admin-gateway-projection-ingestion-status-console --strict`：通过。
- `openspec archive implement-admin-gateway-projection-ingestion-status-console -y`：通过，change 已归档到 `openspec/changes/archive/2026-06-15-implement-admin-gateway-projection-ingestion-status-console/`，并同步主规格 `admin-gateway-organization-projection-publisher`。
- `openspec validate --changes --strict`：通过。
- `openspec validate --specs --strict`：通过。
- `git diff --check`：通过。

## Backend

- `cd admin && go test -p=1 -count=1 -timeout 180s ./object -run 'TestGatewayProjectionIngestionStatus|TestGatewayProjectionRunReadiness|TestGatewayProjectionManualPublish'`：通过。
- `cd admin && go test -p=1 -count=1 -timeout 180s ./controllers -run 'TestGatewayProjectionIngestionStatusErrorMessageIsSanitized'`：通过，验证新增 controller 脱敏错误消息不会泄漏私有 endpoint/token。
- `cd admin && go test -p=1 -count=1 -timeout 180s ./routers -run '^$'`：通过，验证新增 route 编译。
- `cd admin && go test -p=1 -count=1 -timeout 180s ./object -run 'TestGatewayProjectionIngestionStatus' -coverprofile ..\ingestion-status-object.cover.out`：通过。
- 新增 `gateway_organization_projection_ingestion_status.go` 按变更文件统计覆盖率 `122/140 = 87.1%`，达到 85% 门槛。

## Frontend

- `cd web-admin && yarn test --watchAll=false --runInBand --runTestsByPath src/backend/PlatformApiMappingBackend.test.js src/PlatformApiMappingPage.test.js`：退出码 0，6/6 通过相关 backend/page 测试。串行运行用于避开本机共享验证负载导致的 Jest 默认超时。

## 脱敏与边界

- Admin 只读调用 Gateway owner `ingestion-status` contract，不触发 publish，不写 Gateway facts。
- 响应 DTO 只返回 status/statusAlias、reason/failure category、freshness、lineage、aggregate subject counts、received/applied timestamps、duration 和 query summary。
- Controller 错误响应只返回稳定 failure category，不把 service/network 原始错误作为 `msg` 返回，避免网络错误中的私有 endpoint 泄漏到前端。
- 未返回 publisher endpoint/token、Authorization、Cookie、raw Gateway response、完整 projection payload、完整组织树或 subject 明细。
- 未修改 publish attempt history 存储/列表写集，未修改飞书/企微组织同步实现。

## 剩余风险

- `gatewayOrganizationProjectionStatusEndpoint` 未配置时会从 publish endpoint 派生 `/ingestion-status`；非标准 publish endpoint 需要运维显式配置 status endpoint。
- Gateway `applied` 只表示 Gateway owner ingestion 状态，不证明 Insight/API 授权查询成功。
