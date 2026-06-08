## 验证日期

2026-06-05

## 验证命令

- `cd admin && go test ./object -run GatewayProjection -count=1 -timeout 180s`
  - 结果：通过。
- `openspec validate harden-admin-gateway-projection-mapping-status --strict`
  - 结果：通过。
- `git diff --check`
  - 结果：通过，无输出

## 归档前复查

- `cd admin && go test ./object -run GatewayProjection -count=1 -timeout 180s`
  - 结果：通过。
- `openspec validate harden-admin-gateway-projection-mapping-status --strict`
  - 结果：通过。
- `openspec validate --changes --strict`
  - 结果：通过。
- `openspec validate --specs --strict`
  - 结果：通过。
- `git diff --check`
  - 结果：通过，无输出。
- 脱敏复扫
  - 结果：通过。
  - 范围：本 change OpenSpec 文件和 gateway projection 相关 Go 文件。
  - 结论：验证记录未写入真实环境 IP、私有 URL、明文凭据、邮箱或手机号；命令使用相对路径，不记录本地 clone 绝对路径或私有包路径输出。

## 覆盖点

- `PlatformUser.MappingStatus` 为空时，即使存在 confirmed `ExternalIdentity` 和可解析 `apiSubjectId`，也不会发布 gateway `ProjectedSubject`。
- 空 `MappingStatus` 被计入 `mapping_untrusted`，不会降级为 `mapping_missing` 或默认 allow。
- 原有 confirmed 映射、缺失 api subject、pending external identity、stale lifecycle 和 publisher contract 测试仍通过。

## 剩余风险

- 本 change 不做历史数据迁移；如果环境中仍有空 `PlatformUser.MappingStatus`，projection subject 数量会按 fail-closed 规则下降，需要由 admin 主模型同步或迁移任务补齐为 `CONFIRMED`。
