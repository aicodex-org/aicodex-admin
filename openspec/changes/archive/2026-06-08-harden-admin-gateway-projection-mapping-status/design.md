## Context

Gateway projection 是 api runtime authorization 的输入，不是报表 scope，也不是临时展示数据。它必须只消费 admin 已确认的组织主模型事实。

现有 builder 同时检查两类映射：

- `PlatformUser.MappingStatus`：平台主用户自身的映射状态。
- `ExternalIdentity.MappingStatus` 或 admin 用户显式属性：稳定主体到 `apiSubjectId` 的映射来源。

之前 `PlatformUser.MappingStatus` 空值被视为兼容状态，风险是历史或脏数据在存在 confirmed `ExternalIdentity` 时仍被发布。

## Decision

将 `gatewayProjectionMappingTrusted` 收紧为只接受 `CONFIRMED`。

这样 builder 的规则变为：

- `PlatformUser.MappingStatus != CONFIRMED`：直接跳过，summary 记录 `mapping_untrusted`。
- `PlatformUser.MappingStatus == CONFIRMED` 但缺少确定 `apiSubjectId`：记录 `mapping_missing`。
- `PlatformUser.MappingStatus == CONFIRMED` 但 `ExternalIdentity` 冲突或不可信：记录 `mapping_untrusted`。

## Non-Goals

- 不在本 change 内做历史数据迁移或自动补齐。
- 不修改 api gateway projection ingestion contract。
- 不让 insight report scope 参与 gateway subject 映射。

## Rollout Notes

如果测试环境出现 projection subject 数量下降，应优先检查 admin 平台用户的 `MappingStatus` 是否仍为空。修复方向是补齐 admin 主模型映射状态，而不是恢复 projection builder 的空值兼容。
