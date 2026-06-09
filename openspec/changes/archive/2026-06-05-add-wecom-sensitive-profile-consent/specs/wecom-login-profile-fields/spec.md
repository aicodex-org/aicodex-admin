## ADDED Requirements

### Requirement: 企业微信主登录必须支持 OAuth2 敏感授权二维码

系统 SHALL 为企业微信内部应用登录提供 OAuth2 `snsapi_privateinfo` 敏感授权二维码主链路。

#### Scenario: 登录页创建敏感授权登录意图

- **WHEN** 登录页当前应用配置了可用的企业微信 `Internal + Normal` Provider
- **AND** 该 Provider 具备 Corp ID、自建应用 Secret 和 Agent ID
- **THEN** 系统 MUST 创建一次性登录意图
- **AND** 系统 MUST 返回企业微信 OAuth2 授权 URL
- **AND** 授权 URL MUST 使用 `scope=snsapi_privateinfo`
- **AND** 授权 URL MUST 使用 `/api/wecom-profile-consent/callback` 作为回调地址

#### Scenario: 登录意图必须保留既有登录上下文

- **WHEN** 当前登录页承载的是普通登录、OAuth / OIDC 授权或 CAS 等既有入口
- **THEN** 系统 MUST 在登录意图中保存完成现有登录语义所需的非敏感上下文
- **AND** 系统 MUST NOT 因切换企业微信主入口而丢失既有 `responseType`、`redirectUri`、`state`、`nonce`、PKCE 或 CAS 服务参数语义

#### Scenario: 公开创建登录意图必须防止滥用

- **WHEN** 匿名客户端频繁创建企业微信登录意图
- **THEN** 系统 MUST 按客户端、应用和 Provider 维度执行短窗口限制
- **AND** 系统 SHOULD 复用或替换同一客户端仍未过期的待授权意图
- **AND** 系统 MUST NOT 无限制创建新的待授权意图

#### Scenario: 登录页展示二维码而不是 PC Web 组件作为主路径

- **WHEN** 登录意图创建成功
- **THEN** 前端 MUST 将 OAuth2 授权 URL 渲染为二维码
- **AND** 前端 MUST 提示用户使用企业微信客户端扫码并同意授权
- **AND** 现有 PC Web 企业微信登录组件 MUST 只作为兼容 fallback
- **AND** 前端进入兼容 fallback 后 MUST 停止当前 OAuth2 登录意图轮询，并忽略仍在飞行中的意图创建结果

### Requirement: 企业微信敏感授权回调必须校验一次性意图

系统 SHALL 在企业微信 OAuth2 回调时校验意图、状态和边界后再消费授权码。

#### Scenario: 回调 state 匹配有效意图

- **WHEN** 企业微信回调携带 `code` 和 `state`
- **AND** `state` 匹配未过期、未消费的登录意图
- **THEN** 系统 MUST 使用对应 Provider 换取企业微信访问用户身份
- **AND** 系统 MUST 要求企业微信访问用户身份响应包含 `user_ticket` 后才接受本次敏感授权回调
- **AND** 系统 MUST 尝试获取授权后的手机号、邮箱、企业邮箱和头像等敏感资料
- **AND** 系统 MUST 完成本地用户匹配、注册或绑定限制判断、必要的新用户创建和 OAuth 资料回填
- **AND** 系统 MUST 将意图状态更新为可由 PC 端完成登录的状态

#### Scenario: 回调 state 无效或意图过期

- **WHEN** 企业微信回调携带的 `state` 不存在、不匹配、已消费或已过期
- **THEN** 系统 MUST 拒绝本次回调
- **AND** 系统 MUST NOT 换取或保存用户敏感资料
- **AND** 系统 MUST 返回不包含 Secret、授权码、token 或敏感字段的错误提示

### Requirement: PC 端必须通过登录意图完成本地登录

系统 SHALL 由 PC 登录页轮询并消费已授权的登录意图，以完成本地登录或继续现有 MFA 流程。

#### Scenario: 无需 MFA 时 PC 端完成已授权登录

- **WHEN** 手机端授权回调已经成功解析本地用户
- **AND** 该用户按现有登录策略不需要继续 MFA 校验
- **AND** PC 端携带正确 `pollToken` 请求完成登录
- **THEN** 系统 MUST 复用现有登录策略完成本地登录
- **AND** 系统 MUST 写入 PC 浏览器 session
- **AND** 系统 MUST 将该登录意图标记为已完成
- **AND** 系统 MUST 通过数据库原子状态迁移消费该意图

#### Scenario: 需要 MFA 时 PC 端进入 MFA 待完成状态

