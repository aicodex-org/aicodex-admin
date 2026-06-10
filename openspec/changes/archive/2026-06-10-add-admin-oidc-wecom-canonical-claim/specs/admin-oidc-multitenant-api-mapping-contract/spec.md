## ADDED Requirements

### Requirement: 标准 id_token 必须可选输出企业微信 canonical identity claim
系统 SHALL 在 JWT-Standard `id_token` 中为企业微信内部成员输出已签名的 `wecom_canonical_id` claim。该 claim SHALL 使用 `wecom:<corp_id>:<userid>` 格式表达企业微信稳定身份，并且 SHALL NOT 替代 `sub`；`sub` 仍 SHALL 表示 canonical issuer 内稳定 admin subject。

#### Scenario: 企业微信内部成员输出 canonical claim
- **WHEN** 当前授权用户来自企业微信登录
- **AND** 用户资料同时具备企业微信 `corp_id` 与内部成员 `userid`
- **THEN** JWT-Standard `id_token` SHALL 包含 `wecom_canonical_id`
- **AND** `wecom_canonical_id` SHALL 等于 `wecom:<corp_id>:<userid>`
- **AND** `sub` SHALL 继续等于稳定 admin subject
- **AND** `organization` SHALL 继续表达当前 platform organization

#### Scenario: 企业微信身份字段不完整时不输出 canonical claim
- **WHEN** 当前授权用户来自企业微信登录
- **AND** 用户资料缺少 `corp_id` 或内部成员 `userid`
- **THEN** JWT-Standard `id_token` SHALL NOT 包含 `wecom_canonical_id`
- **AND** 系统 SHALL NOT 使用手机号、邮箱、姓名、昵称、username、UserInfo 或其它弱资料字段拼接该 claim
- **AND** `sub` 与 `organization` SHALL 保持正常输出

#### Scenario: 非企业微信登录不输出 canonical claim
- **WHEN** 当前授权用户不是企业微信登录身份
- **THEN** JWT-Standard `id_token` SHALL NOT 包含 `wecom_canonical_id`
- **AND** 系统 SHALL NOT 基于 email、phone、nickname、username 或 UserInfo 推断企业微信身份

#### Scenario: 外部联系人暂不输出内部成员 canonical claim
- **WHEN** 当前授权身份是企业微信外部联系人或仅具备 `external_userid`
- **THEN** JWT-Standard `id_token` SHALL NOT 输出 `wecom_canonical_id`
- **AND** 系统 SHALL NOT 将 `external_userid` 当作内部成员 `userid`
- **AND** 后续如支持外部联系人 SHALL 使用独立 claim 格式，例如 `wecom_external:<corp_id>:<external_userid>`

### Requirement: Discovery 必须声明企业微信 canonical identity claim
系统 SHALL 在 OIDC discovery `claims_supported` 中声明 `wecom_canonical_id`，使下游能够发现该已签名 id_token claim。该声明 SHALL NOT 改变 `sub`、`organization` 或 UserInfo 的既有语义。

#### Scenario: discovery 返回 supported claim
- **WHEN** OIDC client 获取 discovery metadata
- **THEN** `claims_supported` SHALL 包含 `wecom_canonical_id`
- **AND** `sub` SHALL 继续表示稳定 admin subject
- **AND** UserInfo、email、username、nickname、phone 等字段 SHALL NOT 被声明为该 canonical identity claim 的替代来源
