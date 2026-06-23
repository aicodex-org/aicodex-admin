## ADDED Requirements

### Requirement: 组织列表页顶部信息层级紧凑化
组织列表页 SHALL 以组织对象列表为首屏主任务，使用紧凑列表顶部呈现标题、结果数、主操作、查询工具栏和弱健康上下文，避免以工作台首页或独立诊断模块压低表格。

#### Scenario: 组织页标题回到对象名
- **WHEN** 管理员访问 `/organizations`
- **THEN** 页面正文主标题 SHALL 显示对象名 `组织`
- **AND** 页面 SHALL NOT 将 `组织主数据工作台` 作为组织列表页正文主标题
- **AND** 页面 SHALL NOT 在正文顶部展示长描述文案来替代表格上下文

#### Scenario: 列表操作和查询保持紧凑分层
- **WHEN** 组织列表页完成首屏渲染
- **THEN** 第一行 SHALL 展示 `组织`、当前结果数和 `添加` 主操作
- **AND** 第二行 SHALL 展示字段选择、关键词输入、查询、重置和更多筛选入口
- **AND** `添加` SHALL 继续遵守管理员权限，非管理员不可执行添加
- **AND** 写操作 SHALL NOT 混入查询按钮组成为同一组高频搜索动作

#### Scenario: 目录健康降级为辅助上下文
- **WHEN** 组织列表页展示目录健康、同步来源和边界信息
- **THEN** 信息 SHALL 以工具栏辅助文本或等价低权重行内区域展示
- **AND** 页面 SHALL 只提供 `目录质量` 轻量入口导航到既有目录质量页面
- **AND** 页面 SHALL NOT 使用独立大卡片、health strip 或多个强按钮作为组织列表顶部主模块
- **AND** 页面 SHALL NOT 在组织列表主页面展示 `刷新状态` 强按钮

#### Scenario: 业务语义保持兼容
- **WHEN** 管理员使用组织列表查询、更多筛选、排序、分页、添加、编辑、删除、群组或用户跳转
- **THEN** 前端 SHALL 继续复用现有 `OrganizationBackend`、前端高级筛选、分页 total 和行级操作语义
- **AND** 系统 SHALL NOT 新增 API、改变后端过滤语义或触发组织同步、认证、授权刷新、Gateway projection publish 等外部执行动作

#### Scenario: 密码类型过滤统一到查询区域
- **WHEN** 管理员需要按组织密码类型过滤列表
- **THEN** 查询字段 SHALL 提供 `密码类型` 选项，并使用密码类型下拉选择具体值
- **AND** 更多筛选 SHALL 提供同一组 `密码类型` 选项用于与其它筛选条件组合
- **AND** 表格列头 SHALL NOT 再提供独立的 `密码类型` filter 下拉
- **AND** 查询 SHALL 继续使用现有 `OrganizationBackend.getOrganizations` 的 `field=passwordType` 与 `value=<passwordType>` 契约，不新增后端 API
