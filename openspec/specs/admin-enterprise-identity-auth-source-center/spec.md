# admin-enterprise-identity-auth-source-center Specification

## Purpose
TBD - created by archiving change implement-admin-enterprise-identity-auth-source-center. Update Purpose after archive.
## Requirements
### Requirement: 认证源中心工作区
Admin 企业认证中心 SHALL 在认证源分组下提供以 Provider 列表为主体的认证源管理页，使管理员能够从 `/providers` 首屏直接扫描、搜索、分页和操作企业微信、飞书、OIDC 等认证源 Provider。

#### Scenario: 管理员打开认证源列表
- **WHEN** 已登录管理员访问 `/providers`
- **THEN** 页面 SHALL 直接展示 Provider 列表查询工具栏和表格
- **AND** 页面 SHALL NOT 在列表上方展示认证源概览、接入诊断条、认证源摘要卡片、同步诊断卡片或失败摘要区
- **AND** Provider 列表表格在 1440x900 桌面首屏内 SHALL 可感知

#### Scenario: 认证源列表使用公共列表结构
- **WHEN** 管理员访问 `/providers`
- **THEN** 页面 SHALL 复用 Admin 公共列表工具栏、表格壳、识别列和行操作模式
- **AND** 页面 SHALL NOT 在 Provider 列表前堆叠多层说明卡、入口卡、风险卡或对象信息弹出入口
- **AND** 页面 SHALL 明确保持只读列表查询和既有行操作，不触发同步、授权刷新或真实 provider 探测

#### Scenario: 认证源列表仍可操作
- **WHEN** 管理员在 Provider 表格中查看认证源
- **THEN** 既有 Provider 分页、筛选、新增、编辑和删除行为 SHALL 保持可用
- **AND** 表格 SHALL 默认展示认证源识别信息、归属组织、创建时间、类别、类型、客户端 ID、Provider URL 和操作列
- **AND** 认证源列表不得改变 Provider 表格的路由、权限 key 或数据写入行为

#### Scenario: TSX 迁移保持行为兼容
- **WHEN** Provider 列表页从 JavaScript 迁移为 TSX
- **THEN** `/providers` 路由、Provider 列表加载、表格操作、配置入口和删除确认 SHALL 保持现有行为兼容
- **AND** 迁移 SHALL NOT 触发后端写入、组织同步、OAuth/OIDC 授权、真实 provider 探测或权限模型变更

### Requirement: 企业管理台视觉与响应式
认证源列表页 SHALL 使用安静、信息密度合理的企业管理台列表布局，避免营销式 hero、装饰背景、卡片套卡片和大块顶部空白，并在桌面和窄屏上保持可读可操作。

#### Scenario: 桌面端扫描认证源列表
- **WHEN** 管理员在桌面端访问 `/providers`
- **THEN** 查询工具栏、扩展筛选、Provider 表格和操作列布局 SHALL 清晰
- **AND** 文案 SHALL 服务于查找、核对和操作决策
- **AND** 浏览器验证 SHALL 记录 Provider 表格在桌面首屏内可见

#### Scenario: 窄屏访问认证源列表
- **WHEN** 管理员在窄屏或移动端访问 `/providers`
- **THEN** 文本、状态标签、按钮和表格区域不发生重叠或不可读溢出
- **AND** 页面级 SHALL NOT 出现由顶部概览区或外层布局造成的横向溢出
- **AND** 表格内部 MAY 使用横向滚动作为窄屏兜底以保留关键字段和操作列

### Requirement: Provider 列表扩展搜索
Provider 列表页 SHALL 在基础关键词搜索之外提供可展开扩展搜索，用于按当前 Provider 列表可承载的关键属性查找记录，并保持既有后端查询契约。

#### Scenario: 展开扩展搜索
- **WHEN** 管理员点击 Provider 列表工具栏中的更多筛选入口
- **THEN** 页面 SHALL 展示认证源类别、类型、归属组织、客户端 ID 和 Provider URL 等扩展搜索控件
- **AND** 扩展搜索控件 SHALL 使用 Ant Design 输入或选择组件，并和公共列表工具栏视觉一致

#### Scenario: 使用扩展搜索查询
- **WHEN** 管理员填写任一扩展搜索字段并执行查询
- **THEN** 前端 SHALL 将该搜索映射为既有 Provider 列表 API 支持的单字段查询参数
- **AND** 前端 SHALL NOT 新增复合查询 API、改变分页契约或改变后端过滤语义

#### Scenario: 重置扩展搜索
- **WHEN** 管理员点击重置
- **THEN** 页面 SHALL 清空基础搜索和扩展搜索字段
- **AND** 页面 SHALL 使用默认 Provider 列表查询重新加载数据

### Requirement: 身份源中心列表页壳统一
身份源/认证源中心 Provider 列表页 SHALL 使用同一套共享列表页壳呈现标题、查询控件、右侧动作、辅助上下文和分页区域，并保持既有 Provider 列表业务操作语义兼容。

#### Scenario: Provider 标题和动作位于共享工具栏
- **WHEN** 管理员在桌面端访问 `/providers`
- **THEN** Provider 列表标题 SHALL 由共享查询工具栏 header 呈现
- **AND** 新增或等价主动作 SHALL 位于共享查询工具栏动作区
- **AND** 页面 SHALL 暴露共享 `.enterprise-list-page-table-shell` 作为列表页壳边界
- **AND** 页面 SHALL NOT 在 Provider 列表前新增页面私有 top action、摘要卡、接入诊断条或对象信息弹出入口造成标题或动作漂移

#### Scenario: Provider 分页展示规则一致
- **WHEN** Provider 列表渲染分页
- **THEN** 分页 SHALL 使用共享分页配置或等价公共 helper
- **AND** 总数、页码、每页条数和跳页区域 SHALL 作为右侧分页组呈现
- **AND** 页面 SHALL NOT 为身份源中心单独实现不同顺序、不同权重或不同间距的分页导航

#### Scenario: Provider 既有业务语义保持兼容
- **WHEN** 管理员使用 Provider 列表查询、更多筛选、排序、分页、新增、编辑或删除
- **THEN** 前端 SHALL 继续复用既有后端查询、删除、跳转、权限和确认弹窗契约
- **AND** 系统 SHALL NOT 新增 API、改变后端过滤语义、改变删除禁用条件、触发 OAuth/OIDC 授权、真实 provider 探测、组织同步、认证刷新、授权刷新或 Gateway projection publish

#### Scenario: 自动化检查覆盖身份源列表壳漂移
- **WHEN** 前端测试验证 Provider 列表页
- **THEN** 测试 SHALL 覆盖共享工具栏标题、动作区、分页配置和共享表格壳 class
- **AND** 测试 SHALL 能发现新增入口、分页配置或外层壳脱离共享列表页壳的回归

