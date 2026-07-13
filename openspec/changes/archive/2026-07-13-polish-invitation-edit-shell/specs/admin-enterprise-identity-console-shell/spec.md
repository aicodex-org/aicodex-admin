## ADDED Requirements

### Requirement: 邀请码编辑页应使用单页固定操作栏

Admin 身份控制台 Shell SHALL 让邀请码编辑页复用共享单页编辑壳承载邀请码配置，使管理员在长正文中能够稳定识别对象路径并访问保存操作，同时保持现有邀请码业务语义。

#### Scenario: 邀请码编辑页复用统一编辑壳
- **WHEN** 管理员打开 `/invitations/:organizationName/:invitationName`
- **THEN** 页面 SHALL 使用单个主编辑壳展示返回入口、组织账号路径、邀请码对象标题、滚动正文和固定底部操作栏
- **AND** 页面 SHALL 保留 `invitation-edit-page` 与 `invitation-edit-card` 或等价 scoped class 供测试、smoke 和后续局部修复定位
- **AND** 页面 SHALL NOT 同时保留旧 Card 标题操作按钮和正文末尾重复操作按钮

#### Scenario: 邀请码字段按业务语义分区
- **WHEN** 邀请码记录加载完成
- **THEN** 页面 SHALL 使用公共 section 与 field row 展示基础信息、邀请配置、注册目标和注册信息分区
- **AND** 所有既有组织、名称、显示名称、邀请码、默认邀请码、配额、已使用数、应用、注册群组、用户名、邮箱、手机号和状态字段 SHALL 保持可编辑或原有禁用语义
- **AND** 复制注册链接和发送邀请入口 SHALL 保持位于邀请码配置上下文中

#### Scenario: 邀请码编辑操作保持兼容
- **WHEN** 管理员使用保存、保存并退出、复制注册链接、发送邀请或新增取消动作
- **THEN** 页面 SHALL 保持既有 backend API、请求 payload、路由跳转、默认应用判断、消息提示和删除临时邀请码语义
- **AND** 本布局迁移 SHALL NOT 新增未保存修改确认；名称和邮箱的前端格式校验按后续验收场景执行

#### Scenario: 邀请码组织标签和保存前格式校验
- **WHEN** 管理员查看或选择邀请码所属组织
- **THEN** 组织下拉 SHALL 展示组织 `displayName`，未配置显示名时回退为组织技术名
- **AND** 选择和保存 payload SHALL 始终使用组织技术名作为稳定值
- **WHEN** 管理员点击保存或保存并返回，且名称为空、名称不是由 ASCII 字母、数字、下划线和连字符组成，或非空邮箱不符合项目既有邮箱格式校验
- **THEN** 页面 SHALL 阻止调用邀请码新增或更新 API
- **AND** 对应字段 SHALL 展示本地化错误状态和可读错误提示

#### Scenario: 邀请码编辑页只读滚动验收
- **WHEN** 验收人员通过本地前端代理 60 打开邀请码编辑页并逐段滚动正文
- **THEN** 公共头部和固定底部操作栏 SHALL 保持可见，正文各分区 SHALL 可完整查看且页面级 SHALL NOT 出现横向溢出
- **AND** 验收 SHALL NOT 点击保存、保存并退出、发送邀请、取消新增、删除或其它可能触发真实外部同步或数据库写入的动作
