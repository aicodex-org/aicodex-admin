## Why

当前从外部应用跳转到 `aicodex-admin` 并使用企业微信扫码登录后，登录成功的企业微信用户不会补齐邮箱和手机号。该问题会影响后续按手机号、邮箱识别用户、展示用户资料和排查账号绑定问题。

从代码和企业微信接口文档看，企业微信敏感字段可能来自 `auth/getuserdetail` 或通讯录接口，但当前登录链路没有完整映射 `mobile`、`biz_mail`，并且已有用户 OAuth 回填逻辑不会补齐手机号。

## Scope Note

本 change 没有彻底解决“PC 扫码登录后自动补齐邮箱、手机号”的最终诉求。真实验证显示，PC 扫码 SSO 即使携带 `scope=snsapi_privateinfo`，也不保证触发企业微信敏感资料授权确认，不保证返回手机号、邮箱或头像。

本 change 的交付边界是：企业微信已经返回邮箱、手机号等字段时，`aicodex-admin` 能正确映射、回填并保持不覆盖已有资料。要让用户主动授权并补齐邮箱、手机号、头像，需要后续单独建设企业微信客户端内 OAuth2 敏感授权入口，建议另开 change 处理。

## What Changes

- 企业微信内部应用登录获取用户信息时，解析 `mobile`、`email`、`biz_mail` 等敏感字段。
- 企业微信扫码登录发起时保留 Provider 配置的 `scope`，避免 admin 发起阶段丢失 `snsapi_privateinfo` 等授权范围。
- 当 `auth/getuserdetail` 只返回 `userid` 或缺少资料字段时，使用通讯录 `user/get` 做非空补充。
- 当企业微信返回 `biz_mail` 但普通邮箱为空时，使用 `biz_mail` 作为本地邮箱兜底。
- OAuth 登录资料回填时，在本地手机号为空且 Provider 返回手机号时补齐 `User.Phone`。
- OAuth 登录资料回填继续只补空值，不覆盖后台或通讯录同步已经维护的邮箱、手机号。
- 增加回归测试，覆盖企业微信登录敏感字段解析和已有用户 OAuth 资料回填。

## Capabilities

### New Capabilities
- `wecom-login-profile-fields`: 定义企业微信登录成功后，系统如何从企业微信返回字段中补齐本地用户邮箱、手机号和 OAuth 属性。

### Modified Capabilities

## Impact

- 后端企业微信内部应用 IdP：`admin/idp/wecom_internal.go`。
- 后端 OAuth 用户资料回填：`admin/object/user_util.go`。
- 前端企业微信登录发起：`web-admin/src/auth/Provider.js`、`web-admin/src/auth/WeComLoginPanel.js`。
- 测试：`admin/idp/wecom_internal_test.go`、`admin/object/user_util_test.go`、`web-admin/src/auth/Provider.test.js`、`web-admin/src/auth/WeComLoginPanel.test.js`。
- 外部依赖：企业微信敏感字段仍依赖企业微信应用可见范围、通讯录读取权限、敏感字段授权配置，以及用户授权结果；代码只保证“返回了就正确落地”。
