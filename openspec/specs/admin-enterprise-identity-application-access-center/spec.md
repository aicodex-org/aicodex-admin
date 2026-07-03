# admin-enterprise-identity-application-access-center Specification

## Purpose
TBD - created by archiving change implement-admin-enterprise-identity-application-access-center. Update Purpose after archive.
## Requirements
### Requirement: 应用接入中心工作区
Admin 企业认证中心 SHALL 在应用接入分组下提供列表优先的应用接入中心工作区，使管理员能够从 `/applications` 首屏扫描已接入应用、OAuth/OIDC client、API 映射、回调地址、授权范围、配置缺口和后续操作入口。

#### Scenario: 管理员打开应用接入中心
- **WHEN** 已登录管理员访问 `/applications`
- **THEN** 页面展示应用接入中心标题、接入完整度摘要、配置缺口和主要配置入口
- **AND** 页面仍展示既有 Application 列表和新增、复制、编辑、删除入口
- **AND** Application 列表或列表操作入口在 1440x900 桌面首屏内可感知

#### Scenario: 应用接入中心展示控制台结构
- **WHEN** 管理员访问 `/applications`
- **THEN** 页面 SHALL 使用列表优先结构展示当前筛选摘要、应用接入缺口、关键配置入口和既有列表承载区
- **AND** 应用接入卡片网格 SHALL 降权为紧凑摘要或辅助入口，不得取代列表成为首屏主任务
- **AND** 页面 SHALL 使用“当前筛选”“只读核对”“配置缺口”等操作文案，不展示“只读推导”“当前列表视图”等实现痕迹文案

#### Scenario: 既有应用列表仍可操作
- **WHEN** 管理员在应用接入中心查看 Application 表格
- **THEN** 既有分页、筛选、排序、新增、复制、编辑和删除行为保持可用
- **AND** 应用接入中心不得改变 Application 表格的路由、权限 key 或数据写入行为

### Requirement: 应用接入状态与配置完整度
应用接入中心 SHALL 基于现有只读 Application 数据展示当前列表视图的接入完整度、启用/停用、回调地址配置、授权范围、Provider 绑定、Provider 身份源目标组织和 OAuth/OIDC client 配置状态，不得展示 client secret、token 或其它敏感字段原值。

#### Scenario: 应用配置完整
- **WHEN** Application 列表中存在启用应用
- **AND** 该应用具备 `clientId`、回调地址、授权范围和 Provider 绑定
- **AND** 启用的企业身份 Provider 具备明确目标组织或可解释的默认组织 fallback
- **THEN** 应用接入中心将该应用计入“接入完整”或“低风险”摘要
- **AND** 页面提供进入应用编辑、API 映射和审计记录的入口

#### Scenario: 应用配置不完整
- **WHEN** Application 缺少回调地址、授权范围、Provider 绑定、Provider 身份源目标组织或 `clientId`
- **THEN** 应用接入中心 SHALL 展示对应待补全风险摘要
- **AND** 页面 SHALL 提供进入应用编辑或相关配置页的入口

#### Scenario: 应用停用或禁止登录
- **WHEN** Application 标记为停用或 `disableSignin` 为 true
- **THEN** 应用接入中心 SHALL 将其展示为停用或需核对状态
- **AND** 不得触发任何启用、授权或回调执行动作

#### Scenario: Application 数据加载中或为空
- **WHEN** Application 列表正在加载或返回空数组
- **THEN** 应用接入中心 SHALL 展示加载、待接入或空态提示
- **AND** 页面仍保留进入新增应用、API 映射、Provider 和审计记录的入口

### Requirement: 配置入口聚合
应用接入中心 SHALL 聚合应用接入相关入口，至少覆盖 Application 编辑、API 网关映射、OAuth/OIDC Provider 配置、资源、证书、密钥、Webhook 和审计记录，并 SHALL 使用当前语言的企业管理台标签。

#### Scenario: 管理员查看配置入口
- **WHEN** 管理员查看应用接入中心
- **THEN** 页面展示应用列表、API 映射、认证源、资源、证书、密钥、Webhook 和审计记录入口
- **AND** 每个入口 SHALL 跳转到既有路由，不新增不兼容路由
- **AND** 中文界面 SHALL NOT 残留 `Keys`、`Webhooks`、`Webhook Events` 等未本地化入口标签

#### Scenario: 缺少真实后端聚合接口
- **WHEN** 前端没有真实全量应用接入聚合接口
- **THEN** 页面 SHALL 明确当前摘要来自当前筛选、已加载应用或既有配置页
- **AND** 后续全量只读聚合接口契约 SHALL 通过单独 change 定义

### Requirement: 只读安全边界与企业管理台视觉
应用接入中心 SHALL 使用安静、信息密度合理的企业管理台布局，避免营销式 hero、装饰背景和卡片套卡片；该工作区 SHALL 只展示只读状态和入口，不得触发认证、授权、回调、密钥写入、同步执行或 Gateway projection publish。

#### Scenario: 只读风险摘要
- **WHEN** 管理员查看应用接入风险摘要
- **THEN** 页面只展示风险类别、数量、状态标签和跳转入口
- **AND** 不展示 `clientSecret`、token、真实敏感配置或可复用凭据

