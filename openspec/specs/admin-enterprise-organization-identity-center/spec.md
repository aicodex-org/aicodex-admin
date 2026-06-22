# admin-enterprise-organization-identity-center Specification

## Purpose
定义 Admin 企业认证中心中组织、用户、角色、权限相关页面的组织身份治理体验，确保工作台提供企业级身份治理语义、保持导航 IA 兼容，并不改变真实认证、授权发布或同步执行链路。
## Requirements
### Requirement: 组织身份实体工作台差异化与密度收口
Admin 管理员访问组织、用户、角色或权限相关列表页时，系统 SHALL 在既有列表上方展示企业认证中心风格的组织身份实体工作台，且四类实体 SHALL 呈现差异化、紧凑、以列表为主任务的治理体验。

#### Scenario: 四类实体拥有不同治理语义
- **WHEN** 管理员分别访问 `/organizations`、`/users`、`/roles` 和 `/permissions`
- **THEN** 每个页面的工作台 SHALL 展示与当前实体匹配且彼此不同的标题、副标题、摘要指标、主要行动入口和风险/质量提示
- **AND** 组织页突出组织主数据、目录边界、同步来源和组织树质量
- **AND** 用户页突出账号生命周期、验证状态、资料完整度、导入/同步质量和异常账号
- **AND** 角色页突出授权覆盖、成员绑定、高权限角色、空角色/孤儿角色和职责分离风险
- **AND** 权限页突出权限目录、敏感权限、角色引用、未使用权限和权限粒度治理

#### Scenario: 四类实体不复用同一机械骨架
- **WHEN** 系统渲染四类组织身份实体工作台
- **THEN** 组织页 SHALL 使用目录健康/边界面板骨架
- **AND** 用户页 SHALL 使用生命周期/账号状态条骨架
- **AND** 角色页 SHALL 使用权限风险矩阵骨架
- **AND** 权限页 SHALL 使用敏感度/引用关系矩阵骨架
- **AND** 四页 SHALL NOT 复用同一套“KPI 卡 + 入口卡 + 质量核对 + 原列表说明”的机械结构

#### Scenario: 顶部工作台不压低列表主任务
- **WHEN** 管理员打开任一组织身份实体列表页
- **THEN** 工作台 SHALL 使用紧凑顶部摘要和有限数量的实体相关行动入口
- **AND** 原列表区域 SHALL 在工作台之后保持可见、可访问，并继续承载新增、编辑、删除、上传、筛选、排序和分页等既有操作
- **AND** 页面 SHALL NOT 使用粗糙灰色占位块或长篇产品说明替代表格主任务
- **AND** local-dev 或等价浏览器验证 SHALL 在 1440x900 桌面视口记录表格或核心列表入口的 y 坐标；若某页表格顶部不能进入或接近首屏，验证记录 SHALL 说明具体 y 坐标和原因

#### Scenario: 摘要仍保持只读当前视图口径
- **WHEN** 工作台展示数量、风险或提示
- **THEN** 文案 SHALL 使用短状态标签表达摘要来自当前列表视图、分页 total、已加载行数或前端只读状态
- **AND** 系统 SHALL NOT 声称新增了跨租户、跨组织或后端全量治理统计
- **AND** 页面 SHALL NOT 以“原列表仍是操作入口”“不包装成全量事实”等长句暴露实现痕迹
- **AND** 点击工作台行动入口 SHALL 只导航到既有页面，不触发同步执行、授权刷新或 Gateway projection 操作

### Requirement: 组织身份入口与 IA 兼容
组织身份域 SHALL 通过运行时侧栏、组织配置页导航树和实体工作台行动入口覆盖组织、用户、部门、角色/权限、目录质量和组织同步诊断能力，同时保持运行时侧栏与组织配置页导航树使用相同 IA 和稳定叶子 key。

#### Scenario: 实体工作台提供相关既有入口
- **WHEN** 管理员查看组织身份实体工作台
- **THEN** 工作台 SHALL 按当前实体提供少量相关既有入口，例如目录质量、组织树、身份源、组织同步、角色、权限或用户列表
- **AND** 组织身份域的完整页面能力仍 SHALL 通过运行时侧栏或组织配置导航覆盖 `/organizations`、`/groups`、`/users`、`/organization-tree-operations`、`/organization-directory-quality`、`/roles`、`/permissions`、`/providers`、`/wecom-org-sync` 和 `/feishu-org-sync`
- **AND** 点击入口只导航到现有页面，不触发同步执行、授权刷新或 Gateway projection 操作

#### Scenario: 导航配置树复用运行时 IA
- **WHEN** 管理员在组织配置页编辑 `navItems` 或 `userNavItems`
- **THEN** 配置树展示与运行时侧栏一致的组织身份、身份认证和权限治理分组
- **AND** 配置值仍使用既有稳定叶子 key，不引入不兼容权限 key

#### Scenario: 权限过滤保持兼容
- **WHEN** 组织配置限制 `navItems` 或 `userNavItems`
- **THEN** 运行时侧栏仍按稳定叶子 key 过滤可见菜单
- **AND** 工作台只展示跳转到既有路由的入口，不绕过页面级登录和权限检查

### Requirement: 组织账号列表查询工具栏
组织账号域列表页 SHALL 将高频搜索和筛选入口组织为企业控制台风格的查询工具栏，使管理员能够在表格上方完成主要查询动作，并保持现有列表接口、排序、分页和写操作语义兼容。

#### Scenario: 群组列表使用工具栏作为主搜索入口
- **WHEN** 管理员访问 `/groups`
- **THEN** 页面 SHALL 在群组表格上方展示字段选择、关键词输入、类型筛选、查询、重置和更多筛选入口
- **AND** 主搜索 SHALL NOT 依赖列头小搜索图标作为唯一或主要入口
- **AND** 表格列头 SHALL 继续保留排序能力

#### Scenario: 查询动作不改变后端语义
- **WHEN** 管理员在群组查询工具栏选择字段并输入关键词后点击查询
- **THEN** 前端 SHALL 使用现有 `GroupBackend.getGroups` 查询参数传递 `searchedColumn`、`searchText`、分页和排序语义
- **AND** 系统 SHALL NOT 新增 API、改变后端过滤语义或触发组织同步、认证、授权刷新、Gateway projection publish 等外部执行动作

#### Scenario: 写操作与查询按钮分组清楚
- **WHEN** 群组列表展示新增、下载模板或上传动作
- **THEN** 这些写操作 SHALL 与查询、重置、更多筛选按钮在视觉和结构上分组
- **AND** `新增群组` SHALL NOT 被放在查询按钮组中

#### Scenario: 高级筛选默认不压低首屏表格
- **WHEN** 群组列表首次渲染
- **THEN** 更多筛选区域 SHALL 默认折叠或保持紧凑
- **AND** 查询工具栏 SHALL NOT 引入大字号、状态带或长篇说明来压低表格主任务

#### Scenario: 复用组件保持窄边界
- **WHEN** 本 change 新增共享查询工具栏组件
- **THEN** 组件 SHALL 使用 `.tsx` 并服务当前群组页查询工具栏
- **AND** 组件 MAY 在后续组织、用户、邀请等列表页复用
- **AND** 本 change SHALL NOT 要求同批改造所有组织账号列表页
