## ADDED Requirements

### Requirement: queryable scope 必须隔离非必要成员的 resolver 缺失

Admin provider MUST 在 `ALL_COMPANY`、`DEPARTMENT_TREE` 或 `ORGANIZATION` queryable scope 中隔离非必要成员的用量身份解析失败；当 resolver 对这些成员不可用且只能确认 `mappingStatus=MISSING` 时，provider MUST 排除未确定成员并保留已确定映射成员，MUST NOT 猜测 `apiUserId` 或扩大授权范围。

#### Scenario: 聚合 scope 跳过 unavailable 且 missing 的非必要成员

- **WHEN** 当前调用人的用量映射确定，queryable scope 内至少一个成员存在 confirmed 正整数 API user id，且其他非必要成员因 resolver unavailable 返回 `mappingStatus=MISSING`
- **THEN** provider MUST 返回成功的聚合 scope，并只在 `apiUserIds` 中包含已确定映射成员
- **THEN** provider MUST NOT 因这些非必要成员返回 `PROVIDER_UNAVAILABLE`

#### Scenario: 精确 scope 的 resolver unavailable 继续 fail closed

- **WHEN** `SELF` 或显式 `CUSTOM_USERS` scope 的必要用户因 resolver unavailable 返回 `mappingStatus=MISSING`
- **THEN** provider MUST 返回 `AUTHORIZATION_FAILED` 或 `PROVIDER_UNAVAILABLE`
- **THEN** provider MUST NOT 返回成功 scope 或猜测 `apiUserId`

#### Scenario: 非缺失型不确定映射不得被跳过

- **WHEN** queryable scope 成员的映射为 `INVALID`、`AMBIGUOUS` 或其他不能归类为 unavailable+missing 的不可信状态
- **THEN** provider MUST 保持 fail-closed
- **THEN** provider MUST NOT 把该状态转换为普通缺失成员或扩大可查询范围
