# admin-enterprise-identity-auth-source-center Specification

## Purpose
定义 Admin 身份控制台认证源管理的列表、编辑、连接配置与兼容性边界，使管理员能够一致地维护 Provider 和 Syncer，同时避免页面浏览或普通编辑自动触发外部系统操作。
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

### Requirement: 身份源列表页应使用统一列表壳
Admin 身份源相关的标准分页列表页 SHALL 复用统一列表壳、查询工具栏、表格密度和分页视觉规则。

#### Scenario: 组织同步密钥列表迁移到统一列表壳
- **WHEN** 管理员打开 `/organization-sync-api-keys`
- **THEN** 页面 SHALL 使用统一的列表标题、右上动作区、查询工具栏、表格壳和分页布局
- **AND** 新增、编辑、删除、查询、排序和分页行为 SHALL 保持现有后端契约不变

#### Scenario: 同步器列表迁移到统一列表壳
- **WHEN** 管理员打开 `/syncers`
- **THEN** 页面 SHALL 使用统一的列表标题、右上动作区、查询工具栏、表格壳和分页布局
- **AND** 新增、编辑、删除、查询、排序和分页行为 SHALL 保持现有后端契约不变

### Requirement: Provider 编辑页使用共享大型编辑壳
Provider 编辑页 SHALL 复用 Admin 共享大型编辑页壳呈现页面头部、面包屑、滚动正文和底部动作栏，并保持既有 Provider 配置和保存行为兼容。

#### Scenario: Provider 编辑页头部和动作栏统一
- **WHEN** 管理员打开 Provider 新增或编辑页
- **THEN** 页面 SHALL 使用共享大型编辑页壳展示返回入口、认证源面包屑、Provider 标题和底部动作栏
- **AND** 取消、保存、保存并返回 SHALL 位于共享底部动作栏
- **AND** 页面 SHALL NOT 同时在 Card title 或页面外层渲染重复保存按钮

#### Scenario: Provider 基础配置使用共享正文样式
- **WHEN** 管理员查看 Provider 基础字段
- **THEN** 名称、显示名称、组织、类别、类型、子类型、方法、Scope 和 Provider URL 等稳定字段 SHALL 使用共享区块和字段行样式
- **AND** 标签、控件宽度、文字密度和窄屏换行规则 SHALL 与已迁移的大型编辑页保持一致

#### Scenario: Provider 配置语义保持兼容
- **WHEN** 管理员切换 Provider 类别或类型并保存
- **THEN** 前端 SHALL 继续使用既有 Provider 字段默认值、校验、保存和删除方法
- **AND** 编辑态取消 SHALL 返回 Provider 列表，添加态取消 SHALL 继续删除列表页预创建的临时 Provider
- **AND** 系统 SHALL NOT 新增 API、改变保存 payload、改变 OAuth/OIDC/SAML/WeCom/Lark 字段语义、触发真实 provider 探测、认证刷新、授权刷新或组织同步

#### Scenario: Provider 编辑页布局回归可测试
- **WHEN** 前端测试验证 Provider 编辑页
- **THEN** 测试 SHALL 覆盖共享编辑壳、共享底部动作栏、关键基础字段和旧重复按钮移除
- **AND** 测试 SHALL 能发现 Provider 编辑页回退到旧 Card title 操作区或页面底部重复按钮的回归

### Requirement: Syncer 编辑页使用共享大型编辑壳
Syncer 编辑页 SHALL 复用 Admin 共享大型编辑页壳呈现页面头部、面包屑、滚动正文和底部动作栏，并保持既有同步配置、连接测试和保存行为兼容。

#### Scenario: Syncer 编辑页头部和动作栏统一
- **WHEN** 管理员打开 Syncer 新增或编辑页
- **THEN** 页面 SHALL 使用共享大型编辑页壳展示返回入口、身份源面包屑、Syncer 标题和底部动作栏
- **AND** 取消、保存、保存并返回 SHALL 位于共享底部动作栏
- **AND** 页面 SHALL NOT 同时在 Card title 或页面正文末尾渲染重复保存按钮

#### Scenario: Syncer 多 tabs 正文保持可扫描
- **WHEN** 管理员查看 Syncer 配置
- **THEN** 基本信息、连接配置、映射与状态 SHALL 以三个页内 tabs 呈现
- **AND** 当前 tab SHALL 写入 URL hash，并在刷新后恢复
- **AND** 当前 tab 正文 SHALL 使用共享分类标题样式标识当前配置域
- **AND** 页面 SHALL 复用共享大型编辑页的标签、控件、表格、暗色和窄屏样式边界
- **AND** 页面 SHALL NOT 因局部表格或长字段产生页面级横向 overflow

#### Scenario: 组织选项显示名称和标识一致
- **WHEN** 管理员展开或搜索 Syncer 的组织选择器
- **THEN** 选项 SHALL 优先显示组织显示名称，并在显示名称与标识不同时同时展示组织标识
- **AND** 搜索 SHALL 同时匹配显示名称和标识
- **AND** 提交值 SHALL 继续使用组织标识

#### Scenario: Syncer 业务契约保持兼容
- **WHEN** 管理员切换 Syncer 类型、编辑动态字段、测试连接、保存或取消
- **THEN** 前端 SHALL 继续使用既有类型默认值、字段出现条件、连接测试、保存和删除方法
- **AND** 编辑态和添加态取消 SHALL 返回 Syncer 列表，添加态 SHALL 只在保存时创建 Syncer
- **AND** 系统 SHALL NOT 新增 API 或改变保存 payload
- **AND** 页面初始化、tab 切换和普通字段编辑 SHALL NOT 自动触发连接测试、真实数据库连接或外部目录同步

#### Scenario: Syncer 编辑页回归可测试
- **WHEN** 前端测试验证 Syncer 编辑页
- **THEN** 测试 SHALL 覆盖共享编辑壳、三个 tabs、hash 恢复、唯一底部动作栏、代表性动态字段、保存 payload 和添加态取消
- **AND** 测试 SHALL 能发现回退到旧 Card title 操作区或页面末尾重复按钮的回归

