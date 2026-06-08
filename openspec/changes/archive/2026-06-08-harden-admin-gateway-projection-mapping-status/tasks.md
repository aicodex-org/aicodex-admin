## 1. Implementation

- [x] 1.1 收紧 gateway projection builder 对 `PlatformUser.MappingStatus` 的信任判断。
- [x] 1.2 补充空 `PlatformUser.MappingStatus` 不能发布 gateway subject 的单元测试。

## 2. Verification

- [x] 2.1 运行 `go test ./object -run GatewayProjection -count=1 -timeout 180s`。
- [x] 2.2 运行 `openspec validate harden-admin-gateway-projection-mapping-status --strict`。
- [x] 2.3 运行 `git diff --check`。
- [x] 2.4 记录验证结果到 `verification.md`。
