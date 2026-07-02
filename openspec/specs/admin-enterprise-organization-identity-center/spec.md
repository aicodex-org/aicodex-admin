# admin-enterprise-organization-identity-center Specification

## Purpose
定义 Admin 企业认证中心中组织、用户、角色、权限相关页面的组织身份治理体验，确保工作台提供企业级身份治理语义、保持导航 IA 兼容，并不改变真实认证、授权发布或同步执行链路。
## Requirements
### Requirement: 组织身份实体工作台差异化与密度收口
Admin 管理员访问组织、用户、角色或权限相关列表页时，系统 SHALL 以对象列表作为首屏主任务。组织和用户页 MAY 展示紧凑的组织身份上下文；角色和权限页 SHALL 直接使用统一列表壳，不得在表格上方渲染独立对象工作台、风险矩阵或引用矩阵。

#### Scenario: 四类实体拥有不同治理语义
- **WHEN** 管理员分别访问 `/organizations`、`/users`、`/roles` 和 `/permissions`
- **THEN** 每个页面 SHALL 展示与当前实体匹配的标题、查询入口、主要行动入口和列表字段
- **AND** 组织页突出组织主数据、目录边界、同步来源和组织树质量
- **AND** 用户页突出账号生命周期、验证状态、资料完整度、导入/同步质量和异常账号
- **AND** 角色页 SHALL 以角色列表、角色搜索、成员/权限相关字段和行级操作作为核心体验
- **AND** 权限页 SHALL 以权限列表、权限搜索、角色引用相关字段和行级操作作为核心体验

#### Scenario: 角色和权限不渲染独立顶部工作台
- **WHEN** 系统渲染 `/roles` 或 `/permissions`
- **THEN** 页面 SHALL 使用统一列表标题、右上动作区、查询工具栏、表格壳和分页布局
- **AND** 页面 SHALL NOT 在表格上方渲染独立的角色风险矩阵、权限敏感度矩阵、引用关系矩阵或快捷入口工作台
- **AND** 页面 SHALL NOT 复用“KPI 卡 + 入口卡 + 质量核对 + 原列表说明”的机械工作台结构

#### Scenario: 顶部信息不压低列表主任务
- **WHEN** 管理员打开任一组织身份实体列表页
- **THEN** 原列表区域 SHALL 保持可见、可访问，并继续承载新增、编辑、删除、上传、筛选、排序和分页等既有操作
- **AND** 组织和用户页如展示辅助上下文，SHALL 使用紧凑低权重区域，不得压低表格主任务
- **AND** 角色和权限页 SHALL 在统一列表壳内优先呈现标题、搜索、动作、表格和分页
- **AND** 页面 SHALL NOT 使用粗糙灰色占位块或长篇产品说明替代表格主任务
- **AND** local-dev 或等价浏览器验证 SHALL 在 1440x900 桌面视口记录表格或核心列表入口的可见性；若某页表格顶部不能进入或接近首屏，验证记录 SHALL 说明具体原因

#### Scenario: 摘要仍保持只读当前视图口径
- **WHEN** 页面展示数量、风险、提示或辅助上下文
- **THEN** 文案 SHALL 使用短状态标签表达摘要来自当前列表视图、分页 total、已加载行数或前端只读状态
- **AND** 系统 SHALL NOT 声称新增了跨租户、跨组织或后端全量治理统计
- **AND** 页面 SHALL NOT 以“原列表仍是操作入口”“不包装成全量事实”等长句暴露实现痕迹
- **AND** 页面行动入口 SHALL 只导航到既有页面，不触发同步执行、授权刷新或 Gateway projection 操作

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

#### Scenario: 组织列表使用工具栏作为主搜索入口
- **WHEN** 管理员访问 `/organizations`
- **THEN** 页面 SHALL 在组织表格上方展示字段选择、关键词输入、查询、重置和更多筛选入口
- **AND** 主搜索 SHALL 覆盖组织名称、显示名称、主页地址等现有 `field + value` 后端参数能够表达的查询字段
- **AND** `添加` 主操作 SHALL 位于工具栏动作区，并继续遵守管理员权限
- **AND** 主搜索 SHALL NOT 依赖列头小搜索图标作为唯一或主要入口
- **AND** 表格列头 SHALL 继续保留排序能力

