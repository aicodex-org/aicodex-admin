## 1. 契约与配置

- [x] 1.1 定义 admin 调用 api usage identity resolver 的请求/响应 DTO，覆盖 `requestId`、`adminSubject`、`wecomExternalId`、`wecomCorpId`、`wecomUserId`、`mappingStatus` 和 `apiUserId`。
- [x] 1.2 新增 resolver endpoint、服务间凭据、超时和批量大小配置，并同步示例配置或本地说明，确保未配置时保持现有手工映射行为。
- [x] 1.3 明确映射状态常量和错误码转换规则，区分 `MISSING`、`AMBIGUOUS`、`INVALID`、`PROVIDER_UNAVAILABLE`。

## 2. 核心映射流程

- [x] 2.1 从企业微信同步用户构造稳定身份，优先使用 `wecom_user_mapping.external_id`，兜底使用 `User.Properties.wecomCorpId + User.Wecom/wecomUserId`。
- [x] 2.2 调整单用户映射逻辑：合法手工 `aicodexApiUserId` 优先，缺失时才进入企业微信 resolver，非法手工值返回 `INVALID`。
- [x] 2.3 在 scope 计算中收集候选 admin 用户并去重，按配置批量调用 api resolver。
- [x] 2.4 将 resolver 结果回填到 current-user、SELF scope、DEPARTMENT_TREE 顶层 `apiUserIds` 和 `departments[].apiUserIds`。
- [x] 2.5 对 resolver 超时、不可达和协议错误返回 `PROVIDER_UNAVAILABLE`，不得降级为 `EMPTY` 或 `MISSING`。

## 3. 日志与安全

- [x] 3.1 为 scope 映射结果补充 provider 审计日志，并为 resolver 调用补充 resolver-client 审计日志；两类日志通过同一 `traceId` 关联，覆盖批量数量、命中数量、缺失数量、歧义数量、错误码和耗时。
- [x] 3.2 确认日志不输出服务间凭据、手机号、邮箱、access token、refresh token 或完整敏感身份原文。
- [x] 3.3 为 resolver 调用增加短超时和可测试的错误分类，避免 Insight 页面请求长期阻塞。

## 4. 测试

- [x] 4.1 为单用户映射补充单测：手工映射成功、手工映射非法、企业微信 resolver 成功、resolver 缺失、resolver 歧义、resolver 不可用。
- [x] 4.2 为部门 scope 补充单测：多个部门成员批量解析、重复成员去重、部门级 `apiUserIds` 回填、缺失成员跳过；同时验证 self scope 缺失映射仍拒绝报表 scope。
- [x] 4.3 为 current-user provider 补充测试，验证企业微信解析后的 `usageIdentity`、`mappingStatus` 和映射来源。
- [x] 4.4 运行 `go test ./controllers -count=1 -vet=off -timeout 5m`，并记录关键结果。
- [x] 4.5 运行 `openspec validate define-wecom-usage-identity-mapping --strict`。

## 5. 联调与回写

- [x] 5.1 在测试环境先确认 api resolver 可用，再启用 admin resolver 配置。
- [x] 5.2 使用企业微信同步用户完成 api 登录或等价测试绑定后，通过 Insight current-user 和 scope 验证 `mappingStatus=OK`。
- [x] 5.3 记录 `huangfanli` 或等价测试用户的联调步骤、预期日志字段和失败排查入口。
- [x] 5.4 如果实现时调整身份字段、endpoint 或错误语义，回写 `design.md` 和对应 spec。
