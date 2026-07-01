# 设计说明

## 目标

应用编辑页的 `界面定制` tab 在直接通过 hash 进入或从其它 tab 切换进入时，必须能渲染可配置项和预览区域，不能因为预览子树的本地渲染异常触发整页白屏。

## 根因判断

`ui-customization` tab 会通过 `renderSignupSigninPreview()` 渲染真实 `SignupPage` / `LoginPage`，并通过 `renderPromptPreview()` 渲染真实 `PromptPage`。用户补充的现场根因是 `LoginPage.tsx` 和 `Util.tsx` 在模块级使用 `const t = i18next.t as ...` 保存裸函数；`SignupPage.tsx` 也存在同类预览风险。`i18next.t` 依赖实例上下文，作为裸函数调用时 `this` 丢失，会在登录预览或授权错误提示渲染阶段报 `Cannot read properties of undefined (reading 'translator')`，React 未捕获该渲染异常后表现为白屏。

## 方案

- 当前基线已通过 Admin-2 的 OIDC 修复将 `LoginPage` 和 `Util` 的 `t` helper 改成 `i18next.t.bind(i18next)`；本 change 在 rebase 中保留该修复，并将 `SignupPage` 的同类 helper 改成绑定安全的箭头函数包装。
- 不在应用编辑页增加错误吞噬或全局 AntD/i18n 覆盖，避免掩盖真实预览错误。
- 用 60 运行态数据形态构造测试 fixture，直接渲染 `ApplicationEditPage` 的 `#ui-customization` 内容，确保登录/注册/授权提示预览子树能挂载；另用 `renderMessageLarge` 聚焦覆盖授权错误提示不再因 i18n 绑定丢失而崩溃。

## 风险与边界

- 该修复只改变 i18n helper 的调用绑定，不改变翻译 key、显示文本、认证流程、API 或保存 payload。
- `PromptPage` 已使用绑定安全的箭头函数，不纳入生产修改；测试中只为其后端调用补 mock，避免单测环境网络调用干扰预览渲染断言。
