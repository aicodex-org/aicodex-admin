## ADDED Requirements

### Requirement: 接入向导入口和适用对象
Admin 企业认证中心 SHALL 为认证源、应用接入和 Gateway/LLM AI 映射提供向导化接入体验，使管理员能够按步骤完成配置核对、预检或只读模拟、启用前检查和结果确认；真实连接测试或后端 preflight/test summary 接口必须由未来独立 change 定义。

#### Scenario: 管理员从认证源中心启动接入向导
- **WHEN** 已登录管理员在 `/providers` 或认证源详情中点击开始接入、继续配置或修复缺口入口
- **THEN** 系统 SHALL 打开认证源接入向导
- **AND** 向导 SHALL 覆盖 Provider 类型选择、基础配置核对、敏感字段输入提示、同步或授权预检、启用前检查和结果页

#### Scenario: 管理员从应用接入中心启动接入向导
- **WHEN** 已登录管理员在 `/applications`、Application 详情或应用接入缺口任务中点击开始接入、继续配置或修复缺口入口
- **THEN** 系统 SHALL 打开应用接入向导
- **AND** 向导 SHALL 覆盖 Application 基础信息、OAuth/OIDC client、回调地址、授权范围、Provider 绑定、目标组织、API/Gateway 映射入口、启用前检查和结果页

#### Scenario: 管理员从 LLM AI/Gateway 区域启动映射向导
- **WHEN** 已登录管理员在 `/agents`、`/platform-api-mappings`、Gateway readiness 或 LLM AI 对象详情中点击开始映射、继续配置或修复缺口入口
- **THEN** 系统 SHALL 打开 Gateway/LLM AI 映射向导
- **AND** 向导 SHALL 覆盖 Agent/MCP/Gateway 相关对象选择、身份映射核对、readiness 预检、审计证据入口、启用前检查和结果页

### Requirement: 向导步骤、页面边界和取消恢复
接入向导 SHALL 使用清晰的步骤状态和结果页表达接入进度，同时保持既有编辑页和列表页可用。

#### Scenario: 向导展示标准步骤
- **WHEN** 管理员打开任一接入向导
- **THEN** 向导 SHALL 展示对象选择、配置核对、预检、测试连接或只读模拟、启用前检查和结果确认步骤
- **AND** 每个步骤 SHALL 展示当前状态、阻塞项、建议修复动作和返回上一步或取消入口

#### Scenario: P0 向导不替代既有编辑页
- **WHEN** P0 实现接入向导
- **THEN** 向导 SHALL 复用既有编辑页路由、既有安全保存行为或只读入口
- **AND** 向导 SHALL NOT 删除、绕过或隐藏既有 Provider、Application、Gateway mapping、Agent 或 MCP 资源列表的新增、编辑、删除、筛选和分页能力

#### Scenario: 管理员取消向导
- **WHEN** 管理员在任一向导步骤点击取消或关闭
- **THEN** 系统 SHALL 返回来源页面或对象详情
- **AND** P0 SHALL NOT 在取消时创建、更新或确认 Provider、Application、Gateway mapping、任务处理状态或审计事实

### Requirement: 预检和测试连接安全边界
接入向导 SHALL 在 P0 中将预检和测试连接限定为配置完整度、当前对象只读模拟和后续受控检查入口；真实网络探测、OAuth/OIDC 回调执行、Provider 登录、后端 preflight/test summary 接口和 Gateway 发布必须通过单独 change 定义。

#### Scenario: P0 执行配置完整度预检
- **WHEN** 管理员在 P0 向导中运行预检
- **THEN** 系统 SHALL 基于表单输入、当前对象行、既有配置页可读字段或当前列表推导配置完整度
- **AND** 系统 SHALL 标记该预检为当前对象、当前视图或只读模拟口径
- **AND** 系统 SHALL NOT 声称已完成真实连接测试、真实 OAuth/OIDC 回调、Provider 登录或 Gateway 发布验证

#### Scenario: 后端预检摘要需要未来独立接口
- **WHEN** 产品需要由后端返回只读 preflight 或测试连接摘要
- **THEN** 后续 change SHALL 单独定义接口、权限、脱敏、scope、generatedAt、sourceOfTruth、blockingReasons、cannotInfer reason 和 safeNextAction
- **AND** 本 capability SHALL NOT 隐式声明该后端接口已经可用
- **AND** 未来接口 SHALL NOT 保存密钥、触发登录、触发同步、刷新授权、写 Gateway authorization facts、发布 projection 或执行 cleanup

