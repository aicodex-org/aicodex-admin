## ADDED Requirements

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
