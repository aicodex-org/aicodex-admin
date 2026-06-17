## ADDED Requirements

### Requirement: 治理任务中心入口和任务模型
Admin 企业认证中心 SHALL 提供治理任务中心，使身份治理管理员和运维管理员能够查看跨组织身份、认证源、应用接入、审计运维和 LLM AI/Gateway 的可处理待办。

#### Scenario: 管理员进入治理任务中心
- **WHEN** 已登录管理员从企业认证中心总览、侧栏入口或对象详情中的待办入口进入治理任务中心
- **THEN** 页面 SHALL 展示治理任务队列
- **AND** 页面 SHALL 支持按任务类型、严重级别、影响对象、来源范围、处理状态和关键字筛选
- **AND** 页面 SHALL 提供返回影响对象、证据链或既有配置页的入口

#### Scenario: 治理任务具备可解释字段
- **WHEN** 系统展示任一治理任务
- **THEN** 任务 SHALL 至少包含 taskType、severity、impactObject、scopeLabel、sourceOfTruth、suggestedAction、status、evidenceEntry 和 safetyBoundary 或等价字段
- **AND** 任务 SHALL 明确建议动作是跳转配置、查看证据、核对详情、忽略当前视图候选还是等待后续聚合事实

#### Scenario: 治理任务不展示敏感原值
- **WHEN** 任务与 token、Provider 配置、OAuth/OIDC client、Gateway 映射或审计 payload 相关
- **THEN** 任务 SHALL 只展示脱敏摘要、计数、对象引用和证据入口
- **AND** 任务 SHALL NOT 展示 token、Cookie、client secret、私钥、完整连接串、完整私有 URL 或可复用凭据原值

### Requirement: 治理任务类型和严重级别
治理任务中心 SHALL 至少覆盖同步失败、孤立账号、高权限角色、应用接入不完整、异常 token、回调缺失、Provider 绑定风险和 Gateway/LLM AI 映射缺口。

#### Scenario: 展示 P0 治理任务类型
- **WHEN** P0 治理任务中心从当前列表或现有页面摘要生成任务候选
- **THEN** 系统 SHALL 支持 `sync_failed`、`orphan_account`、`privileged_role`、`application_incomplete`、`abnormal_token`、`callback_missing`、`provider_binding_risk` 和 `gateway_mapping_gap` 或等价稳定类型
- **AND** 每类任务 SHALL 提供对应的影响对象和建议动作

#### Scenario: 严重级别表达处理优先级
- **WHEN** 系统展示治理任务
- **THEN** 任务 SHALL 使用 high、medium、low、info 或等价严重级别
- **AND** 高权限角色、异常 token、缺少回调、Provider 绑定缺失和 Gateway 映射缺口 SHALL 被标记为需要优先核对的任务
- **AND** 严重级别 SHALL NOT 暗示系统已经自动完成全局风险扫描，除非任务来自后端全局只读聚合接口

### Requirement: 任务来源范围和全局事实边界
治理任务中心 SHALL 明确任务来源范围，避免把当前列表推导、当前筛选或已加载行伪装成全局事实。

#### Scenario: P0 从当前视图生成任务候选
- **WHEN** 治理任务由当前页面列表、当前筛选、分页 total、已加载行或前端只读推导产生
- **THEN** 任务 SHALL 标记为当前视图候选、当前筛选候选或只读核对候选
- **AND** 任务 SHALL NOT 声称代表全局风险总量、跨组织事实或全部未处理任务

#### Scenario: P1 从只读聚合接口生成任务
- **WHEN** 后续只读聚合接口返回治理任务
- **THEN** 响应 SHALL 包含 scope、generatedAt、sourceOfTruth、redactionSummary、cannotInfer reason 和任务分页或摘要字段
- **AND** 接口 SHALL NOT 写入处理状态、触发同步、触发认证、执行授权刷新或触发 Gateway projection publish

#### Scenario: 后端事实源不可判定
- **WHEN** 系统无法从当前视图或只读聚合接口判断某类风险
- **THEN** 任务中心 SHALL 展示 cannotInfer 或待接入事实源状态
- **AND** 系统 SHALL NOT 使用弱标识、展示名、手机号、邮箱、Insight report scope 或当前列表缺失来猜测风险已不存在

### Requirement: 建议动作和处理状态
治理任务中心 SHALL 为每个任务提供安全建议动作和处理状态，并在 P0 中保持只读安全边界。

#### Scenario: 管理员执行建议动作
- **WHEN** 管理员点击治理任务的建议动作
- **THEN** 系统 SHALL 跳转到既有应用编辑、认证源配置、同步诊断、审计记录、令牌核对、对象详情或 Gateway mapping/readiness 页面
- **AND** 系统 SHALL NOT 在任务中心直接执行删除、同步、授权刷新、真实连接测试、Gateway publish 或 cleanup

#### Scenario: P0 处理状态为前端只读状态
- **WHEN** P0 任务中心提供处理状态
- **THEN** 状态 SHALL 限定为待核对、已查看、当前会话忽略、无法推断或等价前端只读状态
- **AND** 状态 SHALL NOT 被保存为后端全局处理结果或审计事实

#### Scenario: 后续需要持久处理状态
- **WHEN** P2 或后续 change 需要持久化处理状态
- **THEN** 该 change SHALL 单独定义数据 owner、权限、审计、保留周期、回滚策略和脱敏导出
- **AND** 本 capability 的 P0/P1 SHALL NOT 隐式创建持久任务状态

### Requirement: 空态、错误态和权限态
治理任务中心 SHALL 覆盖没有任务、任务数据加载失败、权限不足和部分事实源不可用状态。

#### Scenario: 当前范围没有任务
- **WHEN** 当前视图或只读聚合接口没有返回治理任务
- **THEN** 页面 SHALL 展示当前范围未发现待办或当前筛选无结果
- **AND** 页面 SHALL 保留筛选、刷新和进入相关配置页的入口

#### Scenario: 任务加载失败
- **WHEN** 治理任务来源加载失败或超时
- **THEN** 页面 SHALL 展示局部错误、重试入口和可用的静态配置入口
- **AND** 页面 SHALL NOT 阻塞 Admin 侧栏、总览或原列表页面使用

#### Scenario: 管理员权限不足
- **WHEN** 当前管理员无权查看某类任务或影响对象
- **THEN** 系统 SHALL 隐藏该任务或展示无权限状态
- **AND** 系统 SHALL NOT 泄漏隐藏对象名称、真实账号、组织树、敏感配置或证据 payload

### Requirement: React TypeScript 实现与验证边界
后续实现治理任务中心时，新增任务模型、分类器、队列页面和筛选组件 SHALL 遵循 web-admin 渐进 TypeScript 规则，并通过聚焦验证证明任务口径正确。

#### Scenario: 新增任务模型和队列组件
- **WHEN** 后续 change 新增治理任务模型、任务分类、队列页面、筛选器或任务卡片
- **THEN** React 组件 SHALL 默认使用 `.tsx`
- **AND** 共享任务类型、分类器、转换函数和接口模型 SHALL 默认使用 `.ts`
- **AND** 任务分类测试 SHALL 覆盖 taskType、severity、source label、suggestedAction 和 cannotInfer 分支

#### Scenario: 验证治理任务中心
- **WHEN** 后续 change 实现治理任务中心 UI
- **THEN** 验证 SHALL 至少包含 `yarn typecheck`、聚焦测试、按风险运行 `yarn build` 和浏览器验证
- **AND** 浏览器验证 SHALL 覆盖筛选、空态、错误态、权限态、建议动作跳转、来源范围标记和敏感信息脱敏
