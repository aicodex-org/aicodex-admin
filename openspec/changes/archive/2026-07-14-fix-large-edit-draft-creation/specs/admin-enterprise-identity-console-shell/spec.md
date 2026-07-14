## MODIFIED Requirements

### Requirement: 角色编辑页应使用轻量单页固定操作栏

Admin 身份控制台 Shell SHALL 允许角色编辑页使用共享编辑框架承载角色元信息与授权范围维护，使管理员能够稳定返回、取消、保存或保存并返回，同时避免把中等数量字段拆成空 Tabs。

#### Scenario: 角色编辑页使用单页分区而不是 Tabs
- **WHEN** 管理员打开 `/roles/:organizationName/:roleName`
- **THEN** 页面 SHALL 使用单个主编辑壳展示角色编辑内容
- **AND** 页面 SHALL 以 `基础信息` 和 `授权范围` 两个区块组织字段
- **AND** 页面 SHALL NOT 为当前字段量渲染页内 Tabs
- **AND** 页面 SHALL 保留 `role-edit-page` 与 `role-edit-card` 或等价 scoped class 供测试、smoke 和后续局部修复定位

#### Scenario: 角色编辑页返回路径和底部动作保持可达
- **WHEN** 管理员在角色编辑页滚动或编辑字段
- **THEN** 页面顶部 SHALL 提供返回入口、组织账号路径和角色编辑标题
- **AND** 页面底部 SHALL 保留固定操作栏
- **AND** 操作栏按钮顺序 SHALL 为 `取消`、`保存`、`保存并返回`
- **AND** 页面 SHALL 与组织编辑页共用同类头部和底部操作栏视觉规则
- **AND** 角色编辑路由 SHALL 使用无外层 content Card 的内部滚动容器，使底部操作栏固定在编辑区域底部
- **AND** 页面 SHALL NOT 同时保留旧 Card 标题内保存按钮和正文底部重复保存按钮

#### Scenario: 角色编辑页保存语义保持兼容
- **WHEN** 管理员在编辑态点击 `保存`
- **THEN** 页面 SHALL 使用现有 `RoleBackend.updateRole` 保存角色并停留在当前角色编辑页
- **AND** 页面 SHALL 保持现有保存 payload、角色名路由更新和错误回滚语义
- **WHEN** 管理员点击 `保存并返回`
- **THEN** 页面 SHALL 保存角色并返回 `/roles`

#### Scenario: 角色新增草稿只在保存时创建
- **WHEN** 管理员在角色列表点击新增
- **THEN** 页面 SHALL 打开带既有默认值的路由草稿且 SHALL NOT 调用 `addRole` 或显示新增成功提示
- **WHEN** 管理员在新增编辑页点击保存或保存并返回
- **THEN** 页面 SHALL 在既有校验通过后调用 `addRole`，成功后转为编辑模式
- **AND** 后续保存 SHALL 继续使用 `RoleBackend.updateRole`

#### Scenario: 角色编辑页取消和返回保护未保存修改
- **WHEN** 管理员修改角色字段后点击返回或取消
- **THEN** 页面 SHALL 在离开前要求确认未保存修改
- **WHEN** 管理员在角色新增草稿确认离开
- **THEN** 页面 SHALL 返回 `/roles` 且 SHALL NOT 调用新增、更新或删除 API

#### Scenario: 角色编辑页必填字段保存前校验
- **WHEN** 管理员清空角色 `名称` 或 `显示名称` 后点击保存类按钮
- **THEN** 页面 SHALL 阻止提交到角色新增或保存 API
- **AND** 缺失字段 SHALL 展示红色 `*` 和可读错误提示
- **AND** 页面 SHALL 展示本地化错误消息说明需补齐必填字段

### Requirement: 权限编辑页应使用双 Tabs 大型编辑壳

