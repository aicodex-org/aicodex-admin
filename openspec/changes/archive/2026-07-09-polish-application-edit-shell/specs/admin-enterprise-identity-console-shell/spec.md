## ADDED Requirements

### Requirement: 应用编辑页应使用多 tab 固定操作栏编辑壳

Admin 身份控制台 Shell SHALL 让应用编辑页按多 tab 大编辑页形态复用统一编辑壳，使页面头部、Tabs、滚动正文和底部动作栏与组织、用户编辑页保持同一套交互边界。

#### Scenario: 应用编辑页复用统一编辑壳
- **WHEN** 管理员在桌面端访问 `/applications/:organizationName/:applicationName`
- **THEN** 应用编辑页 SHALL 使用单个主编辑壳承载返回路径、应用编辑标题、页内 Tabs、当前 tab 正文和固定底部动作栏
- **AND** route scroll 容器与页面内部编辑壳 SHALL NOT 叠加出多套标题、Card title 保存按钮或正文底部重复保存按钮
- **AND** 页面 SHALL 保留 `application-edit-page` 与 `application-edit-card` 或等价 scoped class 供测试、smoke 和后续局部修复定位

#### Scenario: 应用编辑页按多 tab 页面处理
- **WHEN** 管理员打开应用编辑页
- **THEN** 页面 SHALL 展示基础、身份验证、OIDC/OAuth、SAML、提供商、界面定制、安全设置和 Reverse Proxy 这些应用配置 tab
- **AND** tab key SHALL 写入 URL hash，使刷新或重新打开后能恢复当前 tab
- **AND** 应用编辑页 SHALL NOT 因复用单页编辑壳而把这些配置域合并成一个长正文

#### Scenario: 应用编辑页底部动作保持可达
- **WHEN** 管理员在应用编辑页滚动任一 tab 正文
- **THEN** 页面底部 SHALL 保留固定操作栏
- **AND** 操作栏按钮顺序 SHALL 为 `取消`、`保存`、`保存并返回`
- **AND** 保存中 SHALL 禁用重复提交或展示提交中状态
- **AND** 新增模式取消 SHALL 保持既有删除临时应用对象语义

#### Scenario: 应用编辑页不制造页面级横向溢出
- **WHEN** 管理员在 `1280px` 或 `1920px` 桌面宽度访问应用编辑页任一 tab
- **THEN** Shell 根文档 SHALL NOT 因外层内容卡、表单 label gutter、表格模块或预览区域产生不必要的页面级横向 overflow
- **AND** 需要横向滚动的表格、URL 列表或预览组件 SHALL 在自身容器内处理 overflow

#### Scenario: 应用编辑页保存前错误定位到对应 tab
- **WHEN** 管理员在应用编辑页提交缺少必填字段或存在可前端发现的配置错误
- **THEN** 页面 SHALL 阻止调用应用保存 API
- **AND** 页面 SHALL 展示本地化错误提示
- **AND** 页面 SHALL 激活第一个错误所在 tab