#### Scenario: 组织列表高级筛选提供真实字段输入
- **WHEN** 管理员在 `/organizations` 展开更多筛选
- **THEN** 高级筛选区域 SHALL 列出组织页当前可查询属性的真实输入控件
- **AND** 字段集合 SHALL 与组织页基础查询字段源保持一致，至少覆盖组织名称、显示名称、主页地址和密码盐
- **AND** 高级筛选 SHALL NOT 只展示“高级筛选”文本、空面板或无效占位

#### Scenario: 组织列表高级筛选按 AND 查询
- **WHEN** 管理员在组织列表高级筛选中填写多个非空条件并点击查询
- **THEN** 页面 SHALL 只展示同时满足所有非空高级条件的组织记录
- **AND** 空高级条件 SHALL 被忽略
- **AND** 若基础查询关键词也非空，基础查询条件 SHALL 与高级条件一起按 AND 参与过滤
- **AND** 当前页 total 和已加载结果 SHALL 与过滤后记录一致，不得沿用不匹配的后端单字段 total 误导用户

#### Scenario: 重置清空基础与高级查询
- **WHEN** 管理员点击组织列表查询工具栏的重置
- **THEN** 页面 SHALL 清空基础查询字段、基础关键词和所有高级筛选输入
- **AND** 页面 SHALL 回到第一页并重新加载未筛选的组织列表

#### Scenario: 空高级筛选不展示展开按钮
- **WHEN** 共享查询工具栏没有收到真实高级筛选内容
- **THEN** 工具栏 SHALL NOT 渲染“更多筛选”或“收起筛选”按钮
- **AND** 页面 SHALL NOT 展示可展开的空高级筛选面板

#### Scenario: 查询动作不改变后端语义
- **WHEN** 管理员在群组或组织查询工具栏选择字段并输入关键词后点击查询
- **THEN** 前端 SHALL 使用现有列表后端查询参数传递 `searchedColumn`、`searchText`、分页和排序语义
- **AND** 系统 SHALL NOT 新增 API、改变后端过滤语义或触发组织同步、认证、授权刷新、Gateway projection publish 等外部执行动作

#### Scenario: 写操作与查询按钮分组清楚
- **WHEN** 群组列表展示新增、下载模板或上传动作，或组织列表展示添加动作
- **THEN** 这些写操作 SHALL 与查询、重置、更多筛选按钮在视觉和结构上分组
- **AND** `新增群组` 或 `添加组织` SHALL NOT 被放在查询按钮组中

#### Scenario: 高级筛选默认不压低首屏表格
- **WHEN** 群组或组织列表首次渲染
- **THEN** 更多筛选区域 SHALL 默认折叠或保持紧凑
- **AND** 查询工具栏 SHALL NOT 引入大字号、状态带或长篇说明来压低表格主任务

#### Scenario: 复用组件保持窄边界
- **WHEN** 组织账号列表页复用共享查询工具栏组件
- **THEN** 组件 SHALL 使用 `.tsx` 并服务当前群组页和组织页查询工具栏
- **AND** 组件 MAY 在后续用户、邀请等列表页复用
- **AND** 本 change SHALL NOT 要求同批改造所有组织账号列表页

### Requirement: 群组列表表格视觉密度 polish
群组列表页 SHALL 在保持现有查询、筛选、排序、分页、上传、下载、添加、编辑和删除语义兼容的前提下，使用低噪声表格视觉、可扫描长字段和轻量行操作呈现群组数据。

#### Scenario: 长 ID 与用户字段适合表格扫描
- **WHEN** 管理员在桌面端访问 `/groups` 并查看群组表格
- **THEN** 群组名称、组织 ID、父级 ID、显示名称和用户字段 SHALL 在单元格内保持受控宽度
- **AND** 长值 SHALL 通过截断、tooltip、title、可点击链接或计数提示保留完整信息可达性
- **AND** 用户字段 SHALL NOT 因多个用户 ID 直接展开而显著增加整行横向负担

#### Scenario: 操作列降低重复按钮噪声
- **WHEN** 群组表格渲染行级操作
- **THEN** 编辑操作 SHALL 保持清晰可点击并进入既有群组编辑路由
- **AND** 删除操作 SHALL 保持现有确认、危险语义和删除调用
- **AND** 有子群组的记录 SHALL 继续禁用删除并展示既有删除前置条件提示
- **AND** 操作列 SHALL NOT 在每一行用两个同等高权重主按钮重复抢占视觉焦点

