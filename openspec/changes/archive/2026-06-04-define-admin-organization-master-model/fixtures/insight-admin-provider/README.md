# Insight Admin Provider Fixtures

这些 fixture 是 `aicodex-admin` 当前 change 冻结的 provider contract 锚点，供 `aicodex-api` 和 `aicodex-insight` 的 contract test 使用。

- `current-user.json`: `GET /api/admin-provider/insight/v1/current-user`
- `scope-department-tree.json`: `GET /api/admin-provider/insight/v1/current-user/scope`
- `organization-tree.json`: `GET /api/admin-provider/insight/v1/current-user/organization-tree`

协作约束：

- api/insight 如果发现字段不足，先提出 contract gap，不私自扩展字段。
- admin 修改字段、错误码、`version/freshness/mappingStatus` 语义时，需要同步 api 和 insight。
- 这些 scope fixture 只用于 insight 报表范围，不是 gateway runtime authorization fact。