Admin 身份控制台 Shell SHALL 允许权限编辑页使用共享大型编辑壳承载权限基础信息、授权主体、资源动作和审批状态，使管理员能够稳定返回、取消、保存或保存并返回，同时避免把每个细分区块都提升为顶层 tab。

#### Scenario: 权限编辑页使用两个顶层 Tabs
- **WHEN** 管理员打开 `/permissions/:organizationName/:permissionName`
- **THEN** 页面 SHALL 使用大型编辑壳展示权限编辑内容
- **AND** 页面 SHALL 提供 `基础` 与 `规则` 两个顶层 tabs
- **AND** `基础` tab SHALL 使用区块标题组织基础信息和授权主体
- **AND** `规则` tab SHALL 使用区块标题组织资源动作和审批信息
- **AND** 页面 SHALL 保留 `permission-edit-page` 与 `permission-edit-card` 或等价 scoped class 供测试、smoke 和后续局部修复定位

#### Scenario: 权限编辑页返回路径和底部动作保持可达
- **WHEN** 管理员在权限编辑页切换 tab、滚动或编辑字段
- **THEN** 页面顶部 SHALL 提供返回入口、组织账号路径和权限编辑标题
- **AND** 页面底部 SHALL 保留固定操作栏
- **AND** 操作栏按钮顺序 SHALL 为 `取消`、`保存`、`保存并返回`
- **AND** 权限编辑路由 SHALL 使用无外层 content Card 的内部滚动容器，使底部操作栏固定在编辑区域底部
- **AND** 页面 SHALL NOT 同时保留旧 Card 标题内保存按钮和正文底部重复保存按钮

#### Scenario: 权限编辑页保存语义保持兼容
- **WHEN** 管理员在编辑态点击 `保存`
- **THEN** 页面 SHALL 使用现有 `PermissionBackend.updatePermission` 保存权限并停留在当前权限编辑页
- **AND** 页面 SHALL 保持现有保存 payload、权限名路由更新和错误回滚语义
- **WHEN** 管理员点击 `保存并返回`
- **THEN** 页面 SHALL 保存权限并返回 `/permissions`

#### Scenario: 权限新增草稿只在保存时创建
- **WHEN** 管理员在权限列表点击新增
- **THEN** 页面 SHALL 打开路由草稿且 SHALL NOT 调用 `addPermission` 或显示新增成功提示
- **WHEN** 管理员在新增编辑页点击保存或保存并返回
- **THEN** 页面 SHALL 在既有必填与业务校验通过后调用 `addPermission`，成功后转为编辑模式
- **AND** 后续保存 SHALL 继续使用 `PermissionBackend.updatePermission`

#### Scenario: 权限编辑页取消和返回保护未保存修改
- **WHEN** 管理员修改权限字段后点击返回或取消
- **THEN** 页面 SHALL 在离开前要求确认未保存修改
- **WHEN** 管理员在权限新增草稿确认离开
- **THEN** 页面 SHALL 返回 `/permissions` 且 SHALL NOT 调用新增、更新或删除 API

#### Scenario: 权限编辑页保存前校验
- **WHEN** 管理员清空权限 `名称` 或 `显示名称` 后点击保存类按钮
- **THEN** 页面 SHALL 阻止提交到权限新增或保存 API
- **AND** 缺失字段 SHALL 展示红色 `*` 和可读错误提示
- **AND** 页面 SHALL 展示本地化错误消息说明需补齐必填字段
- **WHEN** 现有权限业务校验失败
- **THEN** 页面 SHALL 保留现有本地化错误提示并阻止提交到权限新增或保存 API

### Requirement: 应用编辑页应使用多 tab 固定操作栏编辑壳

Admin 身份控制台 Shell SHALL 让应用编辑页按多 tab 大编辑页形态复用统一编辑壳，使页面头部、Tabs、滚动正文和底部动作栏与组织、用户编辑页保持同一套交互边界。

