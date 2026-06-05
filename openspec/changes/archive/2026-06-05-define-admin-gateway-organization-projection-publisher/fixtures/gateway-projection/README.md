# Gateway Projection Fixtures

这些 fixture 是 `aicodex-admin` 作为 gateway organization projection producer 的 contract 锚点，供 `aicodex-api / ai-gateway` ingestion contract test 使用。

- `projection-batch.json`: 完整批次示例，覆盖部门、角色、岗位、lifecycle、lineage、freshness 和多个 subject。
- `projection-batch-minimal.json`: 最小可接收批次示例，只包含一个 active user subject。

协作约束：

- fixture 表达的是 gateway runtime authorization projection 输入，不是 Insight report scope。
- `lineage.sourceService` 固定为 `aicodex-admin`。
- 顶层 `orgVersion` 和 subject `orgVersion` 是 gateway 专用 int64 projection version。
- `lineage.sourceVersion` 是 admin source snapshot 字符串版本，可使用 `orgv-*`。
- api 如果发现字段不足，先提出 contract gap；admin 不私自发明 api 字段。
- fixture 不包含真实环境 IP、私有 URL、token、Cookie、密码、手机号、邮箱或客户真实数据。
