# web-admin-signup-responsive-layout Specification

## Purpose
规定 `web-admin` 注册页在窄屏、移动端与桌面端的响应式布局、表单交互和页面级无横向溢出边界。
## Requirements
### Requirement: 注册页在窄屏和移动端无页面级横向溢出

`web-admin` 注册页 SHALL 让 Signup 自有页面壳、logo、表单和模式控件受当前 viewport 约束，不得依赖 UA 判定、裁剪页面内容或隐藏横向 overflow 来制造无溢出结果。

#### Scenario: 桌面浏览器缩窄窗口

- **WHEN** 用户使用桌面浏览器在 320px、360px 或 390px viewport 打开标准注册页
- **THEN** `document` 与 `body` 的 `scrollWidth` SHALL NOT 超过当前 viewport 宽度
- **AND** logo、Form、Email/Phone 模式组与表单操作 SHALL 保持在 viewport 内

#### Scenario: 移动设备打开注册页

- **WHEN** 用户使用移动 UA 在 320px、360px 或 390px viewport 打开标准注册页
- **THEN** 页面级 SHALL NOT 产生横向 overflow
- **AND** 页面 SHALL NOT 通过裁切、隐藏内容或缩小触控目标来满足该约束

### Requirement: 注册表单响应式收缩保持业务与交互兼容

注册页 SHALL 在可用内容宽度内保持 Email/Phone 模式切换、国家区号与手机号组合、验证码、字段校验、提交和登录入口的既有业务语义与键盘可操作性。

#### Scenario: Email 与 Phone 模式切换

- **WHEN** 用户在窄屏注册页切换 Email 与 Phone 模式
- **THEN** 当前模式对应字段 SHALL 可见并保持原有表单规则
- **AND** Phone 模式的国家区号 SHALL 位于手机号之前，组合控件 SHALL 完整包含于 Form 可用宽度内

#### Scenario: 长标签与校验错误

- **WHEN** 注册配置提供长标签，或用户提交后出现字段校验错误
- **THEN** 标签与错误文案 SHALL 换行或在自身容器内完整呈现
- **AND** 文案 SHALL NOT 遮挡输入、验证码、提交按钮或登录链接，也 SHALL NOT 产生页面级横向 overflow

#### Scenario: 键盘完成注册主路径

- **WHEN** 用户使用 Tab 和 Shift+Tab 遍历模式按钮、区号、手机号、密码、提交按钮与登录链接
- **THEN** 焦点顺序 SHALL 与视觉和业务顺序一致
- **AND** 自定义响应式样式 SHALL NOT 移除可见焦点态或阻断模式切换

### Requirement: 桌面布局与外部契约保持稳定

注册页响应式修复 SHALL 保持正常桌面视口的既有 panel/Form 尺寸、认证 contract、路由、Provider 行为、应用自定义 CSS 注入点和共享认证页面行为。

#### Scenario: 桌面注册布局

- **WHEN** 用户在 1440px 桌面 viewport 打开标准注册页
- **THEN** Signup panel 与 Form SHALL 保持现有 460px / 400px 视觉基线
- **AND** Email/Phone 切换、手机号组合、提交和登录入口 SHALL 保持可操作

#### Scenario: 非 Signup 页面不受影响

- **WHEN** 响应式规则加载到 Admin 前端
- **THEN** 新规则 SHALL 仅作用于 Signup 专用作用域
- **AND** Login、Forget、Provider、Syncer、共享认证 CSS、API payload 与依赖版本 SHALL 保持不变
