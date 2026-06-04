# wecom-login-profile-fields Specification

## Purpose
TBD - created by archiving change fix-wecom-login-profile-fields. Update Purpose after archive.
## Requirements
### Requirement: 企业微信扫码登录必须请求配置的授权范围
系统 SHALL 在发起企业微信扫码登录时携带 Provider 配置的授权范围。

#### Scenario: Internal Normal 登录请求敏感资料授权
- **WHEN** 企业微信 Provider 为 `Internal + Normal`，且 Provider `scopes` 为 `snsapi_privateinfo`
- **THEN** 系统生成的企业微信登录 URL MUST 包含 `scope=snsapi_privateinfo`
- **AND** 首页内嵌企业微信扫码组件初始化参数 MUST 包含 `scope=snsapi_privateinfo`

### Requirement: 企业微信登录必须映射已授权的敏感资料字段
系统 SHALL 在企业微信内部应用登录获取用户信息时，把企业微信返回的已授权敏感资料字段映射到统一的 OAuth 用户信息模型。

#### Scenario: 企业微信返回手机号
- **WHEN** 企业微信内部应用登录详情返回非空 `mobile`
- **THEN** 系统 MUST 将该值映射为 OAuth 用户信息中的 `Phone`

#### Scenario: 企业微信返回企业邮箱兜底
- **WHEN** 企业微信内部应用登录详情返回空 `email` 且非空 `biz_mail`
- **THEN** 系统 MUST 将 `biz_mail` 映射为 OAuth 用户信息中的 `Email`

#### Scenario: 授权详情缺少资料字段
- **WHEN** 企业微信内部应用登录已获取 `userid`，但授权详情缺少 `mobile`、`email`、`biz_mail`、`name` 或 `avatar`
- **THEN** 系统 MUST 尝试调用通讯录用户详情接口获取同一 `userid` 的资料
- **AND** 系统 MUST 使用通讯录详情中的非空字段补充 OAuth 用户信息
- **AND** 系统 MUST NOT 使用空值覆盖授权详情中已有的非空字段

#### Scenario: 企业微信未返回敏感字段
- **WHEN** 企业微信内部应用登录详情未返回 `mobile`、`email` 或 `biz_mail`
- **THEN** 系统 MUST 保持对应 OAuth 用户信息字段为空，不得伪造或推断手机号、邮箱

### Requirement: OAuth 登录资料回填必须补齐空的本地联系方式
系统 SHALL 在 OAuth 登录成功后，用 Provider 返回的非空联系方式补齐本地用户中仍为空的联系方式字段。

#### Scenario: 补齐空手机号
- **WHEN** 已存在本地用户的 `Phone` 为空，且企业微信 OAuth 用户信息包含非空 `Phone`
- **THEN** 系统 MUST 将该手机号写入本地用户 `Phone`
- **AND** 系统 MUST 保存对应的 `oauth_WeCom_phone` 用户属性

#### Scenario: 补齐空邮箱
- **WHEN** 已存在本地用户的 `Email` 为空，且企业微信 OAuth 用户信息包含非空 `Email`
- **THEN** 系统 MUST 将该邮箱写入本地用户 `Email`
- **AND** 系统 MUST 保存对应的 `oauth_WeCom_email` 用户属性

#### Scenario: 不覆盖已有联系方式
- **WHEN** 已存在本地用户已有非空 `Phone` 或 `Email`
- **THEN** OAuth 登录回填 MUST NOT 覆盖已有本地 `Phone` 或 `Email`
- **AND** 系统仍 MUST 保存最新的 Provider 侧 OAuth 属性用于排查和后续扩展

