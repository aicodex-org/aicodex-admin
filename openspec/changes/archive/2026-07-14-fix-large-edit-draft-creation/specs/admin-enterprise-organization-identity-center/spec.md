## MODIFIED Requirements

### Requirement: 组织编辑页 Tabs 与固定操作栏

Admin 组织编辑页 SHALL 使用页内 Tabs、顶部返回路径和底部固定操作栏组织长编辑内容，使管理员在长页面滚动时仍能切换分组、返回、保存、保存并返回或取消。

#### Scenario: 组织字段按 Tabs 分组
- **WHEN** 管理员打开组织编辑页
- **THEN** 页面 SHALL 展示基础、品牌、登录安全、导航菜单、账号资料、多因素认证、目录服务等 Tabs
- **AND** 编辑模式存在交易记录时 SHALL 展示交易记录 Tab
- **AND** 无交易记录或新增模式 SHALL NOT 展示空的交易记录 Tab

#### Scenario: 返回路径和底部动作保持可达
- **WHEN** 管理员在组织编辑页滚动任意长内容
- **THEN** 页面顶部 SHALL 保留返回入口和组织编辑路径
- **AND** 页面底部 SHALL 保留固定操作栏
- **AND** 操作栏按钮顺序 SHALL 为 `取消`、`保存`、`保存并返回`

#### Scenario: 保存语义保持兼容
- **WHEN** 管理员在编辑态点击 `保存`
- **THEN** 页面 SHALL 使用既有更新 API 保存全部 Tabs 中的组织配置并停留在当前组织编辑页
- **AND** 保存成功后 SHALL 保持现有主题刷新、`storageOrganizationsChanged` 事件和组织名路由更新行为
- **WHEN** 管理员点击 `保存并返回`
- **THEN** 页面 SHALL 保存全部 Tabs 中的组织配置并返回组织列表
- **AND** 保存 payload、后端 API、字段名和字段选项 SHALL 与既有组织保存契约兼容

#### Scenario: 组织新增草稿只在保存时创建
- **WHEN** 管理员在组织列表点击新增
- **THEN** 页面 SHALL 打开带既有默认值的路由草稿且 SHALL NOT 调用新增 API 或显示新增成功提示
- **AND** 新增模式 SHALL 跳过不存在组织的详情读取
- **WHEN** 管理员在新增编辑页点击保存或保存并返回
- **THEN** 页面 SHALL 在既有校验通过后调用新增 API，成功后转为编辑模式
- **AND** 后续保存 SHALL 使用既有更新 API，并保留主题刷新、`storageOrganizationsChanged` 事件与路由更新语义

#### Scenario: 取消和返回保护未保存修改
- **WHEN** 管理员修改组织字段后点击返回或取消
- **THEN** 页面 SHALL 在离开前要求确认未保存修改
- **WHEN** 管理员在新增草稿确认离开
- **THEN** 页面 SHALL 返回组织列表且 SHALL NOT 调用新增、更新或删除 API

#### Scenario: 组织编辑页必填校验保持兼容
- **WHEN** 管理员清空组织 `名称` 或 `显示名称` 后点击保存类按钮
- **THEN** 页面 SHALL 阻止提交到组织新增或更新 API，并保持既有错误 tab、必填标识和字段提示

#### Scenario: 组织同步页新建目标组织仅打开草稿
- **WHEN** 管理员在企微、飞书或钉钉组织同步页点击“新建组织”
- **THEN** 公共入口 SHALL 使用既有组织默认值打开路由草稿
- **AND** 入口 SHALL NOT 调用组织新增、更新或删除 API、广播组织已变更事件或显示新增成功
- **AND** 缺少可携带 route state 的 history 时 SHALL fail-closed，不得回退到会丢失草稿的 URL 导航

### Requirement: 群组编辑页单页编辑壳

Admin 群组编辑页 SHALL 使用单页编辑壳承载群组元信息编辑，使管理员能够稳定返回、取消、保存或保存并返回，同时避免把少量字段拆成空 Tabs。

#### Scenario: 群组编辑页不拆 Tabs
- **WHEN** 管理员打开群组编辑页
- **THEN** 页面 SHALL 以单个 `基础信息` 区块展示组织、群组标识或同步标识、显示名称、类型、上级组、当前成员摘要和启用状态
- **AND** 页面 SHALL NOT 为当前少量字段渲染页内 Tabs
- **AND** 当前成员摘要 SHALL 只读展示，不提供当前页内新增、移除、搜索或批量成员操作

#### Scenario: 返回路径和底部动作保持可达
- **WHEN** 管理员在群组编辑页滚动或编辑字段
- **THEN** 页面顶部 SHALL 提供返回入口、组织账号路径和群组编辑标题
- **AND** 页面底部 SHALL 保留固定操作栏
- **AND** 操作栏按钮顺序 SHALL 为 `取消`、`保存`、`保存并返回`
- **AND** 页面 SHALL NOT 同时保留旧 Card 标题内保存按钮和正文底部重复保存按钮

#### Scenario: 保存语义保持兼容
- **WHEN** 管理员在编辑态点击 `保存`
- **THEN** 页面 SHALL 使用现有 `GroupBackend.updateGroup` 保存群组元信息并停留在当前群组编辑页
- **AND** 页面 SHALL 保持现有 `isTopGroup` 计算、保存 payload、群组名路由更新和错误回滚语义
- **WHEN** 管理员点击 `保存并返回`
- **THEN** 页面 SHALL 保存群组元信息并返回既有 group tree URL 或群组列表

