## MODIFIED Requirements

### Requirement: 应用接入状态与配置完整度
应用接入中心 SHALL 基于现有只读 Application 数据展示当前列表视图的接入完整度、启用/停用、回调地址配置、授权范围、Provider 绑定、Provider 身份源目标组织和 OAuth/OIDC client 配置状态，不得展示 client secret、token 或其它敏感字段原值。

#### Scenario: 应用配置完整
- **WHEN** Application 列表中存在启用应用
- **AND** 该应用具备 `clientId`、回调地址、授权范围和 Provider 绑定
- **AND** 启用的企业身份 Provider 具备明确目标组织或可解释的默认组织 fallback
- **THEN** 应用接入中心将该应用计入“接入完整”或“低风险”摘要
- **AND** 页面提供进入应用编辑、API 映射和审计记录的入口

#### Scenario: 应用配置不完整
- **WHEN** Application 缺少回调地址、授权范围、Provider 绑定、Provider 身份源目标组织或 `clientId`
- **THEN** 应用接入中心 SHALL 展示对应待补全风险摘要
- **AND** 页面 SHALL 提供进入应用编辑或相关配置页的入口

#### Scenario: 应用停用或禁止登录
- **WHEN** Application 标记为停用或 `disableSignin` 为 true
- **THEN** 应用接入中心 SHALL 将其展示为停用或需核对状态
- **AND** 不得触发任何启用、授权或回调执行动作

#### Scenario: Application 数据加载中或为空
- **WHEN** Application 列表正在加载或返回空数组
- **THEN** 应用接入中心 SHALL 展示加载、待接入或空态提示
- **AND** 页面仍保留进入新增应用、API 映射、Provider 和审计记录的入口

## ADDED Requirements

### Requirement: Provider 身份源绑定配置
应用编辑页 SHALL 允许管理员为每个启用的登录 Provider 配置目标组织，用于决定该 Provider 登录时在哪个组织中匹配用户。

#### Scenario: 管理员配置飞书目标组织
- **WHEN** 管理员在同一个 OIDC Application 中启用 Lark/Feishu Provider
- **THEN** 页面 SHALL 允许将该 Provider 的目标组织设置为飞书组织同步目标，例如 `feishu-test`
- **AND** 页面 SHALL 说明 Application 组织仍是应用归属/默认组织，不等同于每个 Provider 的登录查找组织

#### Scenario: 未配置目标组织
- **WHEN** Provider binding 没有设置目标组织
- **THEN** 页面 SHALL 展示“使用应用默认组织”或等价说明
- **AND** 保存后 SHALL 保持空值，不强行写入当前默认组织
