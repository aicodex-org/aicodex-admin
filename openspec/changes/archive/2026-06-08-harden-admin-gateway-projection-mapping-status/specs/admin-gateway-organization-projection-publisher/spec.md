## ADDED Requirements

### Requirement: PlatformUser mappingStatus 必须显式 confirmed
系统 MUST 仅在 `PlatformUser.MappingStatus=CONFIRMED` 时，将平台用户纳入 gateway organization projection 的候选主体。空值、未知值、待确认、重复、冲突或禁用状态 MUST fail closed，并记录 `mapping_untrusted` 或等价的跳过原因。

#### Scenario: 空 PlatformUser mappingStatus 不发布 subject
- **WHEN** PlatformUser lifecycle 为 `ACTIVE`，且存在 confirmed ExternalIdentity 可解析出 `apiSubjectId`
- **AND** PlatformUser 的 `MappingStatus` 为空
- **THEN** builder MUST NOT 发布该用户为 gateway `ProjectedSubject`
- **AND** builder MUST 记录 `mapping_untrusted`

#### Scenario: confirmed PlatformUser mappingStatus 仍需确定 apiSubjectId
- **WHEN** PlatformUser 的 `MappingStatus=CONFIRMED`
- **AND** 缺少确定的 `apiSubjectId`
- **THEN** builder MUST NOT 猜测 gateway subject
- **AND** builder MUST 记录 `mapping_missing`
