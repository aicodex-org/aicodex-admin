# admin-application-identity-source-bindings Specification

## Purpose
定义 Application Provider 身份源绑定的目标组织解析、外部身份匹配、默认绑定规则、UI 呈现和敏感数据边界，并确保缺失或退役配置统一 fail-closed。
## Requirements
### Requirement: Application Provider identity source bindings
Admin SHALL 允许 Application 将每个受支持的登录 Provider 绑定到目标组织，用于 Provider 登录期间的用户查找；Admin SHALL NOT 允许新增或重新激活已退役的 Web3 钱包认证 Provider binding。

#### Scenario: Provider 使用显式目标组织
- **WHEN** Application 存在受支持且配置了 `targetOrganization=feishu-test` 的 Provider binding
- **AND** 用户通过该 Provider 登录
- **THEN** Admin MUST 在 `feishu-test` 中查找外部身份
- **AND** Admin MUST NOT 使用 Application 默认组织执行该 Provider 用户查找

#### Scenario: Provider 要求显式目标组织
- **WHEN** 受支持的 Application Provider binding 未定义 `targetOrganization`
- **AND** 用户通过该 Provider 登录
- **THEN** Admin MUST 使用可诊断的配置错误 fail-closed
- **AND** Admin MUST NOT 把 `application.organization` 用作 Provider 登录组织

#### Scenario: 目标组织不可用
- **WHEN** 受支持的 Provider binding 引用了空、缺失或未授权的目标组织
- **THEN** Admin MUST 使用可诊断的配置错误 fail-closed
- **AND** Admin MUST NOT 在其它组织中搜索匹配用户

#### Scenario: 新增或重新激活退役 Web3 binding
- **WHEN** Application 尝试新增被分类为退役 Web3 钱包认证的 Provider，或保持/修改任一历史激活标志为 true
- **THEN** Admin MUST 拒绝保存并返回 `PROVIDER_WEB3_WALLET_AUTH_RETIRED`
- **AND** Admin MUST 使用服务端持有的数据分类 Provider，不得信任请求内嵌的 category/type

#### Scenario: 禁用或移除退役 Web3 binding
- **WHEN** Application 移除历史退役 Web3 binding，或将全部 login/signup/prompt 激活标志设为 false
- **THEN** Admin MUST 允许保存
- **AND** Admin MUST 保持既有 DTO/schema 兼容和 `canUnlink` 权限语义，不得创建或改写钱包凭据

### Requirement: Provider-specific external identity matching
Admin SHALL apply existing Provider-specific matching rules inside the resolved Provider login organization.

#### Scenario: Lark identifiers use target organization
- **WHEN** a Lark/Feishu Provider login returns `user_id`, `open_id`, or `union_id`
- **AND** the Provider binding targets `feishu-test`
- **THEN** Admin MUST call Lark compatible matching within `feishu-test`
- **AND** Admin MUST continue to reject multiple identifier matches across different local users

#### Scenario: WeCom identifiers use target organization
- **WHEN** a WeCom Provider login returns a WeCom user identifier
- **AND** the Provider binding targets `wecom-wwe7e01c69367e67bf`
- **THEN** Admin MUST match `User.Wecom` within `wecom-wwe7e01c69367e67bf`

#### Scenario: 钉钉标识使用目标组织
- **WHEN** 钉钉 Provider 登录返回 `user_id`、`open_id` 或 `union_id`
- **AND** Provider binding 指向钉钉组织同步目标，例如 `dingtalk-test`
- **THEN** Admin MUST 在该目标组织内按钉钉兼容标识匹配本地用户
- **AND** Admin MUST 优先使用通讯录同步写入的 `user_id`，并继续拒绝多个标识命中不同本地用户的冲突情况

### Requirement: Identity source bindings are safe by default
Admin SHALL treat identity source bindings as configuration metadata and SHALL NOT expose secrets, raw upstream payloads, or cross-organization user details.

#### Scenario: Binding metadata is returned to the UI
- **WHEN** the Application edit API returns Provider bindings
- **THEN** each binding MAY include the target organization name
- **AND** the response MUST NOT include Provider secrets, tokens, raw Feishu/WeCom/DingTalk payloads, phone numbers, or emails because of this binding feature

#### Scenario: Binding does not imply automatic registration
- **WHEN** a Provider target organization is configured
- **AND** no matching user exists in that organization
- **THEN** Admin MUST continue to respect Application and Provider `CanSignUp`/`EnableSignUp` rules
- **AND** Admin MUST NOT silently create users in another organization

### Requirement: Provider fallback binding defaults to email only
Admin SHALL use email as the only runtime default fallback binding rule when an Application Provider binding has no explicit `bindingRule`.

#### Scenario: Unconfigured binding rule matches by non-empty email
- **WHEN** a Provider sign-in has resolved the Provider login organization
- **AND** Provider-specific external identity matching does not find a user
- **AND** the Application Provider binding has no explicit `bindingRule`
- **AND** the upstream Provider returns a non-empty email matching an existing user in the resolved Provider login organization
- **THEN** Admin MUST bind or sign in as that existing user by email
- **AND** Admin MUST NOT write the default rule back into the Application Provider binding

#### Scenario: Unconfigured binding rule does not match by phone or name
- **WHEN** a Provider sign-in has resolved the Provider login organization
- **AND** Provider-specific external identity matching does not find a user
- **AND** the Application Provider binding has no explicit `bindingRule`
- **AND** the upstream Provider phone or username matches an existing user but email is empty, different, or absent
- **THEN** Admin MUST NOT bind or sign in as that existing user by phone or username

#### Scenario: Blank field values are ignored
- **WHEN** Provider fallback binding evaluates a configured or default binding rule
- **AND** the upstream Provider value for that rule is empty after trimming whitespace
- **THEN** Admin MUST skip that rule
- **AND** Admin MUST NOT query for an existing user using an empty email, phone, or username value

#### Scenario: Explicit binding rules remain available
- **WHEN** an Application Provider binding explicitly configures `bindingRule`
- **THEN** Admin MUST evaluate the configured non-empty field rules in configured order
- **AND** Admin MUST continue to allow explicit `Phone` and `Name` rules without adding them to the unconfigured default rule set

### Requirement: Provider binding UI shows effective default binding rule
Admin SHALL show the effective runtime default binding rule in the Application Provider binding UI when `bindingRule` is not configured.

#### Scenario: Binding rule is unconfigured
- **WHEN** an administrator edits an Application Provider binding
- **AND** `bindingRule` is missing or unset
- **THEN** the UI MUST show that runtime fallback matching defaults to email
- **AND** saving the Application MUST NOT persist `Email` solely because this default hint was displayed

#### Scenario: Binding rule is explicitly configured
- **WHEN** an administrator edits an Application Provider binding
- **AND** `bindingRule` contains one or more explicit rules
- **THEN** the UI MUST show the configured rules as the effective matching rules
- **AND** the UI MUST NOT describe phone or username as part of the unconfigured runtime default
