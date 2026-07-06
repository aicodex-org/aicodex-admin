## ADDED Requirements

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
- **WHEN** 管理员点击 `保存`
- **THEN** 页面 SHALL 保存全部 Tabs 中的组织配置并停留在当前组织编辑页
- **AND** 保存成功后 SHALL 保持现有主题刷新、`storageOrganizationsChanged` 事件和组织名路由更新行为
- **WHEN** 管理员点击 `保存并返回`
- **THEN** 页面 SHALL 保存全部 Tabs 中的组织配置并返回组织列表
- **AND** 保存 payload、后端 API、字段名和字段选项 SHALL 与既有组织保存契约兼容

#### Scenario: 取消和返回保护未保存修改
- **WHEN** 管理员修改组织字段后点击返回或取消
- **THEN** 页面 SHALL 在离开前要求确认未保存修改
- **AND** 新增模式点击取消并确认离开后 SHALL 保留既有删除临时组织对象语义

### Requirement: 组织编辑页必填校验与提示保留

Admin 组织编辑页 SHALL 在基础必填字段上显示红色必填标识，并在保存前进行前端校验；拆分 Tabs 后 SHALL 保留现有字段 tooltip、help、extra 或等价 tip 信息。

#### Scenario: 必填字段保存前校验
- **WHEN** 管理员清空组织 `名称` 或 `显示名称` 后点击保存类按钮
- **THEN** 页面 SHALL 阻止提交到组织保存 API
- **AND** 页面 SHALL 切换到基础 Tab
- **AND** 缺失字段 SHALL 展示红色 `*` 和可读错误提示

#### Scenario: 原有字段提示不丢失
- **WHEN** 管理员在任意 Tab 查看组织字段
- **THEN** 原有 `Setting.getLabel` tooltip、字段说明、预览说明或等价 tip 入口 SHALL 跟随字段移动到对应 Tab
- **AND** 正式页面 SHALL NOT 展示设计线框图中的解释性说明文案

#### Scenario: 表格和 Tree 使用全宽区
- **WHEN** 管理员打开账号资料、多因素认证、目录服务或导航菜单 Tab
- **THEN** AccountTable、MfaTable、LdapTable、NavItemTree 和 WidgetItemTree SHALL 使用当前 Tab 内容区的可用宽度
- **AND** 这些表格或 Tree SHALL NOT 被普通 label/content 行压缩成窄内容列