#### Scenario: 应用接入治理闭环
- **WHEN** 管理员查看应用接入配置缺口
- **THEN** 页面 SHALL 同时展示缺口类别、影响数量、只读边界和进入应用编辑、API 映射、Provider 或审计记录的下一步入口
- **AND** 不仅展示孤立的指标数字

#### Scenario: 桌面和窄屏访问
- **WHEN** 管理员在桌面端或窄屏访问应用接入中心
- **THEN** 文本、状态标签、按钮、卡片和表格区域不发生重叠或不可读溢出
- **AND** 页头、摘要和入口区域 SHALL 使用紧凑间距，避免移动端几千像素后才出现列表
- **AND** 配置和诊断入口仍可触达

### Requirement: Provider 身份源绑定配置
应用编辑页 SHALL 允许管理员为每个启用的登录 Provider 配置目标组织，用于决定该 Provider 登录时在哪个组织中匹配用户。

#### Scenario: 管理员配置飞书目标组织
- **WHEN** 管理员在同一个 OIDC Application 中启用 Lark/Feishu Provider
- **THEN** 页面 SHALL 允许将该 Provider 的目标组织设置为飞书组织同步目标，例如 `feishu-test`
- **AND** 页面 SHALL 说明 Application 组织仍是应用归属/默认组织，不等同于每个 Provider 的登录查找组织

#### Scenario: 未配置目标组织
- **WHEN** Provider binding 没有设置目标组织
- **THEN** 页面 SHALL 展示“使用应用默认组织”或等价说明
- **AND** 保存后 SHALL 保持空值，不强行写入当前默认组织

### Requirement: 应用接入中心保留通用接入职责
`/applications` 应用接入中心 SHALL 保留通用 Application、OAuth/OIDC、API 映射和 Provider 接入入口职责；用量链路 `Insight Admin Provider` 交接内容 SHALL 只由 `/application-usage-access` 页面承接，中心页不得因此扩成泛配置中心或破坏既有 Application 列表工作流。

#### Scenario: 应用接入中心仍展示通用入口
- **WHEN** 管理员打开 `/applications`
- **THEN** 页面 SHALL 继续展示 Application 列表、接入完整度摘要、通用配置缺口和 Application 新增、复制、编辑、删除入口
- **AND** 页面 SHALL 继续提供 API 映射、OAuth/OIDC Provider、资源、证书、密钥、Webhook 和审计记录等既有入口
- **AND** 页面 SHALL NOT 渲染 `服务凭据治理`、`Insight Admin Provider 交接` 或用量 provider 配置中心摘要、状态、tab、按钮或入口卡片
- **AND** `/application-usage-access` SHALL 仅通过 `应用接入` 分组二级导航进入

#### Scenario: 用量链路治理从中心页降噪
- **WHEN** 页面需要展示 Insight provider trust、Usage identity resolver、Gateway organization projection 或 keep-in-env/config 治理内容
- **THEN** `/applications` SHALL NOT 请求或渲染旧服务凭据治理运行态状态
- **AND** 详细 owner evidence 摘要、readiness、manual/secretRef 指引或 copy-safe package 内容 SHALL 在 `/application-usage-access` 聚焦页承接
- **AND** 应用接入中心 SHALL NOT 新增与用量链路相关或无直接关系的泛服务凭据配置区

### Requirement: 应用访问对象列表体验一致性
应用接入中心 SHALL 使资源、证书、密钥、Webhook 回调和 Webhook 事件列表使用一致的企业管理台列表结构，提供统一的标题/结果摘要、主搜索、重置、更多筛选和低噪声表格操作体验，同时保持既有后端查询和业务动作语义不变。

#### Scenario: 管理员查看应用访问对象列表
- **WHEN** 管理员访问资源、证书、密钥、Webhook 回调或 Webhook 事件列表
- **THEN** 页面 SHALL 使用公共列表表格壳展示数据、分页、加载态和排序态
- **AND** 页面 SHALL 使用统一查询工具栏展示列表标题、结果数量、主搜索、重置和更多筛选入口
- **AND** 页面 SHALL 保持与组织、群组、用户列表一致的紧凑间距、表头密度和操作按钮权重

#### Scenario: 管理员执行主搜索
- **WHEN** 管理员在资源、证书、密钥、Webhook 回调或 Webhook 事件列表选择查询字段并输入关键词
- **THEN** 页面 SHALL 将选中字段和关键词映射到该页面既有后端 `field` 与 `value` 查询参数
- **AND** 页面 SHALL 保持既有分页、排序、权限、路由和返回数据处理语义
- **AND** 页面 SHALL NOT 在前端用当前页数据伪造跨字段搜索结果

#### Scenario: 管理员使用更多筛选
- **WHEN** 管理员打开更多筛选并填写资源、证书、密钥、Webhook 回调或 Webhook 事件列表支持的字段
- **THEN** 页面 SHALL 通过稳定、可解释的字段映射触发既有单字段查询能力
- **AND** 更多筛选 SHALL NOT 新增后端 API、改变请求路径或改变写入类动作
- **AND** 重置 SHALL 清空主搜索、更多筛选和已生效查询字段，并回到第一页加载列表

