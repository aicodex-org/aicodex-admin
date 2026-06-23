## ADDED Requirements

### Requirement: 组织列表默认字段与表格复用
组织列表页 SHALL 复用共享列表页表格和查询工具栏模式，在保持组织页专属查询字段、目录健康上下文和既有业务操作兼容的前提下，默认展示更适合扫描的核心组织字段。

#### Scenario: 默认列隐藏低频详情字段
- **WHEN** 管理员在桌面端访问 `/organizations`
- **THEN** 组织表格默认列 SHALL 包含组织名称、创建时间、显示名称、favicon、主页地址、密码类型、软删除状态和操作
- **AND** 默认列 SHALL NOT 展示 `passwordSalt`、`defaultAvatar`、`orgBalance`、`userBalance`、`balanceCredit` 或 `balanceCurrency`
- **AND** 页面 SHALL NOT 删除这些字段的数据模型或阻止详情页继续读取相关字段

#### Scenario: 组织列表复用共享表格壳
- **WHEN** 组织列表渲染表格
- **THEN** 表格 SHALL 使用共享列表页表格壳承载统一密度、边框、排序提示和固定布局
- **AND** 组织页 SHALL 继续提供自己的列定义、row key、分页、loading、排序和查询回调
- **AND** 组织页 SHALL NOT 为了复用而改写群组页字段、群组类型筛选或群组用户列语义

#### Scenario: 组织添加动作位于查询工具栏动作区
- **WHEN** 组织列表展示 `添加` 操作
- **THEN** `添加` SHALL 位于共享查询工具栏的动作区
- **AND** `添加` SHALL 与查询、重置和更多筛选按钮形成清晰分组
- **AND** 非管理员账号 SHALL 继续不可执行添加组织

#### Scenario: 桌面端只滚动表格数据区域
- **WHEN** 管理员在桌面端查看 `/organizations`
- **THEN** 表格 SHALL 使用内部纵向滚动展示数据行
- **AND** 标签页、查询工具栏和目录健康辅助上下文 SHALL 保持在表格数据滚动区域之外
- **AND** 桌面端 SHALL NOT 依赖默认横向滚动轴才能看到操作列
- **AND** 窄屏或移动端 MAY 使用表格内部横向滚动作为兜底

#### Scenario: 既有组织列表业务语义保持兼容
- **WHEN** 管理员使用组织列表查询、更多筛选、排序、分页、添加、编辑、删除、群组跳转、用户跳转或目录质量入口
- **THEN** 前端 SHALL 继续复用现有 `OrganizationBackend` 查询、前端高级筛选、分页 total 和行级操作语义
- **AND** 系统 SHALL NOT 新增 API、改变后端过滤语义、改变删除禁用条件或触发组织同步、认证、授权刷新、Gateway projection publish 等外部执行动作
