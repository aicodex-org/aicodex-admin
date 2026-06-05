## 1. 提案和契约确认

- [x] 1.1 与 api change `define-gateway-organization-authorization-projection` 核对 `ProjectionBatch` / `ProjectedSubject` DTO、错误码、鉴权和 idempotency 语义
- [x] 1.2 运行 `openspec validate define-admin-gateway-organization-projection-publisher --strict`
- [x] 1.3 使用 `openspec-pre-implementation-review` 审查 proposal、design、specs 和 tasks，修复提案级阻断问题
- [x] 1.4 与 api agent 对齐 fixture 是否足够作为 ingestion contract test 输入；如字段不足，记录 contract gap

## 2. Gateway projection fixture

- [x] 2.1 新增 `fixtures/gateway-projection/README.md`，说明 fixture 是 gateway projection contract，不是 Insight report scope
- [x] 2.2 新增 `fixtures/gateway-projection/projection-batch.json`，覆盖完整 subject、departmentIds、roleIds、positionIds、lifecycle、lineage 和 freshness
- [x] 2.3 新增 `fixtures/gateway-projection/projection-batch-minimal.json`，覆盖最小可接收 batch
- [x] 2.4 增加 fixture 脱敏检查，确认不包含真实环境 IP、私有 URL、token、Cookie、密码、手机号、个人邮箱或客户真实数据

## 3. Projection builder

- [x] 3.1 定义 admin 内部 `GatewayProjectionBatch` / `GatewayProjectedSubject` DTO 或等价结构，JSON 字段与 api ingestion contract 对齐
- [x] 3.2 实现从 PlatformUser、PlatformDepartment、PlatformMembership、ExternalIdentity、SourceConnection 和 OrgSyncBatch 构建 projection batch
- [x] 3.3 实现 gateway int64 `orgVersion` 生成，并将 admin 字符串 orgVersion 写入 `lineage.sourceVersion`
- [x] 3.4 实现 `projectionBatchId`、subject `projectionVersion` 和 `lineage.digest` 的稳定生成
- [x] 3.5 实现 lifecycle 大小写和 unknown/stale fail-closed 映射
- [x] 3.6 实现 `apiSubjectId` 解析，只允许明确手工映射或已确认 resolver 结果，禁止使用弱身份和 Insight scope 输出
- [x] 3.7 实现 skipped summary，记录 mapping missing、mapping untrusted、lifecycle invalid 和 source data invalid 等原因

## 4. Projection publisher client

- [x] 4.1 增加 projection endpoint、token、caller、timeout、freshness TTL 和 enable 开关配置读取
- [x] 4.2 实现服务间 HTTP client，发送 `Authorization: Bearer <projection-token>`、`caller=aicodex-admin` 和 `traceId`
- [x] 4.3 实现响应解析，将 `accepted=true` 或 `idempotent=true` 判定为成功
- [x] 4.4 实现错误分类：鉴权/400 contract 错误不自动重试，网络/5xx 可有限幂等重试
- [x] 4.5 增加脱敏审计日志，不输出 token、完整 endpoint、Cookie、手机号、邮箱或原始敏感响应

## 5. Trigger 和脚本

- [x] 5.1 提供后端 service 方法用于构建并推送指定 organization 的 projection batch
- [x] 5.2 在 WeCom 同步成功后增加可配置触发点；默认可关闭，避免未配置 gateway 时影响现有同步
- [x] 5.3 新增可重复 smoke 脚本，支持用环境变量或本机 secrets 提供 endpoint/token，输出脱敏 JSON 摘要
- [x] 5.4 smoke 脚本覆盖 builder 输出校验、HTTP push、idempotent replay 和典型错误分类

## 6. 测试和验证

- [x] 6.1 单测覆盖 batch 字段映射、admin string orgVersion 与 gateway int64 orgVersion 分离
- [x] 6.2 单测覆盖 apiSubjectId 缺失、ExternalIdentity 不可信、lifecycle unknown/stale 不映射 active
- [x] 6.3 单测覆盖 digest、projectionVersion、departmentIds/roleIds/positionIds 排序去重
- [x] 6.4 单测覆盖 publisher 成功、idempotent、401/403、400 contract 错误、5xx/timeout retry
- [x] 6.5 运行 `go test ./object` 或聚焦 projection builder/client 测试
- [x] 6.6 运行 `openspec validate define-admin-gateway-organization-projection-publisher --strict`
- [x] 6.7 运行 `git diff --check`
- [x] 6.8 更新 `verification.md`，只记录脱敏命令、结果、错误码、accepted/idempotent 和剩余风险