#### Scenario: 群组新增草稿只在保存时创建
- **WHEN** 管理员在群组列表点击新增
- **THEN** 页面 SHALL 打开路由草稿且 SHALL NOT 调用新增 API 或显示新增成功提示
- **AND** 新增模式 SHALL 跳过不存在群组的详情读取
- **WHEN** 管理员在新增编辑页点击保存或保存并返回
- **THEN** 页面 SHALL 在既有校验通过后调用新增 API，成功后转为编辑模式
- **AND** 后续保存 SHALL 保持既有 `GroupBackend.updateGroup`、`isTopGroup`、返回 URL 与 payload 语义

#### Scenario: 取消和返回保护未保存修改
- **WHEN** 管理员修改群组字段后点击返回或取消
- **THEN** 页面 SHALL 在离开前要求确认未保存修改
- **WHEN** 管理员在新增草稿确认离开
- **THEN** 页面 SHALL 返回既有 group tree URL 或群组列表，且 SHALL NOT 调用新增、更新或删除 API

#### Scenario: 群组树根群组和子群组入口仅打开草稿
- **WHEN** 管理员在群组树点击新增根群组或新增子群组
- **THEN** 页面 SHALL 传递包含正确 `owner`、`parentId` 和 `isTopGroup` 的路由草稿
- **AND** 入口 SHALL NOT 调用群组新增、更新或删除 API，也 SHALL NOT 显示新增成功

#### Scenario: 群组必填和同步来源约束保持兼容
- **WHEN** 管理员提交群组草稿或编辑群组
- **THEN** 页面 SHALL 保持既有必填校验、成员摘要与目录同步只读约束

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
- **WHEN** 管理员在编辑态点击 `保存`
- **THEN** 页面 SHALL 使用现有 `UserBackend.updateUser` 保存全部字段分组中的用户资料并停留在当前用户编辑页
- **AND** 保存成功后 SHALL 保持现有用户 owner/name 路由更新行为
- **WHEN** 管理员点击 `保存并返回`
- **THEN** 页面 SHALL 保存用户资料并返回既有 returnUrl、用户列表 URL、用户列表或首页 fallback
- **AND** 保存 payload、后端 API、字段名、字段选项和权限规则 SHALL 与既有用户保存契约兼容

#### Scenario: 用户新增草稿只在保存时创建
- **WHEN** 管理员在用户列表点击新增
- **THEN** 页面 SHALL 打开路由草稿且 SHALL NOT 调用新增 API 或显示新增成功提示
- **AND** 新增模式 SHALL 跳过不存在用户的详情、交易和用户应用读取
- **WHEN** 管理员在新增编辑页点击保存或保存并返回
- **THEN** 页面 SHALL 在既有校验通过后调用新增 API，成功后转为编辑模式
- **AND** 保存并返回 SHALL 直接返回既有列表或 returnUrl，不执行无意义的编辑态回读
- **AND** 保存并停留 SHALL 在回读持久化用户及其组织应用上下文期间禁止更新
- **AND** 只有两项回读均成功后，后续保存 SHALL 使用 `UserBackend.updateUser`，并保留服务端补齐或归一化的用户字段、returnUrl、字段规则与 payload 语义
- **AND** 任一回读发生业务错误、缺失数据或网络异常时 SHALL 保持更新 fail-closed，但取消和返回仍 SHALL 可用
- **AND** 页面卸载后的晚响应 SHALL NOT 更新状态或显示全局错误消息

#### Scenario: 取消和返回保护未保存修改
- **WHEN** 管理员修改用户字段后点击返回或取消
- **THEN** 页面 SHALL 在离开前要求确认未保存修改
- **WHEN** 管理员在新增草稿确认离开
- **THEN** 页面 SHALL 返回既有 returnUrl、用户列表 URL、用户列表或首页 fallback，且 SHALL NOT 调用新增、更新或删除 API

#### Scenario: 用户即时动作语义保持兼容
- **WHEN** 管理员执行既有 MFA 删除、第三方登录解绑、资料同步或同意授权刷新等即时动作
- **THEN** 页面 SHALL 保持这些动作的既有后端调用和刷新语义
- **AND** 页面 SHALL NOT 暗示新增草稿取消可以回滚已经明确执行的即时动作

#### Scenario: 用户组织上下文切换只接受最后一次有效响应
- **WHEN** 管理员在用户新增或编辑页切换所属组织，或初始组织上下文仍在加载
- **THEN** 页面 SHALL 同步加载目标组织详情、应用和有权限读取的群组，并在编辑模式加载用户应用上下文
- **AND** 新增模式切换组织 SHALL NOT 读取尚不存在用户的用户应用上下文
- **AND** 编辑模式目标组织缺少用户应用时 SHALL 按既有缺失应用语义非阻塞降级
- **AND** 仅最后一次且仍匹配当前 owner 的完整成功响应 SHALL 更新字段规则、应用、群组和 `signupApplication`
- **AND** 加载中、业务错误、缺失组织数据或网络失败时保存类操作 SHALL fail-closed，且 SHALL NOT 调用用户新增或更新 API
- **AND** 页面卸载后的晚响应 SHALL NOT 更新状态或显示全局错误消息