#### Scenario: 固定列与排序提示降噪
- **WHEN** 群组表格在桌面端使用固定列和排序列头
- **THEN** 固定操作列阴影、表头分割线和表格边框 SHALL 使用低噪声视觉
- **AND** 排序提示 SHALL 限定在自然 hover 或 focus 的排序图标区域，不得长期遮挡操作列
- **AND** 表格 SHALL 继续支持横向滚动、排序和稳定 row key

#### Scenario: 工具栏与业务语义保持兼容
- **WHEN** 管理员使用群组列表查询工具栏、类型筛选、重置、添加、下载模板、上传或分页
- **THEN** 前端 SHALL 继续使用现有 `GroupBackend` 查询、上传和删除契约
- **AND** 页面 SHALL NOT 新增 API、改变后端过滤语义、改变删除禁用条件或触发组织同步、认证、授权刷新、Gateway projection publish 等外部执行动作
- **AND** 移动端 SHALL 保持现有页面级横向溢出控制和表格横向滚动降级

### Requirement: 组织账号列表更多筛选内联展开
群组页和组织页的更多筛选 SHALL 使用工具栏内部向下展开的搜索区展示真实高级筛选字段，并保持既有查询、重置、分页、权限和后端参数语义兼容。

#### Scenario: 更多筛选不使用遮挡表格的浮层
- **WHEN** 管理员在 `/groups` 或 `/organizations` 点击更多筛选
- **THEN** 高级筛选字段 SHALL 在当前查询工具栏内部以内联区域展示
- **AND** 高级筛选 SHALL NOT 使用遮挡表格正文的 Popover 或悬浮卡片作为主要展示方式
- **AND** 表格 SHALL 被搜索区域自然下推，而不是被高级筛选控件覆盖

#### Scenario: 高级筛选字段可读且真实
- **WHEN** 更多筛选区域展开
- **THEN** 群组页 SHALL 展示名称、组织、显示名称、上级组和用户这些真实高级筛选输入
- **AND** 组织页 SHALL 展示名称、显示名称、主页地址和密码Salt值这些真实高级筛选输入
- **AND** 每个可见字段 label SHALL 使用英文冒号 `:` 标识字段与输入框关系
- **AND** 页面 SHALL NOT 展示只有“高级筛选”文本、空面板或无效占位的展开内容

#### Scenario: 更多筛选不改变查询契约
- **WHEN** 管理员填写更多筛选并点击查询或重置
- **THEN** 页面 SHALL 继续复用现有列表查询、前端 AND 过滤、分页 total 和重置语义
- **AND** 系统 SHALL NOT 新增 API、改变后端过滤语义或触发组织同步、认证、授权刷新、Gateway projection publish 等外部执行动作

### Requirement: 群组列表默认字段收敛
群组列表页 SHALL 在保持现有查询、筛选、排序、分页和写操作语义兼容的前提下，默认只展示适合扫描和操作的核心字段，并把详情级技术字段从默认列中移出。

#### Scenario: 默认列聚焦核心识别和操作
- **WHEN** 管理员在桌面端访问 `/groups`
- **THEN** 群组表格默认列 SHALL 包含群组、上级组、用户、更新时间和操作
- **AND** 默认列 SHALL NOT 单独展示组织技术 ID、类型、创建时间、显示名称或完整用户列表列
- **AND** 群组列 SHALL 以显示名称或名称作为主文本，并保留技术名称可查看或复制
- **AND** 类型筛选 SHALL 保留在列表工具栏或筛选入口中，以便管理员按现有后端类型语义过滤

#### Scenario: 用户列展示数量而不是成员 chip
- **WHEN** 群组记录包含零个、一个或多个用户
- **THEN** 用户列 SHALL 展示 `无用户` 或用户数量
- **AND** 用户列 SHALL NOT 在默认表格中直接展开多个用户 ID chip

#### Scenario: 桌面默认不出现横向滚动轴
- **WHEN** 管理员在桌面端查看群组列表
- **THEN** 表格 SHALL 使用容器内列宽分配展示默认列
- **AND** 表格 SHALL NOT 在桌面端依赖默认横向滚动轴才能看到操作列
- **AND** 群组列表默认分页 SHALL 使用 `20 条/页` 以减少桌面首屏空白
- **AND** 窄屏或移动端 MAY 使用表格内部横向滚动作为兜底

