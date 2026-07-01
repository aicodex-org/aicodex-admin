## ADDED Requirements

### Requirement: 应用编辑页界面定制预览稳定
Admin 身份控制台 SHALL 在应用编辑页 `界面定制` tab 中稳定渲染登录、注册和授权提示预览，不得因预览子树本地渲染异常导致整页白屏。

#### Scenario: 直接打开界面定制 hash
- **WHEN** 管理员打开 `/applications/:organizationName/:applicationName#ui-customization`
- **AND** 应用记录包含后端可返回的空值形态，例如 `signupItems: null`、`themeData: null` 或 `orgChoiceMode: ""`
- **THEN** Admin SHALL 渲染 `界面定制` tab 的表单项和预览区域
- **AND** 页面 SHALL NOT 出现 React 渲染异常导致的白屏

#### Scenario: 切换到界面定制 tab
- **WHEN** 管理员从应用编辑页其它 tab 切换到 `界面定制`
- **THEN** Admin SHALL 挂载登录、注册和授权提示预览
- **AND** 预览中的 i18n 文案调用 SHALL NOT 因丢失 `i18next` 实例上下文而抛出异常

#### Scenario: 编辑页业务语义保持不变
- **WHEN** 管理员编辑或保存应用配置
- **THEN** Admin SHALL 保持既有 API payload、保存流程、路由语义和后端契约不变
