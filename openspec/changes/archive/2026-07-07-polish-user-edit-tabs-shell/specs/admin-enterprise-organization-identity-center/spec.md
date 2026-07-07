## ADDED Requirements

### Requirement: 用户编辑页 Tabs 与固定操作栏

Admin 用户编辑页 SHALL 使用与组织、群组编辑页一致的单一编辑壳承载用户资料编辑，使管理员能够稳定切换固定业务分区、返回、取消、保存或保存并返回，同时保持组织账号配置驱动的字段可见性和权限语义。

#### Scenario: 用户字段按固定业务 Tabs 分组
- **WHEN** 管理员打开用户编辑页
- **THEN** 页面 SHALL 使用固定业务 tabs 呈现用户编辑正文，例如基础、身份认证、权限管理、安全、第三方登录和记录
- **AND** 页面 SHALL 根据当前用户所属组织的 `accountItems` 只决定各业务 tab 内字段是否显示、是否可编辑和如何校验
- **AND** 页面 SHALL NOT 将 `accountItems.tab` 作为用户编辑页顶层 tab 来源
- **AND** 只有一个可见业务分区时 MAY 隐藏 tab bar 并直接展示该分区字段
- **AND** 页面 SHALL 使用 URL hash 恢复当前固定业务 tab key

#### Scenario: 返回路径和底部动作保持可达
- **WHEN** 管理员在用户编辑页滚动或切换字段分组
- **THEN** 页面顶部 SHALL 提供返回入口、组织账号路径和用户编辑标题
- **AND** 页面底部 SHALL 保留固定操作栏
- **AND** 操作栏按钮顺序 SHALL 为 `取消`、`保存`、`保存并返回`
- **AND** 页面 SHALL NOT 同时保留旧 Card 标题内保存按钮和正文底部重复保存按钮

#### Scenario: 保存语义保持兼容
- **WHEN** 管理员点击 `保存`
- **THEN** 页面 SHALL 使用现有 `UserBackend.updateUser` 保存全部字段分组中的用户资料并停留在当前用户编辑页
- **AND** 保存成功后 SHALL 保持现有用户 owner/name 路由更新行为
- **WHEN** 管理员点击 `保存并返回`
- **THEN** 页面 SHALL 保存用户资料并返回既有 returnUrl、用户列表 URL、用户列表或首页 fallback
- **AND** 保存 payload、后端 API、字段名、字段选项和权限规则 SHALL 与既有用户保存契约兼容

#### Scenario: 取消和返回保护未保存修改
- **WHEN** 管理员修改用户字段后点击返回或取消
- **THEN** 页面 SHALL 在离开前要求确认未保存修改
- **AND** 新增模式点击取消并确认离开后 SHALL 保留既有删除临时用户对象语义

### Requirement: 用户编辑页字段提示和即时动作语义保留

Admin 用户编辑页在切换为单一编辑壳后 SHALL 保留现有字段渲染、tooltip、regex 校验、目录同步只读约束和即时动作语义，不得因为壳层改造改变用户资料、认证或授权后端行为。

#### Scenario: 字段渲染和校验不丢失
- **WHEN** 管理员在任意用户字段分组中查看或编辑字段
- **THEN** 原有 `Setting.getLabel` tooltip、`accountItems.regex` 校验、`viewRule` 和 `modifyRule` 语义 SHALL 保留
- **AND** 表格型字段、第三方登录、MFA、WebAuthn、托管账号、Face ID、同意授权和交易记录 SHALL 继续按既有组件渲染
- **AND** 正式页面 SHALL NOT 展示设计线框图中的解释性说明文案

#### Scenario: 目录同步限制保留
- **WHEN** 用户来自企业微信、飞书、钉钉或等价目录同步来源
- **THEN** 注册应用、目录同步群组关系和来源托管字段 SHALL 继续按既有只读或禁用规则处理
- **AND** 页面 SHALL 保留目录同步群组不可在用户编辑页直接变更的错误提示

#### Scenario: 即时动作不伪装为底部保存回滚
- **WHEN** 管理员执行 MFA 删除、第三方登录解绑、WeCom 资料同步或同意授权刷新等既有即时动作
- **THEN** 页面 SHALL 保持这些动作的既有后端调用和刷新语义
- **AND** 页面 SHALL NOT 暗示点击底部 `取消` 可以回滚已经即时提交的后端动作