#### Scenario: 既有业务语义保持兼容
- **WHEN** 管理员使用群组列表查询、更多筛选、类型筛选、排序、分页、添加、上传、下载模板、编辑或删除
- **THEN** 前端 SHALL 继续复用现有 `GroupBackend` 查询、上传和删除契约
- **AND** 系统 SHALL NOT 新增 API、改变后端过滤语义、改变删除禁用条件或触发组织同步、认证、授权刷新、Gateway projection publish 等外部执行动作

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

### Requirement: 组织列表默认字段与表格复用
组织列表页 SHALL 复用共享列表页表格、查询工具栏、主识别单元和轻量行操作模式，在保持组织页专属查询字段、目录健康上下文和既有业务操作兼容的前提下，默认展示更适合扫描的核心组织字段。

#### Scenario: 默认列隐藏低频详情字段
- **WHEN** 管理员在桌面端访问 `/organizations`
- **THEN** 组织表格默认列 SHALL 包含组织主识别、主页/来源摘要、密码策略、软删除状态、创建时间和操作
- **AND** 默认列 SHALL NOT 独立展示 `passwordSalt`、`defaultAvatar`、`favicon`、`orgBalance`、`userBalance`、`balanceCredit` 或 `balanceCurrency`
- **AND** 页面 SHALL NOT 删除这些字段的数据模型或阻止详情页继续读取相关字段

#### Scenario: 组织主识别列承载名称和技术标识
- **WHEN** 组织表格渲染默认列表
- **THEN** 组织主识别列 SHALL 以显示名或组织名作为主文本
- **AND** 组织技术 ID SHALL 作为次级文本展示，并提供低权重复制入口
- **AND** favicon MAY 在主识别单元内作为小尺寸图标展示
- **AND** 长组织名、技术 ID 和主页地址 SHALL 截断或提供 tooltip，不得撑高整行或制造默认横向滚动依赖

#### Scenario: 组织列表复用共享表格和列表单元模式
- **WHEN** 组织列表渲染表格
- **THEN** 表格 SHALL 使用共享列表页表格壳承载统一密度、边框、排序提示和固定布局
- **AND** 主识别单元、弱复制入口和轻量行操作 SHALL 优先复用共享列表页组件或共同属性
- **AND** 查询工具栏、表格 title 区、panel 间距、查询控件宽度、表头/单元格 padding 和表格滚动条 SHALL 优先使用共享 `--list-page-*` 布局 token 或 `ListPageTable` 默认包装
- **AND** 组织页 SHALL 继续提供自己的列定义、row key、分页、loading、排序和查询回调
- **AND** 组织页 SHALL NOT 为了复用而改写群组页字段、群组类型筛选或群组用户列语义

#### Scenario: 组织添加动作位于查询工具栏动作区
- **WHEN** 组织列表展示 `添加` 操作
- **THEN** `添加` SHALL 位于共享查询工具栏的动作区
- **AND** `添加` SHALL 与查询、重置和更多筛选按钮形成清晰分组
- **AND** 非管理员账号 SHALL 继续不可执行添加组织

#### Scenario: 组织行操作低噪声展示
- **WHEN** 组织列表渲染行级操作
- **THEN** 群组、用户、编辑和删除 SHALL 保留既有路由、删除确认和内置组织删除禁用语义
- **AND** 行级操作 SHALL 使用轻量文字或图标文字动作组
- **AND** 行级操作 SHALL NOT 在每行使用多个同权重主按钮抢占组织数据焦点

#### Scenario: 目录健康上下文不挤压搜索行
- **WHEN** 组织列表展示目录健康、同步来源、边界和目录质量入口
- **THEN** 这些上下文 SHALL 以低权重辅助区域展示在查询工具栏主筛选控件组之外
- **AND** 桌面端 MAY 使用工具栏右侧辅助槽位承载该上下文
- **AND** 搜索行 SHALL 优先保留字段选择、关键词、查询、重置、更多筛选和动作区的稳定布局
- **AND** 页面 SHALL NOT 因目录健康长文本导致查询控件压缩、换行或遮挡