#### Scenario: 业务操作保持可用
- **WHEN** 管理员在应用访问对象列表中执行上传、下载、复制链接、新增、删除、查看详情或 Webhook 事件重放
- **THEN** 页面 SHALL 沿用既有方法、后端调用和成功/失败提示
- **AND** 页面 SHALL NOT 改变认证、授权、OAuth/OIDC 回调、Webhook 投递、Gateway projection 或真实凭据处理行为

### Requirement: 应用接入配置列表页壳统一
应用接入下的资源、证书、密钥、Webhook 回调和 Webhook 事件列表页 SHALL 使用同一套共享列表页壳呈现标题、查询控件、右侧动作、辅助上下文和分页区域，并保持各自配置对象的业务操作语义兼容。

#### Scenario: 标题和动作位于共享工具栏
- **WHEN** 管理员在桌面端访问 `/resources`、`/certs`、`/keys`、`/webhooks` 或 `/webhook-events`
- **THEN** 页面对象标题 SHALL 由共享查询工具栏 header 呈现
- **AND** 新增、上传或等价主动作 SHALL 位于共享查询工具栏动作区
- **AND** 证书、密钥和 Webhook 回调的常规新增入口 SHALL 使用与组织、群组、用户一致的文字按钮，不额外渲染页面私有 `PlusOutlined` 图标
- **AND** 上传等具备明确动作语义的入口 MAY 保留对应动作图标
- **AND** 无主动作的列表 SHALL 保留同一套标题和查询布局，不额外占用页面私有 top action 区

#### Scenario: 分页展示规则一致
- **WHEN** 应用接入配置列表渲染分页
- **THEN** 分页 SHALL 使用共享分页配置或等价公共 helper
- **AND** 总数、页码、每页条数和跳页区域 SHALL 作为右侧分页组呈现
- **AND** 页面 SHALL NOT 为资源、证书、密钥或 Webhook 单独实现不同顺序、不同权重或不同间距的分页导航

#### Scenario: 空数据和少数据保持列表壳稳定
- **WHEN** 应用接入配置列表为空或仅有少量记录
- **THEN** 标题、查询控件、动作区和分页区域 SHALL 仍保持与有数据列表一致的壳结构
- **AND** 页面 SHALL NOT 因数据少而让右侧动作、标题或分页漂移到与其它列表不同的位置

#### Scenario: 自动化检查覆盖应用接入列表壳漂移
- **WHEN** 前端测试验证资源、证书、密钥、Webhook 回调和 Webhook 事件列表
- **THEN** 测试 SHALL 覆盖共享工具栏标题、动作区、分页配置和共享表格壳 class
- **AND** 测试 SHALL 能发现新增入口、上传入口或分页配置脱离共享列表页壳的回归

#### Scenario: 既有业务语义保持兼容
- **WHEN** 管理员使用资源、证书、密钥、Webhook 回调或 Webhook 事件列表查询、更多筛选、排序、分页、上传、新增、编辑、删除、详情查看或复制链接
- **THEN** 前端 SHALL 继续复用既有后端查询、上传、删除、跳转和权限契约
- **AND** 系统 SHALL NOT 新增 API、改变后端过滤语义、改变删除禁用条件、展示敏感凭据原文或触发认证、授权、回调执行、凭据写入、组织同步、Gateway projection publish 等外部执行动作

### Requirement: 权限和 Casbin 列表页应使用统一列表壳
Admin 权限角色和 Casbin 相关标准分页列表页 SHALL 复用统一列表壳、查询工具栏、表格密度和分页视觉规则。

#### Scenario: 角色和权限列表迁移到统一列表壳
- **WHEN** 管理员打开 `/roles` 或 `/permissions`
- **THEN** 页面 SHALL 使用统一的列表标题、右上动作区、查询工具栏、表格壳和分页布局
- **AND** 新增、编辑、删除、查询、排序和分页行为 SHALL 保持现有后端契约不变

#### Scenario: Casbin 模型、适配器和执行器列表迁移到统一列表壳
- **WHEN** 管理员打开 `/models`、`/adapters` 或 `/enforcers`
- **THEN** 页面 SHALL 使用统一的列表标题、右上动作区、查询工具栏、表格壳和分页布局
- **AND** 新增、编辑、删除、查询、排序和分页行为 SHALL 保持现有后端契约不变

#### Scenario: 桌面可容纳时不配置固定列
- **WHEN** 管理员在标准桌面列表宽度访问 `/roles`、`/permissions`、`/models`、`/adapters` 或 `/enforcers`
- **THEN** 表格列若能在列表容器内展示核心字段和操作列，页面 SHALL NOT 配置 AntD 左右固定列
- **AND** 页面 SHALL NOT 因不必要的 fixed column 产生长期可见的 sticky 分割线、阴影或额外横向滚动依赖
- **AND** 行级操作 SHALL 作为普通操作列保持可见和可点击
- **AND** 窄屏、移动端或极小容器 MAY 使用表格内部横向滚动作为兜底