- **WHEN** 手机端授权回调已经成功解析本地用户
- **AND** 该用户按现有登录策略仍需要 MFA 校验
- **AND** PC 端携带正确 `pollToken` 请求完成登录
- **THEN** 系统 MUST 返回现有 MFA 继续交互所需响应
- **AND** 系统 MUST 将该登录意图原子推进到 `mfa_pending`
- **AND** 系统 MUST NOT 在 MFA 通过前写入最终 PC 登录 session

#### Scenario: MFA 通过后完成登录意图

- **WHEN** 登录意图处于 `mfa_pending`
- **AND** PC 端继续携带 `pollToken` 和现有 MFA 参数完成校验
- **THEN** 系统 MUST 写入 PC 浏览器 session
- **AND** 系统 MUST 将该登录意图原子推进到 `completed`

#### Scenario: 仅要求首次启用 MFA 时继续沿用现有 RequiredMfa 语义

- **WHEN** 手机端授权回调已经成功解析本地用户
- **AND** 该用户按现有登录策略需要先完成强制 MFA 启用
- **AND** PC 端携带正确 `pollToken` 请求完成登录
- **THEN** 系统 MUST 返回现有 `RequiredMfa` 响应
- **AND** 系统 MUST 复用当前账号页继续启用 MFA 的行为
- **AND** 系统 MUST 将登录意图推进到 `completed`

#### Scenario: pollToken 不得通过 URL 传递

- **WHEN** PC 端轮询或完成登录意图
- **THEN** 前端 MUST 通过请求头或请求体传递 `pollToken`
- **AND** 前端 MUST NOT 把 `pollToken` 放入 URL query、hash 或跳转地址

#### Scenario: 登录意图只能消费一次

- **WHEN** 登录意图已经完成、失败、过期或被消费
- **THEN** 后续 complete 请求 MUST 被拒绝
- **AND** 系统 MUST NOT 重复建立 session

#### Scenario: PC complete 必须保持既有授权响应语义

- **WHEN** 登录意图保存了 OAuth / OIDC / CAS 等既有登录上下文
- **AND** PC 端完成企业微信授权后的 complete 请求成功
- **THEN** 系统 MUST 继续返回与现有登录链路一致的 code、token、CAS 跳转或普通登录结果
- **AND** 系统 MUST NOT 退化为仅依赖 `returnUrl` 的普通页面跳转

### Requirement: 用户必须能主动同步企业微信敏感资料

系统 SHALL 为已登录用户提供主动发起企业微信敏感资料同步的入口。

#### Scenario: 当前用户创建资料同步意图

- **WHEN** 已登录用户点击同步企业微信资料
- **AND** 当前用户已有可验证的企业微信身份
- **AND** 当前用户的企业微信身份来源收敛为唯一 `corp_id + userid`
- **THEN** 系统 MUST 创建一次性资料同步意图
- **AND** 系统 MUST 返回企业微信 OAuth2 `snsapi_privateinfo` 授权二维码 URL

#### Scenario: 当前用户企业微信身份来源冲突

- **WHEN** 当前用户的多个企业微信身份来源解析出不同的 `corp_id + userid`
- **THEN** 系统 MUST 拒绝创建资料同步意图
- **AND** 系统 MUST 提示联系管理员修正绑定关系

#### Scenario: 同步授权用户与当前用户匹配

- **WHEN** 企业微信授权回调返回的 `corp_id + userid` 与当前用户绑定身份一致
- **THEN** 系统 MUST 保存 Provider 侧最新 OAuth 属性
- **AND** 系统 MUST 在本地邮箱、手机号为空时补齐
- **AND** 系统 MAY 按现有头像策略更新头像

#### Scenario: 同步授权用户与当前用户不匹配

- **WHEN** 企业微信授权回调返回的 `corp_id + userid` 与当前用户绑定身份不一致
- **THEN** 系统 MUST 拒绝同步
- **AND** 系统 MUST NOT 更新当前用户邮箱、手机号、头像或 OAuth 属性

### Requirement: 敏感资料回填必须保持安全边界

系统 SHALL 在敏感资料授权登录和主动同步中延续现有安全回填策略。

#### Scenario: 不覆盖已有联系方式

- **WHEN** 企业微信授权返回非空手机号或邮箱
- **AND** 本地用户已有非空 `Phone` 或 `Email`
- **THEN** 系统 MUST NOT 覆盖已有本地 `Phone` 或 `Email`
- **AND** 系统 MUST 保存最新 Provider 侧 OAuth 属性用于排查

#### Scenario: 企业微信未返回敏感字段

- **WHEN** 企业微信敏感授权仍未返回手机号、邮箱、企业邮箱或头像
- **THEN** 系统 MUST 保持对应本地字段不变
- **AND** 系统 MUST NOT 伪造或推断敏感资料