#### Scenario: 桌面端只滚动表格数据区域
- **WHEN** 管理员在桌面端查看 `/organizations`
- **THEN** 表格 SHALL 使用内部纵向滚动展示数据行
- **AND** 标签页、查询工具栏和目录健康辅助上下文 SHALL 保持在表格数据滚动区域之外
- **AND** 桌面端 SHALL NOT 依赖默认横向滚动轴才能看到操作列
- **AND** 窄屏或移动端 MAY 使用表格内部横向滚动作为兜底

#### Scenario: 组织列表默认分页使用 20 条
- **WHEN** 管理员首次打开组织列表
- **THEN** 默认分页 SHALL 使用 `20 条/页`
- **AND** 页面 SHALL 继续允许用户通过分页控件选择其它既有 pageSize

#### Scenario: 既有组织列表业务语义保持兼容
- **WHEN** 管理员使用组织列表查询、更多筛选、排序、分页、添加、编辑、删除、群组跳转、用户跳转或目录质量入口
- **THEN** 前端 SHALL 继续复用现有 `OrganizationBackend` 查询、前端高级筛选、分页 total 和行级操作语义
- **AND** 系统 SHALL NOT 新增 API、改变后端过滤语义、改变删除禁用条件或触发组织同步、认证、授权刷新、Gateway projection publish 等外部执行动作

### Requirement: 用户列表默认字段与表格密度收敛
用户列表页 SHALL 在保持现有查询、排序、分页、上传、下载模板、新增、编辑、删除、移出群组和模拟登录语义兼容的前提下，默认展示适合管理员扫描和操作的核心账号字段，并把详情级技术字段从默认列中降权或移出。

#### Scenario: 默认列聚焦账号识别和操作
- **WHEN** 管理员在桌面端访问 `/users`
- **THEN** 用户表格默认列 SHALL 包含用户识别、联系方式、验证状态、账号时间和操作
- **AND** 用户识别列 SHALL 以显示名称或用户名作为主文本，并保留技术用户名、组织或应用归属信息可查看
- **AND** 用户识别列 SHALL 优先复用共享列表页主识别单元组件或共同属性承载主文本、辅助文本、弱复制入口和可选图标
- **AND** 默认列 SHALL NOT 单独展示组织技术 ID、应用技术 ID、注册来源、余额、管理员开关、禁用开关或删除开关

#### Scenario: 头像展示有兜底
- **WHEN** 用户记录的头像为空或图片加载失败
- **THEN** 表格 SHALL 展示稳定的默认头像、首字兜底或等价占位
- **AND** 页面 SHALL NOT 在默认表格中展示破图图标作为主要视觉元素

#### Scenario: 只读状态不伪装成可操作开关
- **WHEN** 用户表格展示验证、禁用、删除或类似只读状态
- **THEN** 默认表格 SHALL 使用状态标签或等价只读展示
- **AND** 页面 SHALL NOT 用禁用 switch 作为默认验证状态展示方式误导用户这是可直接操作控件

#### Scenario: 桌面默认不依赖横向滚动完成扫描
- **WHEN** 管理员在桌面端查看用户列表
- **THEN** 表格 SHALL 使用容器内列宽分配展示默认列
- **AND** 表格 SHALL NOT 在桌面端依赖默认横向滚动轴才能看到操作列
- **AND** 窄屏、移动端或组织树嵌入场景 MAY 使用表格内部横向滚动作为兜底

#### Scenario: 既有用户列表业务语义保持兼容
- **WHEN** 管理员使用用户列表查询、排序、分页、添加、上传、下载模板、编辑、删除、移出群组或模拟登录
- **THEN** 前端 SHALL 继续复用现有 `UserBackend` 查询、上传、删除、移出群组和模拟登录契约
- **AND** 系统 SHALL NOT 新增 API、改变后端过滤语义、改变删除禁用条件或触发组织同步、认证刷新、授权刷新、Gateway projection publish 等外部执行动作

#### Scenario: 更多筛选复用共享工具栏且不改变后端查询契约
- **WHEN** 管理员在用户列表打开更多筛选
- **THEN** 页面 SHALL 复用共享列表查询工具栏的扩展筛选区域展示用户查询字段
- **AND** 扩展筛选字段标签 SHALL 使用统一的英文冒号 `:`
- **AND** 用户页 SHALL 将扩展筛选输入映射回现有单字段 `field + value` 查询契约
- **AND** 用户页 SHALL NOT 在后端分页结果上执行多字段当前页前端过滤来伪造全量高级搜索

