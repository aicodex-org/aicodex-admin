# admin-enterprise-identity-asset-relationship-layer Specification

## Purpose
TBD - created by archiving change propose-admin-enterprise-identity-governance-experience-layer. Update Purpose after archive.
## Requirements
### Requirement: 身份资产详情入口和对象边界
Admin 企业认证中心 SHALL 为组织、用户、角色、权限、应用、认证源、Provider 绑定、LLM AI/Gateway 映射和审计记录提供身份资产详情入口，使管理员能够从现有页面进入对象上下文，而不替代既有列表主任务。

#### Scenario: 管理员从现有列表进入对象详情
- **WHEN** 已登录管理员在 `/organizations`、`/users`、`/roles`、`/permissions`、`/applications`、`/providers`、`/agents`、`/platform-api-mappings` 或 `/records` 查看对象行
- **THEN** 页面 SHALL 提供对象名称链接、行操作或详情入口
- **AND** 入口 SHALL 打开对象详情抽屉或轻量详情页
- **AND** 原列表 SHALL 继续承载新增、编辑、删除、筛选、排序和分页等既有操作

#### Scenario: 详情对象边界可识别
- **WHEN** 管理员打开任一身份资产详情
- **THEN** 详情 SHALL 标明对象类型、对象标识、所属组织或作用域、当前状态和来源页面
- **AND** 详情 SHALL NOT 展示 token、Cookie、client secret、私钥、完整连接串、完整私有 URL 或可复用凭据原值

#### Scenario: P0 详情不依赖新后端写接口
- **WHEN** P0 实现对象详情
- **THEN** 系统 SHALL 使用当前列表行、既有详情接口、分页 total、已加载行和既有路由作为只读输入
- **AND** 系统 SHALL NOT 新增写入接口、触发认证、触发组织同步或触发 Gateway projection publish

### Requirement: 身份资产关系视图和事实来源
身份资产详情 SHALL 展示与对象相关的关系列表、关系摘要或关系图入口，并明确每条关系的事实来源和范围。

#### Scenario: P0 使用当前视图关系
- **WHEN** 关系信息来自当前列表、当前筛选、已加载行或前端只读推导
- **THEN** 关系视图 SHALL 标记为当前视图、当前筛选或只读核对
- **AND** 关系视图 SHALL NOT 声称该关系代表跨组织、跨租户或后端全量事实

#### Scenario: 需要全局关系事实
- **WHEN** 关系视图需要展示跨页面、跨组织、跨认证源或全量影响范围
- **THEN** 系统 SHALL 使用已明确实现的只读聚合接口或后端事实源返回的关系数据
- **AND** 响应 SHALL 包含 scope、generatedAt、sourceOfTruth 和 cannotInfer reason 或等价字段
- **AND** 当聚合接口尚未由后端事实源提供时，系统 SHALL 回落到当前视图/当前筛选/只读核对口径，且不得伪装成全局事实

#### Scenario: 管理员查看应用与 Provider 绑定关系
- **WHEN** 管理员打开 Application 或 Provider 绑定详情
- **THEN** 关系视图 SHALL 展示应用、Provider、目标组织、回调配置、授权范围、审计记录和相关 API/Gateway 映射入口
- **AND** 缺少 Provider 目标组织或回调配置时 SHALL 展示关系缺口和修复入口

#### Scenario: 管理员查看用户与授权关系
- **WHEN** 管理员打开 User、Role 或 Permission 详情
- **THEN** 关系视图 SHALL 展示用户、角色、权限、组织归属、外部身份和相关审计证据入口
- **AND** 高权限角色或敏感权限 SHALL 以风险标签标明其治理含义

### Requirement: 时间线和审计证据链入口
身份资产详情 SHALL 提供对象时间线和审计证据链入口，帮助管理员理解配置变化、登录/验证、同步、Gateway readiness 或异常事件的来源。

