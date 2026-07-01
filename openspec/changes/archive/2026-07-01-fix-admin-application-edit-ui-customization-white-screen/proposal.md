# 修复应用编辑页界面定制白屏

## Why

部署到 60 环境后，应用编辑页 `/applications/:organizationName/:applicationName#ui-customization` 仍然白屏。该 tab 会渲染注册、登录和授权提示页的真实预览，60 环境的运行态应用记录包含 `signupItems: null`、`themeData: null`、`orgChoiceMode: ""` 等后端可返回形态，需要保证预览不会因为子组件渲染异常导致整页崩溃。

## What Changes

- 保留当前基线中 `LoginPage` / `Util` 授权入口 i18n 绑定修复，并补齐注册预览子树中的同类 i18n 绑定防御。
- 增加聚焦回归测试，覆盖 60 形态应用数据直达 `#ui-customization` 时不会白屏，并覆盖授权错误提示渲染不崩溃。
- 保持应用编辑页 API、保存 payload、路由语义和后端行为不变。

## Non-Goals

- 不修改 Provider、Syncer、Gateway、组织、用户或 Admin-2/Admin-3 UX worker 写集。
- 不重写应用编辑页 tab 布局或登录/注册完整认证流程。
- 不改变应用保存、Provider 配置、OAuth/OIDC/SAML 参数、授权提示逻辑或后端契约。

## Impact

- 前端范围：`web-admin/src/auth/SignupPage.tsx`、`web-admin/src/auth/Util.test.ts` 与应用编辑页聚焦测试；`LoginPage.tsx` / `Util.tsx` 生产修复来自当前基线并在 rebase 中保留。
- 验证范围：OpenSpec strict validate、聚焦 Jest、TypeScript gate/typecheck/build，以及可行的 60 环境浏览器 smoke 或等价脱敏证据。