#### Scenario: 同类列表文本层级共享样式语义
- **WHEN** 管理员在组织、群组和用户列表之间切换
- **THEN** 主对象文本、辅助文本、普通链接、状态标签和行操作 SHALL 使用共享 `enterprise-list-*` 样式语义
- **AND** 同类文本 SHALL 保持一致字号和行高，避免组织、群组、用户列表出现明显割裂的文本密度
- **AND** 用户列表行操作 SHALL 优先复用共享列表页轻量行操作组件或共同属性，并保留既有编辑、删除、移出群组和模拟登录行为

### Requirement: 组织账号列表页壳统一
组织账号下的组织、群组和用户列表页 SHALL 使用同一套共享列表页壳呈现标题、查询控件、右侧动作、辅助上下文和分页区域，并保持各自列表字段和业务操作语义兼容。

#### Scenario: 标题和动作位于共享工具栏
- **WHEN** 管理员在桌面端访问 `/organizations`、`/groups` 或 `/users`
- **THEN** 页面对象标题 SHALL 由共享查询工具栏 header 呈现
- **AND** 新增、下载模板、上传或等价主动作 SHALL 位于共享查询工具栏动作区
- **AND** 页面 SHALL NOT 同时使用另一套页面私有 top action 区造成标题或动作位置漂移

#### Scenario: 组织目录健康使用共享辅助上下文槽
- **WHEN** 组织列表展示目录健康、同步来源、边界和目录质量入口
- **THEN** 信息 SHALL 位于共享查询工具栏标题下方的辅助上下文槽
- **AND** 该上下文 SHALL 与查询控件和动作区保持清晰分组
- **AND** 该上下文 SHALL NOT 与标题和添加动作挤在同一行
- **AND** 页面 SHALL NOT 因目录健康文本挤压字段选择、关键词输入、查询、重置、更多筛选或添加动作

#### Scenario: 分页展示规则一致
- **WHEN** 组织、群组或用户列表渲染分页
- **THEN** 分页 SHALL 使用共享分页配置或等价公共 helper
- **AND** 总数、页码、每页条数和跳页区域 SHALL 作为右侧分页组呈现
- **AND** 页面 SHALL NOT 为其中一个列表单独实现不同顺序、不同权重或不同间距的分页导航

#### Scenario: 自动化检查覆盖列表壳漂移
- **WHEN** 前端测试验证组织、群组和用户列表
- **THEN** 测试 SHALL 覆盖共享工具栏标题、动作区、辅助上下文槽和分页配置
- **AND** 测试 SHALL 能发现新增入口回到页面私有 top action 或分页配置脱离公共 helper 的回归

#### Scenario: 既有业务语义保持兼容
- **WHEN** 管理员使用组织、群组或用户列表查询、更多筛选、排序、分页、添加、上传、下载模板、编辑、删除、移出群组或模拟登录
- **THEN** 前端 SHALL 继续复用既有后端查询、上传、删除、跳转和权限契约
- **AND** 系统 SHALL NOT 新增 API、改变后端过滤语义、改变删除禁用条件或触发组织同步、认证刷新、授权刷新、Gateway projection publish 等外部执行动作

### Requirement: 组织账号列表页应使用统一列表壳
Admin 组织账号列表页 SHALL 对标准分页列表复用统一列表壳、查询工具栏、表格密度和分页视觉规则。

#### Scenario: 邀请码列表迁移到统一列表壳
- **WHEN** 管理员打开 `/invitations`
- **THEN** 页面 SHALL 使用统一的列表标题、右上动作区、查询工具栏、表格壳和分页布局
- **AND** 新增、编辑、删除、查询、排序和分页行为 SHALL 保持现有后端契约不变

#### Scenario: 授权关系与证据暂不纳入本次迁移
- **WHEN** 管理员打开 `/identity-assets`
- **THEN** 本 change SHALL NOT 强制迁移该页面到标准查询分页列表壳
- **AND** 授权关系与证据页面 SHALL 保留后续单独评估空间

### Requirement: 组织账号共享列表壳暗黑主题一致性
Admin 组织账号域下使用共享列表壳的标准分页列表页 SHALL 在明亮与暗黑模式下使用同一套主题 token 呈现标题、结果数、查询工具栏、表格外层 panel、辅助上下文和分页区，避免列表壳在暗黑模式下出现亮色漂移。

