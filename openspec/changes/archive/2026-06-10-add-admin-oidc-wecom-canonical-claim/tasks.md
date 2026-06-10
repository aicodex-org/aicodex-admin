## 1. OpenSpec 契约

- [x] 1.1 创建 proposal、design、delta spec 和任务清单，明确 `sub` 不变、`wecom_canonical_id` 仅来自签名 id_token。
- [x] 1.2 更新 synthetic fixture / 文档，使用 `example.invalid`、`org-alpha`、`corp-alpha`、`alice` 等脱敏数据说明新 claim。

## 2. 后端实现与测试

- [x] 2.1 先补充标准 token claims 行为测试，覆盖企业微信完整身份、缺字段、非企业微信登录。
- [x] 2.2 先补充 discovery `claims_supported` 测试，覆盖 `wecom_canonical_id`。
- [x] 2.3 在 JWT-Standard claims 生成路径实现 `wecom_canonical_id`，不依赖 JWT-Custom 配置。
- [x] 2.4 更新 discovery `claims_supported`。

## 3. 验证

- [x] 3.1 运行相关 Go 单测。
- [x] 3.2 运行 `openspec validate add-admin-oidc-wecom-canonical-claim --strict`。
- [x] 3.3 运行 `openspec validate --specs --strict`。
- [x] 3.4 运行 `git diff --check`。
- [x] 3.5 若改动实施代码，记录受影响实施代码单测覆盖率是否达到 85%。
