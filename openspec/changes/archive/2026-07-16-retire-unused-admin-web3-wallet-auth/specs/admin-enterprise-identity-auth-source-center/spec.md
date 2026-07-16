## MODIFIED Requirements

### Requirement: 认证源中心工作区
Admin 企业认证中心 SHALL 在认证源分组下提供以 Provider 列表为主体的认证源管理页，使管理员能够从 `/providers` 首屏直接扫描、搜索、分页和操作企业微信、飞书、OIDC 等受支持认证源 Provider；退役 Web3 钱包认证只保留历史读取与删除能力。

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
- **WHEN** 管理员在 Provider 表格中查看受支持认证源
- **THEN** 既有 Provider 分页、筛选、新增、编辑和删除行为 SHALL 保持可用
- **AND** 表格 SHALL 默认展示认证源识别信息、归属组织、创建时间、类别、类型、客户端 ID、Provider URL 和操作列
- **AND** 认证源列表不得改变普通 Provider 表格的路由、权限 key 或数据写入行为

#### Scenario: 认证源列表包含历史 Web3 Provider
- **WHEN** Provider API 返回历史 Web3、MetaMask 或 Web3Onboard Provider
- **THEN** 列表 SHALL 保持记录可见，并在既有删除权限允许时允许删除
- **AND** 页面 SHALL NOT 提供配置、复制创建或重新启用钱包认证的动作

#### Scenario: TSX 迁移保持行为兼容
- **WHEN** Provider 列表页从 JavaScript 迁移为 TSX
- **THEN** `/providers` 路由、普通 Provider 列表加载、表格操作、配置入口和删除确认 SHALL 保持现有行为兼容
- **AND** 迁移 SHALL NOT 恢复退役 Web3 钱包认证入口
- **AND** 迁移 SHALL NOT 触发后端写入、组织同步、OAuth/OIDC 授权、真实 provider 探测或权限模型变更

### Requirement: Provider 编辑页使用共享大型编辑壳

Provider 编辑页 SHALL 复用 Admin 共享大型编辑页壳呈现页面头部、面包屑、滚动正文和底部动作栏，并保持受支持 Provider 配置和保存行为兼容；历史 Web3 钱包 Provider SHALL 使用不可配置的退役状态。

#### Scenario: Provider 编辑页头部和动作栏统一
- **WHEN** 管理员打开受支持 Provider 新增或编辑页
- **THEN** 页面 SHALL 使用共享大型编辑页壳展示返回入口、认证源面包屑、Provider 标题和底部动作栏
- **AND** 取消、保存、保存并返回 SHALL 位于共享底部动作栏
- **AND** 页面 SHALL NOT 同时在 Card title 或页面外层渲染重复保存按钮

#### Scenario: Provider 基础配置使用共享正文样式
- **WHEN** 管理员查看受支持 Provider 基础字段
- **THEN** 名称、显示名称、组织、类别、类型、子类型、方法、Scope 和 Provider URL 等稳定字段 SHALL 使用共享区块和字段行样式
- **AND** 标签、控件宽度、文字密度和窄屏换行规则 SHALL 与已迁移的大型编辑页保持一致

#### Scenario: Provider 配置语义保持兼容
- **WHEN** 管理员切换受支持 Provider 类别或类型并保存
- **THEN** 前端 SHALL 继续使用既有 Provider 字段默认值、校验、保存和删除方法
- **AND** 编辑态取消 SHALL 返回 Provider 列表，新增草稿取消 SHALL 仅返回 Provider 列表且不删除对象
- **AND** 系统 SHALL NOT 新增 API、改变保存 payload、改变 OAuth/OIDC/SAML/WeCom/Lark 字段语义、触发真实 provider 探测、认证刷新、授权刷新或组织同步

#### Scenario: Provider 新增草稿仅在保存时创建
- **WHEN** 管理员在 `/providers` 点击新增
- **THEN** 前端 SHALL 使用不含退役 Web3 category/type 的既有 Provider 默认值打开新增编辑页并传递路由草稿
- **AND** 前端 SHALL NOT 调用 `ProviderBackend.addProvider` 或显示新增成功提示
- **AND** 新增编辑页 SHALL 跳过草稿详情 GET，同时保留组织、证书和其它既有只读选项加载
- **WHEN** 管理员在 Provider 新增编辑页点击保存或保存并返回
- **THEN** 前端 SHALL 在既有校验通过后调用 `ProviderBackend.addProvider`，成功后转为编辑模式
- **AND** 后续保存 SHALL 继续调用既有更新 API，保持 OAuth/OIDC/SAML/WeCom/Lark Provider payload 语义和外部同步边界不变

#### Scenario: Provider 草稿取消不删除对象
- **WHEN** 管理员在 Provider 新增草稿点击取消、顶部返回，或确认放弃脏草稿
- **THEN** 前端 SHALL 返回 `/providers`
- **AND** 前端 SHALL NOT 调用新增、更新或删除 Provider API

#### Scenario: 历史 Web3 Provider 直链安全降级
- **WHEN** 管理员打开历史 Web3、MetaMask 或 Web3Onboard Provider 编辑路由
- **THEN** 页面 SHALL 显示不可配置的退役状态，并在既有删除权限允许时提供返回或删除动作
- **AND** 页面 SHALL NOT 渲染保存动作、钱包字段组件、钱包 SDK、白屏或死链接

#### Scenario: Provider 编辑页布局回归可测试
- **WHEN** 前端测试验证 Provider 编辑页
- **THEN** 测试 SHALL 覆盖共享编辑壳、共享底部动作栏、关键基础字段、路由草稿、旧重复按钮移除和历史 Web3 直链降级
- **AND** 测试 SHALL 能发现 Provider 编辑页回退到旧 Card title 操作区、页面底部重复按钮或重新暴露钱包配置的回归
