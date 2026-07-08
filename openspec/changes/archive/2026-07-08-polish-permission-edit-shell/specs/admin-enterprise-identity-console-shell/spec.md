## ADDED Requirements

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
- **WHEN** 管理员点击 `保存`
- **THEN** 页面 SHALL 使用现有 `PermissionBackend.updatePermission` 保存权限并停留在当前权限编辑页
- **AND** 页面 SHALL 保持现有保存 payload、权限名路由更新和错误回滚语义
- **WHEN** 管理员点击 `保存并返回`
- **THEN** 页面 SHALL 保存权限并返回 `/permissions`

#### Scenario: 权限编辑页取消和返回保护未保存修改
- **WHEN** 管理员修改权限字段后点击返回或取消
- **THEN** 页面 SHALL 在离开前要求确认未保存修改
- **AND** 新增模式点击取消并确认离开后 SHALL 保留既有删除临时权限对象语义

#### Scenario: 权限编辑页保存前校验
- **WHEN** 管理员清空权限 `名称` 或 `显示名称` 后点击保存类按钮
- **THEN** 页面 SHALL 阻止提交到权限保存 API
- **AND** 缺失字段 SHALL 展示红色 `*` 和可读错误提示
- **AND** 页面 SHALL 展示本地化错误消息说明需补齐必填字段
- **WHEN** 现有权限业务校验失败
- **THEN** 页面 SHALL 保留现有本地化错误提示并阻止提交到权限保存 API
