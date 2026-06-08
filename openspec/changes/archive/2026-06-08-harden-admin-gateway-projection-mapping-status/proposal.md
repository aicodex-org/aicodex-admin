## Why

`define-admin-organization-master-model` 已经把 gateway organization projection 定义为 api runtime authorization 的输入边界。当前 projection builder 对 `PlatformUser.MappingStatus` 的历史空值仍保持兼容，即使 `ExternalIdentity` 已确认，也可能把一个平台用户发布为 gateway 授权主体。

这会削弱 fail-closed 语义：空 `MappingStatus` 可能来自历史数据、迁移缺口或脏数据，不应被视为已确认映射。

## What Changes

- 收紧 gateway projection builder：`PlatformUser.MappingStatus` 只有显式 `CONFIRMED` 时才允许进入 projection。
- 空值、待确认、冲突、重复、禁用等状态统一按 `mapping_untrusted` 跳过。
- 补充聚焦测试，覆盖 `PlatformUser.MappingStatus` 为空但存在 confirmed `ExternalIdentity` 的场景。
- 补充 OpenSpec delta，固定 admin 到 gateway projection 的 fail-closed 映射门槛。

## Capabilities

### Modified Capabilities

- `admin-gateway-organization-projection-publisher`

## Impact

- 主要影响 `admin/object/gateway_organization_projection.go` 和对应单元测试。
- 预期会让历史空 `MappingStatus` 的平台用户不再进入 gateway projection；这类数据需要先由 admin 主模型或迁移任务补齐为 `CONFIRMED`。
- 不改变 `ExternalIdentity` 解析、projection publisher HTTP contract、gateway ingestion endpoint 或 insight report scope。