#### Scenario: 对象存在审计证据
- **WHEN** 当前对象可关联审计记录、同步记录、令牌核对、验证记录、Gateway readiness 或应用配置事件
- **THEN** 详情 SHALL 提供时间线或证据链入口
- **AND** 入口 SHALL 跳转或过滤到既有审计、同步、令牌、验证、Gateway mapping 或 readiness 页面
- **AND** 入口 SHALL NOT 执行重试、清理、发布、授权刷新或真实连接测试

#### Scenario: 证据来自后续只读聚合接口
- **WHEN** 已明确实现的 P1 或后续独立 change 返回跨域证据链
- **THEN** 证据链 SHALL 返回脱敏事件摘要、事件时间、对象引用、来源系统、sourceOfTruth 和可跳转详情
- **AND** 证据链 SHALL NOT 返回原始 token、Cookie、完整请求头、完整响应体、完整组织树或真实账号敏感明细

### Requirement: 空态、失败态和权限态
身份资产关系层 SHALL 覆盖空数据、数据不足、接口失败和权限不足状态，并保持既有页面可用。

#### Scenario: 当前视图信息不足
- **WHEN** 当前列表行或已加载数据不足以生成关系、时间线或证据摘要
- **THEN** 详情 SHALL 展示当前视图信息不足或 cannotInfer 状态
- **AND** 详情 SHALL 提供进入相关既有页面或等待未来独立只读聚合接口的入口

#### Scenario: 只读聚合接口失败
- **WHEN** 已明确实现的只读聚合接口返回错误或超时
- **THEN** 详情 SHALL 展示局部错误和重试入口
- **AND** 原列表、原编辑入口和其它已加载只读信息 SHALL 保持可用

#### Scenario: 管理员无权查看关系详情
- **WHEN** 当前管理员无权查看某类对象、关系或证据
- **THEN** 系统 SHALL 隐藏未授权详情或展示无权限状态
- **AND** 系统 SHALL NOT 泄漏隐藏对象名称、真实账号、组织树、敏感配置或证据 payload

### Requirement: React TypeScript 实现与验证边界
后续实现身份资产关系层时，新增 React 详情、关系、时间线和证据组件 SHALL 遵循 web-admin 渐进 TypeScript 规则，并通过聚焦验证证明入口和状态可用。

#### Scenario: 新增前端组件和模型
- **WHEN** 后续 change 新增身份资产详情、关系图、关系列表、时间线、证据链或对象模型
- **THEN** React 组件 SHALL 默认使用 `.tsx`
- **AND** 共享类型、接口模型和数据转换 SHALL 默认使用 `.ts`
- **AND** 组件测试中包含 JSX 或 `render(<Component />)` 时 SHALL 使用 `.test.tsx`

#### Scenario: 验证身份资产关系层
- **WHEN** 后续 change 实现身份资产关系层 UI
- **THEN** 验证 SHALL 至少包含 `yarn typecheck`、聚焦测试、按风险运行 `yarn build` 和浏览器验证
- **AND** 浏览器验证 SHALL 覆盖对象入口、关系空态、失败态、权限态、敏感信息脱敏和原列表主任务仍可访问

### Requirement: 身份资产关系页自定义 surface 暗黑主题一致性
身份资产关系页与对象详情证据区 SHALL 在明亮与暗黑模式下复用共享主题 token 呈现关系 selector、摘要区、详情折叠区和复制反馈状态，不得残留固定浅色 surface 或对比失衡的证据块。

#### Scenario: 暗黑模式查看关系 selector 与摘要
- **WHEN** 管理员在暗黑模式下访问 `/identity-assets` 或打开关系/证据详情
- **THEN** 关系 selector、hover/active 状态、摘要区、meta 信息和折叠区 SHALL 使用暗黑主题 surface、border 和 text token
- **AND** 页面 SHALL NOT 在暗黑背景上留下白底 selector、白色摘要块或过亮边框

#### Scenario: 复制与脱敏证据状态在双主题下可辨
- **WHEN** 管理员在关系页或关联证据详情中执行复制、展开或查看脱敏证据
- **THEN** 默认、hover、复制成功和复制失败状态 SHALL 在明亮与暗黑模式下都保持可辨识
- **AND** 复制入口 SHALL 继续只复制脱敏后的展示内容
