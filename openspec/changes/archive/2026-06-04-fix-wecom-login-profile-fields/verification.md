# Verification

验证日期：2026-06-03

## 自动化验证

```bash
cd admin
go test ./idp -count=1
```

结果：通过。覆盖企业微信内部应用 IdP 相关测试，包括本次新增的 `user_ticket -> auth/getuserdetail` 主路径，以及 `mobile` 和 `biz_mail` 字段映射测试。

```bash
cd admin
go test ./idp -run TestWeComInternalIdProviderGetUserInfo -count=1
```

结果：通过。覆盖授权详情接口只返回 `userid` 时，使用通讯录 `user/get` 补齐 `name`、`mobile`、`email` 和 `avatar` 的回归场景。

```bash
cd admin
go test ./object -run TestApplyUserOAuthProfileProperties -count=1
```

结果：通过。覆盖 OAuth 资料回填中空手机号补齐、已有手机号不覆盖、Provider 侧属性保存。

```bash
cd web-admin
yarn test src/auth/Provider.test.js --watchAll=false
```

结果：通过。覆盖企业微信 `Internal + Normal` 登录 URL 保留 Provider 配置的 `scope=snsapi_privateinfo`。

```bash
cd web-admin
yarn test src/auth/WeComLoginPanel.test.js --watchAll=false
```

结果：通过。覆盖首页内嵌企业微信扫码组件初始化参数传入 `scope=snsapi_privateinfo`。

```bash
cd <repo-root>
git diff --check
```

结果：通过。未发现空白字符或格式噪声。

```bash
cd <repo-root>
openspec validate "fix-wecom-login-profile-fields" --strict
```

结果：通过。OpenSpec change 文档结构和 spec delta 有效。

## 运行态验证结论

验证日期：2026-06-04

验证范围：已获准的测试环境和企业微信测试链路，不记录具体环境地址、用户标识、企业 ID、AgentId、授权码或 token。

最终关注点结论：本 change 没有解决 PC 扫码登录后邮箱、手机号仍为空的问题根因；它只证明并修复了 admin 在企业微信返回字段时的落地能力。邮箱、手机号、头像的主动补齐需要后续单独接入企业微信客户端内 OAuth2 敏感授权入口。

检查项：确认测试环境已部署本次变更对应版本。

结果：通过。

检查项：确认登录页面、企业微信登录 URL 和内嵌扫码组件没有丢失 Provider 配置的 `scope`。

结果：通过。企业微信 PC 扫码 SSO 页面能够收到 `scope=snsapi_privateinfo`。

检查项：真实 PC 扫码登录后，确认企业微信接口返回的登录资料范围。

结果：PC 扫码 SSO 能返回内部用户身份，但未稳定返回 `user_ticket`，也未返回手机号、邮箱、企业邮箱或头像；通讯录详情兜底接口在该链路下只返回了可用的非敏感字段。

检查项：企业微信客户端内 OAuth2 敏感授权链路。

结果：通过。企业微信客户端内访问 OAuth2 敏感授权入口会出现敏感信息授权确认；用户同意后，`auth/getuserinfo` 返回 `user_ticket`，后续 `auth/getuserdetail` 返回手机号、邮箱、企业邮箱和头像等敏感字段。

结论：本次代码修复可以正确消费企业微信已经返回的手机号、邮箱、企业邮箱和头像，也可以在 PC 扫码发起阶段保留 `scope=snsapi_privateinfo`。但 PC 扫码 SSO 本身不保证触发敏感资料授权；如果要让用户主动补齐这些字段，需要后续单独增加企业微信客户端内 OAuth2 敏感授权入口。

## 后续未覆盖

- 本 change 未实现企业微信客户端内 OAuth2 敏感授权入口；该能力建议作为后续独立 change。
- 第三方服务商企业微信 Provider 场景未做真实运行态验证。
