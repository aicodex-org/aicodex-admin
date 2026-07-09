## ADDED Requirements

### Requirement: 应用编辑页 tab 正文应保持应用接入配置语义

应用接入中心 SHALL 让应用编辑页各 tab 正文使用一致的企业管理台编辑密度和表格模块，同时保持现有 Application 保存契约、Provider 绑定、OIDC/OAuth、SAML、界面定制和 Reverse Proxy 配置语义不变。

#### Scenario: 基础 tab 使用可扫描表单区块
- **WHEN** 管理员在应用编辑页查看基础 tab
- **THEN** 页面 SHALL 以可扫描表单区块展示应用标识、显示名称、分类、类型、共享状态、Logo、标题、组织图标和其它基础字段
- **AND** 资产类字段 SHALL 提供稳定的链接输入、预览和状态表达
- **AND** 页面 SHALL NOT 因嵌套 Row 或旧式 label gutter 造成字段边界与其它大编辑页明显不一致

#### Scenario: Provider 和身份源绑定保持全宽表格模块
- **WHEN** 管理员在应用编辑页查看提供商 tab
- **THEN** Provider 绑定列表和身份源目标组织配置 SHALL 使用 tab pane 的可用宽度
- **AND** 表格标题、右上操作、空态、Tooltip、行内小操作按钮和删除确认 SHALL 与组织、用户编辑页内表格模块保持同类密度
- **AND** 保存后 SHALL 继续使用现有 Application Provider binding payload，不得强行写入默认目标组织或改变登录查找规则

#### Scenario: OIDC/OAuth 和 SAML tab 保持协议配置兼容
- **WHEN** 管理员在应用编辑页编辑 OIDC/OAuth 或 SAML tab
- **THEN** 页面 SHALL 保持既有 client、redirect URI、grant type、scope、token、SAML metadata、证书和属性配置字段可用
- **AND** URL、scope、attribute 或 token 字段表格 SHALL 在自身容器内处理长内容和局部滚动
- **AND** 保存 payload、路由语义、后端 API 路径和协议字段含义 SHALL 保持兼容

#### Scenario: 界面定制 tab 预览稳定可读
- **WHEN** 管理员切换到应用编辑页界面定制 tab
- **THEN** 页面 SHALL 渲染表单配置、主题配置和登录/注册/授权提示预览
- **AND** 预览区域 SHALL NOT 挤压主编辑表单或导致页面级横向溢出
- **AND** 页面 SHALL NOT 因预览子树渲染异常出现白屏、React render exception 或 webpack overlay

#### Scenario: 安全设置和 Reverse Proxy tab 保持安全边界
- **WHEN** 管理员编辑安全设置或 Reverse Proxy tab
- **THEN** 页面 SHALL 保持现有失败登录限制、冻结时间、验证码重发、IP 白名单、使用条款、域名、上游地址、SSL 模式和证书字段语义
- **AND** 页面 SHALL NOT 展示 client secret、token、证书私钥或其它敏感配置原文以外的新敏感信息
- **AND** 页面 SHALL NOT 因 UI 迁移触发认证、授权、回调执行、Provider 登录、Reverse Proxy 连接探测或 Gateway projection publish

#### Scenario: 应用编辑页视觉验证覆盖所有 tab
- **WHEN** 应用编辑页改造进入验收阶段
- **THEN** 验证 SHALL 覆盖基础、身份验证、OIDC/OAuth、SAML、提供商、界面定制、安全设置和 Reverse Proxy tab
- **AND** 验证 SHALL 检查浅色/暗色主题、长文本、空态、禁用态、滚动尾部、无页面级横向溢出和无新增 console/page error
- **AND** 如果真实 60 后台登录态不可用，验证记录 SHALL 使用脱敏 mock 或 preview 说明覆盖范围和后续运行态复测路径