#### Scenario: 真实连接测试需要单独受控 change
- **WHEN** 产品需要执行真实网络探测、OAuth/OIDC 回调、Provider 登录测试、Webhook 调用、Gateway publish 或 Gateway receipt 验证
- **THEN** 必须通过单独 OpenSpec change 定义权限、审计、脱敏、失败补偿、超时、重试和环境边界
- **AND** 本 capability 的 P0/P1 SHALL NOT 隐式授权这些执行行为

### Requirement: 启用前检查和结果页
接入向导 SHALL 在启用前检查中汇总阻塞项、风险项、证据入口和安全下一步，并在结果页提供脱敏摘要。

#### Scenario: 启用前检查发现阻塞项
- **WHEN** 启用前检查发现缺少回调地址、授权范围、Provider 目标组织、clientId、Gateway mapping、readiness 或必要审计证据
- **THEN** 向导 SHALL 展示阻塞项、影响对象、严重级别、建议修复动作和证据入口
- **AND** 向导 SHALL 阻止把该状态标记为可启用或全局完成

#### Scenario: 启用前检查通过
- **WHEN** 当前向导范围内的必要配置和只读预检均通过
- **THEN** 向导 SHALL 展示可继续的安全下一步和结果页
- **AND** 结果页 SHALL 标明通过范围是当前对象、当前视图、只读预检或后续聚合接口返回的 scope

#### Scenario: 管理员查看结果页
- **WHEN** 管理员完成、取消或遇到失败结果
- **THEN** 结果页 SHALL 展示脱敏摘要、阻塞项、已检查项、未检查项、证据入口和后续动作
- **AND** 结果页 SHALL NOT 展示 token、Cookie、client secret、私钥、完整连接串、完整私有 URL、完整请求头或完整响应体

### Requirement: 空态、错误态和权限态
接入向导 SHALL 覆盖待接入、配置缺失、预检失败、权限不足、接口失败和无法推断状态。

#### Scenario: 尚无可接入对象
- **WHEN** 当前范围没有 Provider、Application、Agent、MCP 资源或 Gateway mapping 可用于向导
- **THEN** 向导 SHALL 展示待接入空态和创建或返回既有列表的入口
- **AND** 向导 SHALL NOT 创建默认对象或写入隐式配置

#### Scenario: 预检失败或无法推断
- **WHEN** 预检因字段缺失、权限不足、数据不可用、后续接口失败或事实源不可判定而失败
- **THEN** 向导 SHALL 展示失败原因、cannotInfer reason、建议修复动作和可复制的脱敏摘要
- **AND** 向导 SHALL NOT 继续执行真实连接、同步、授权刷新或 Gateway 发布

#### Scenario: 管理员无权执行向导步骤
- **WHEN** 当前管理员无权查看或配置某类接入对象
- **THEN** 系统 SHALL 禁用相关步骤或展示无权限状态
- **AND** 系统 SHALL NOT 泄漏隐藏对象名称、真实账号、组织树、敏感配置或预检 payload

### Requirement: React TypeScript 实现与验证边界
后续实现接入向导时，新增向导组件、步骤状态、预检模型和结果页 SHALL 遵循 web-admin 渐进 TypeScript 规则，并通过聚焦验证证明流程安全。

#### Scenario: 新增向导组件和模型
- **WHEN** 后续 change 新增认证源、应用接入或 Gateway/LLM AI 映射向导
- **THEN** React 步骤条、表单壳层、预检清单和结果页组件 SHALL 默认使用 `.tsx`
- **AND** 向导状态机、步骤模型、阻塞项模型、preflight 接口模型和脱敏转换 SHALL 默认使用 `.ts`
- **AND** 组件测试中包含 JSX 或 `render(<Component />)` 时 SHALL 使用 `.test.tsx`

#### Scenario: 验证接入向导
- **WHEN** 后续 change 实现接入向导 UI
- **THEN** 验证 SHALL 至少包含 `yarn typecheck`、聚焦测试、按风险运行 `yarn build` 和浏览器验证
- **AND** 浏览器验证 SHALL 覆盖步骤切换、取消、返回、阻塞项、结果页、预检失败、权限态、敏感信息脱敏和不触发真实执行行为
