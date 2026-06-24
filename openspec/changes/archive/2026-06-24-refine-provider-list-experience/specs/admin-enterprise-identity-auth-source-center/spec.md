## MODIFIED Requirements

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

## ADDED Requirements

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

## REMOVED Requirements

### Requirement: 认证源状态与配置完整度
**Reason**: `/providers` 本轮收敛为 Provider 列表页，顶部认证源概览区不再作为该页面的验收内容；缺少真实聚合接口时，配置完整度摘要容易和列表任务混杂。

**Migration**: 保留 Provider 列表中的类别、类型、组织、client ID 和 Provider URL 等字段供管理员核对；如后续需要认证源状态工作区，应基于真实聚合数据单独开 change 设计入口。

### Requirement: 同步授权诊断与失败摘要
**Reason**: `/providers` 列表页不再承载同步诊断、授权状态和失败摘要首屏区，避免列表前堆叠无法直接操作的只读概览。

**Migration**: 同步诊断、授权核对和失败摘要仍以各同步页面、配置页和审计记录为事实入口；本 change 不改变这些页面、路由或后端行为。
