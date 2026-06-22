## ADDED Requirements

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
