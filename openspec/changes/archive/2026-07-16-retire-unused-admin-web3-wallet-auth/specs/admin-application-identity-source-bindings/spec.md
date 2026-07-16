## MODIFIED Requirements

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
