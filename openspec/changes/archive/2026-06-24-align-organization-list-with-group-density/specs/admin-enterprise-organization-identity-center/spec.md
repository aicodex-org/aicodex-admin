## MODIFIED Requirements

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