#### Scenario: 应用编辑页复用统一编辑壳
- **WHEN** 管理员在桌面端访问 `/applications/:organizationName/:applicationName`
- **THEN** 应用编辑页 SHALL 使用单个主编辑壳承载返回路径、应用编辑标题、页内 Tabs、当前 tab 正文和固定底部动作栏
- **AND** route scroll 容器与页面内部编辑壳 SHALL NOT 叠加出多套标题、Card title 保存按钮或正文底部重复保存按钮
- **AND** 页面 SHALL 保留 `application-edit-page` 与 `application-edit-card` 或等价 scoped class 供测试、smoke 和后续局部修复定位

#### Scenario: 应用编辑页按多 tab 页面处理
- **WHEN** 管理员打开应用编辑页
- **THEN** 页面 SHALL 展示基础、身份验证、OIDC/OAuth、SAML、提供商、界面定制、安全设置和 Reverse Proxy 这些应用配置 tab
- **AND** tab key SHALL 写入 URL hash，使刷新或重新打开后能恢复当前 tab
- **AND** 应用编辑页 SHALL NOT 因复用单页编辑壳而把这些配置域合并成一个长正文

#### Scenario: 应用编辑页底部动作保持可达
- **WHEN** 管理员在应用编辑页滚动任一 tab 正文
- **THEN** 页面底部 SHALL 保留固定操作栏
- **AND** 操作栏按钮顺序 SHALL 为 `取消`、`保存`、`保存并返回`
- **AND** 保存中 SHALL 禁用重复提交或展示提交中状态
- **AND** 新增草稿取消 SHALL 返回应用列表且不调用新增、更新或删除 API

#### Scenario: 应用编辑页不制造页面级横向溢出
- **WHEN** 管理员在 `1280px` 或 `1920px` 桌面宽度访问应用编辑页任一 tab
- **THEN** Shell 根文档 SHALL NOT 因外层内容卡、表单 label gutter、表格模块或预览区域产生不必要的页面级横向 overflow
- **AND** 需要横向滚动的表格、URL 列表或预览组件 SHALL 在自身容器内处理 overflow

#### Scenario: 应用编辑页保存前错误定位到对应 tab
- **WHEN** 管理员在应用编辑页提交缺少必填字段或存在可前端发现的配置错误
- **THEN** 页面 SHALL 阻止调用应用新增或更新 API
- **AND** 页面 SHALL 展示本地化错误提示
- **AND** 页面 SHALL 激活第一个错误所在 tab

#### Scenario: 应用新增和复制仅打开草稿
- **WHEN** 管理员在应用列表点击新增或复制
- **THEN** 页面 SHALL 打开带既有默认值或复制值的路由草稿
- **AND** 页面 SHALL NOT 调用 `ApplicationBackend.addApplication` 或显示新增、复制成功提示
- **AND** 新增模式 SHALL 跳过尚不存在应用的详情读取

#### Scenario: 应用草稿保存后进入编辑模式
- **WHEN** 管理员在新增或复制草稿点击保存或保存并返回
- **THEN** 页面 SHALL 在既有校验通过后调用 `ApplicationBackend.addApplication` 一次
- **AND** 保存并返回 SHALL 直接返回应用列表
- **AND** 保存并停留 SHALL 先进入禁止更新的回读状态，并在详情 GET 成功替换前端草稿后恢复编辑保存
- **AND** 回读失败、缺失数据或网络异常时 SHALL 保持更新 fail-closed，但取消和返回仍 SHALL 可用
- **AND** 后续保存 SHALL 调用既有更新 API，并保留后端生成的 `clientId`、`clientSecret` 等持久化字段
- **AND** 应用 payload、tab hash、字段规则和返回语义 SHALL 保持兼容

#### Scenario: 应用草稿取消或返回不写入
- **WHEN** 管理员在新增或复制草稿点击取消、顶部返回或确认放弃未保存修改
- **THEN** 页面 SHALL 返回应用列表且 SHALL NOT 调用新增、更新或删除 API
