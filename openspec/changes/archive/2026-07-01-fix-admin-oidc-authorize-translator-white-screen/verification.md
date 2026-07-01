## 验证摘要

本 change 修复 Admin 显式 OAuth/OIDC 授权入口白屏。验证记录只保留脱敏环境别名、client alias、错误 alias 和命令结果，不记录完整 URL、nonce、state、token、Cookie、账号密码、DSN 或 raw payload。

## 运行态复现

- 60 Insight 入口：从 Insight 用量页点击 `使用 aicodex-admin 登录` 后进入 Admin `/login/oauth/authorize`，client alias=`aicodex-insight-60`。页面 title=`aicodex-admin`，body text length=`0`，button count=`0`，console/pageerror alias=`translator TypeError`。
- 60 API 入口：直接访问 API 控制台发起的 Admin `/login/oauth/authorize`，client alias=`aicodex-api-60`。页面 title=`aicodex-admin`，body text length=`0`，button count=`0`，console/pageerror alias=`translator TypeError`。
- root cause：`web-admin/src/auth/Util.tsx` 和 `web-admin/src/auth/LoginPage.tsx` 将 `i18next.t` 作为未绑定方法保存到局部 `t`。授权页解析失败或错误提示渲染时，`t(...)` 调用丢失 `i18next` 实例上下文，i18next 内部读取 `this.translator` 抛 TypeError，导致 React 整页白屏。

## 自动化验证

- `yarn test --runTestsByPath src/auth/LoginPage.test.tsx --watchAll=false`
  - 修复前：失败，新增 regression 触发 `Cannot read properties of undefined (reading 'translator')`，栈指向 `Util.renderMessageLarge`。
  - 修复后：通过，2 tests passed。
- `openspec validate "fix-admin-oidc-authorize-translator-white-screen" --strict`：通过。
- `git diff --check`：通过。
- `node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`：通过。
- `yarn typecheck`：通过。
- `yarn build`：通过；保留既有 Browserslist outdated 与 bundle size warning。

## 覆盖率

- `yarn test --runTestsByPath src/auth/LoginPage.test.tsx --watchAll=false --coverage --collectCoverageFrom=src/auth/Util.tsx --collectCoverageFrom=src/auth/LoginPage.tsx`：通过。
- 覆盖率结果：All files statements `4.84%`、branches `4.89%`、functions `3.49%`、lines `4.95%`。
- 说明：统计对象包含 1700 行 `LoginPage.tsx` 和 330 行 `Util.tsx`，本次 regression 只覆盖授权错误提示白屏根因分支，未达到 85%。补救路径是后续把登录页错误渲染、正常登录表单、组织选择、captcha、WebAuthn/WeCom 等路径拆成可组合组件后分层补覆盖；本次 P0 修复以 root-cause regression、typecheck/build 和运行态复现为主要证据。

## 60 修复后 smoke 状态

当前代码尚未部署到 60 Admin。将本 RC 部署到 60 需要更新 Admin 前端 bundle 并重启或重新拉起测试服务，属于委托中要求先回传决策的环境操作。因此未执行修复后 60 全链路登录 smoke。

最小解除条件：

- master 明确授权将本工作分支部署到 60 Admin 测试服务，或由环境 owner 完成部署。
- 部署后重新验证 client alias=`aicodex-insight-60` 与 `aicodex-api-60` 的 Admin 授权页非白屏。
- Insight 回跳后确认用量页不再提示 Admin 登录态不可用；API 控制台回跳后确认不再停在 Admin 白屏。

needs_master_decision=`true`。