#### Scenario: 暗黑模式下组织账号列表壳保持统一层级
- **WHEN** 管理员在暗黑模式下访问 `/organizations`、`/groups`、`/users`、`/invitations` 或其它复用共享列表壳的组织账号分页列表
- **THEN** 列表标题区、结果数分隔、查询工具栏、表格外层 panel 和分页区 SHALL 使用共享暗黑主题 surface、border 和 text token
- **AND** 页面 SHALL NOT 在暗黑背景中留下白底 outer panel、亮色结果数分隔线或失真的分页背景

#### Scenario: 目录健康与辅助上下文不再使用固定浅色样式
- **WHEN** 组织列表在标题或查询工具栏附近展示目录健康、同步来源、边界信息或等价辅助上下文
- **THEN** 这些辅助上下文 SHALL 使用共享 secondary text、warning 和 divider token 表达层级
- **AND** 辅助上下文 SHALL NOT 因固定浅灰背景、浅灰边框或错误文字色而在暗黑模式下形成突兀亮块

#### Scenario: 组织诊断与质量页面局部 Card 使用共享主题
- **WHEN** 管理员在暗黑模式下访问 `/organization-tree-operations` 或 `/organization-directory-quality`
- **THEN** 诊断摘要、修复计划、查询控件、默认按钮、表格、Segmented、Tree 和空态 SHALL 使用共享 shell surface、border 和 text token
- **AND** 页面 SHALL NOT 残留固定浅色边框、Ant Design 默认黑色 surface 或与组织/群组列表不一致的默认 Tag 层级

#### Scenario: 组织账号列表不叠加第二套页面外边距
- **WHEN** 组织、群组、用户、邀请码或组织内用户等标准分页列表复用共享列表壳
- **THEN** 页面外层 SHALL 消费统一 route/page shell spacing，列表壳内部仅保留自身 panel padding、查询工具栏节奏和分页布局
- **AND** 页面 SHALL NOT 因消费者级 padding、margin 或额外外框造成与群组列表边界不一致

### Requirement: 组织编辑页长表单标签完整可读
Admin 组织编辑页 SHALL 在桌面端稳定展示包含密码策略在内的长中文表单标签，避免标签文本被左侧边界、侧栏或表单 label column 裁切。

#### Scenario: 密码配置长标签不裁切
- **WHEN** 管理员在桌面端打开组织编辑页并查看密码相关字段
- **THEN** `密码Salt值`、`密码复杂度选项`、`密码类型` 或等价长标签 SHALL 完整可见
- **AND** 标签 SHALL NOT 与页面侧栏边界、表单容器边界或输入控件发生视觉重叠
- **AND** 页面 SHALL NOT 因修复引入正文区域横向 overflow

#### Scenario: 修复限定在组织编辑页
- **WHEN** 前端修复组织编辑页表单标签布局
- **THEN** 修复 SHALL 使用组织编辑页 scoped class、页面局部 Form 布局配置或等价窄边界方式
- **AND** 修复 SHALL NOT 通过全局 AntD Form label selector 改变 common/table/auth/provider/root shell 或其它编辑页表单布局

#### Scenario: 组织保存和密码配置语义保持兼容
- **WHEN** 管理员查看、编辑或保存组织编辑页
- **THEN** 前端 SHALL 继续使用既有组织读取和保存契约
- **AND** 密码盐、密码类型、密码复杂度选项和其它密码配置字段 SHALL 保持现有字段、选项和 payload 语义不变
- **AND** 系统 SHALL NOT 新增后端 API、改变组织同步、认证、授权刷新或 Gateway projection publish 行为

### Requirement: 身份控制台管理导航展示钉钉同步入口
Web Admin 身份控制台 SHALL 将钉钉组织同步展示为管理导航入口，并且不新增抽象一级中心。

#### Scenario: 展示钉钉同步菜单
- **WHEN** 管理员打开身份控制台管理导航
- **THEN** 导航 SHALL 在现有企业通讯录同步入口附近包含 `钉钉同步` 菜单项
- **AND** 该菜单项 SHALL 跳转到 `/dingtalk-org-sync`

#### Scenario: 保持已有同步入口语义
- **WHEN** 钉钉同步入口被加入
- **THEN** 既有 WeCom 和 Feishu/Lark 同步入口 SHALL 保持原路由路径和选中行为
- **AND** 导航 SHALL NOT 新增抽象“中心”、“工作台”或“快捷入口”根节点
