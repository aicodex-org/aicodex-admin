# 飞书 / Lark 登录配置与验收

本文用于配置 AICodex 认证中心的国内飞书扫码登录和海外 Lark 登录。系统复用 `Lark` OAuth Provider 类型，不需要新增 `Feishu` Provider 类型。

## Provider 配置清单

1. 在认证中心后台创建或编辑 OAuth Provider，`Type` 选择 `Lark`。
2. 国内飞书关闭 `Endpoint mode` 开关，模式为 `Domestic Feishu`：
   - 授权域名：`accounts.feishu.cn`
   - API 域名：`open.feishu.cn`
   - App ID / App Secret 来自飞书开放平台
3. 海外 Lark 开启 `Endpoint mode` 开关，模式为 `Global Lark`：
   - 授权域名：`accounts.larksuite.com`
   - API 域名：`open.larksuite.com`
   - App ID / App Secret 来自 Lark open platform
4. 在飞书或 Lark 开放平台配置认证中心回调地址：`https://<认证中心实际登录 origin>/callback`。
5. 如果目标应用配置了 `forcedRedirectOrigin`，或多个应用共享同一个 Provider，不要盲目复制 Provider 页默认回调地址，应以实际发起登录的认证中心 origin 为准。
6. 在目标 AICodex 应用中绑定该 `Lark` Provider，并确保 Provider 对登录可见。
7. 在登录表单配置中保留 `Providers` signin item，飞书入口会显示在登录按钮下方的第三方 Provider 图标区。
8. 为稳定匹配通讯录同步用户，飞书 / Lark 应用需要开启“获取用户 user ID”字段权限，使 `authen/v1/user_info` 返回 `user_id`。

邮箱、手机号权限是可选权限；缺失时不阻断基础登录，但会影响账号资料补全。缺少 `user_id` 时系统只能退回 `union_id` / `open_id` 兼容匹配，可能无法稳定匹配已同步用户。

## AICodex Client 接入

Web/API、Insight、桌面端等 AICodex client 都应通过认证中心应用绑定同一个飞书 / Lark Provider。

认证链路分两层回调：

1. 飞书 / Lark 开放平台回调到认证中心 HTTPS `/callback`。
2. 认证中心完成登录后，再按原 OAuth/OIDC 请求回跳到 client 已登记的 `redirect_uri`。

不要把下游 client 的 OAuth/OIDC `redirect_uri` 配到飞书开放平台。桌面端的 `aicodex://...` custom scheme deep link 只属于第二层 client 回跳。

## 手工联调步骤

1. 从目标 AICodex client 发起 OAuth/OIDC 登录，确认 URL 中的 `client_id`、`response_type`、`redirect_uri`、`scope`、`state` 和 PKCE 参数符合目标应用配置。
2. 进入认证中心登录页后，点击登录按钮下方的飞书 / Lark Provider 图标。
3. 浏览器跳转到对应官方授权页：
   - 国内飞书：`https://accounts.feishu.cn/open-apis/authen/v1/authorize`
   - 海外 Lark：`https://accounts.larksuite.com/open-apis/authen/v1/authorize`
4. 扫码或授权后，飞书 / Lark 回到认证中心 `/callback`。
5. 认证中心完成用户匹配和登录，再回跳到原始 client `redirect_uri`。
6. 桌面端验收时，应确认外部浏览器完成认证后回到已登记的 custom scheme deep link，例如 `aicodex://oauth/callback` 或项目约定的桌面回调 URI。

## 实测前提与限制

当前仓库内可自动验证授权 URL、端点选择、后端 v2 token / v1 userinfo 解析、用户标识匹配、Provider 可见性和 OAuth client 上下文校验。真实飞书开放平台扫码闭环仍依赖可用的飞书企业应用、已发布应用可见范围、已配置的 HTTPS 认证中心 `/callback`、匹配端点区域的 App ID / App Secret，以及“获取用户 user ID”字段权限。没有这些外部前提时，只能完成本地 mock 和认证中心侧回归，不能声明已完成真实扫码授权实测。

## 2026-06-01 69 环境实测记录

本次在 69 环境的 `aicodex-admin` 验证了国内飞书企业应用真实授权链路。远端部署分支为 `hfl-test/add-feishu-homepage-login-and-admin-config`，提交为 `5ff77ee3f076311e4c8415313225fc56b1495312`，部署脚本健康检查通过。

实测配置：

1. 飞书企业：`飞书企业6091`。
2. 飞书应用：`AICodex`。
3. 认证中心 Provider：`Lark` 类型，关闭 endpoint mode，使用国内飞书端点。
4. 飞书开放平台回调地址：`https://auth.leagsoft.com/callback`。
5. 飞书应用可用范围：全部成员。
6. 飞书应用权限：已包含“获取用户身份标识”。
7. AICodex 应用：`aicodex-insight` 已绑定该 `Lark` Provider，登录表单保留 `Providers` 登录项。

实测过程与结果：

1. 未绑定 Provider 或登录表单缺少 `Providers` 登录项时，登录页不会出现飞书入口。
2. 使用飞书个人用户授权时，飞书提示没有 `AICodex` 使用权限；切换到 `飞书企业6091` 企业身份后可进入授权页。
3. 关闭应用注册时，认证中心完成飞书授权后会提示该 Provider 用户不存在且不允许注册新账户。
4. 打开 `aicodex-insight` 应用的 `启用注册`，并保持 Provider 行 `Can signup` / `Can signin` 可用后，飞书授权可创建并登录本地用户。
5. 新用户创建到 `aicodex-insight` 当前绑定的 AICodex 组织 `wecom-wwe7e01c69367e67bf`，这是认证中心按 Application 的 `organization` 归属创建用户的预期行为；Provider 类型为飞书/Lark 不会自动决定本地组织。
6. 用户编辑页 `第三方登录` 区域显示 `Lark` 已绑定，说明飞书账号已绑定到本地用户；原始绑定值可通过 `/api/get-user?id=<owner>/<name>` 响应中的 `data.lark` 查看。
7. 登录后可以进入 AICodex Insight，但页面提示 `报表访问未授权` 和 `账号映射未完成`。该现象属于 Insight 业务权限和账号映射配置未完成，不属于飞书 OAuth 链路失败。
8. 为飞书创建出的 admin 用户补充 `Properties.aicodexApiUserId = 1` 后，Insight 已能进入 usage provider 鉴权链路，但 usage provider 日志显示 `organizationId = wecom-wwe7e01c69367e67bf`，返回 `INVALID_ARGUMENT`；根因是未配置用量侧组织 UUID，admin 组织名不能作为 `aicodex-api` 的 `organizationId`。
9. 继续补充 `Properties.aicodexApiOrganizationId = 019e5071-1b17-7632-906e-bb56b62e9b21` 后，Insight 用量概览页面成功返回数据，验证指标包括额度使用、请求数、Token 数和模型数。

结论：

1. 国内飞书扫码/授权、认证中心 `/callback`、v2 token exchange、v1 userinfo、`User.Lark` 绑定、本地用户创建/登录、以及回跳到 AICodex Insight 的认证链路已完成真实企业应用验证。
2. Insight 报表访问已验证需要同时配置 admin 用户属性 `aicodexApiUserId` 和 `aicodexApiOrganizationId`；前者映射 `aicodex-api` 用量用户数字 ID，后者映射 `aicodex-api` 用量组织 UUID。
3. 测试完成后，如不希望企业成员自动注册到当前应用组织，应关闭目标 Application 的 `启用注册`，或改用通讯录同步/人工绑定方式维护用户。

## 排障清单

- 端点模式选错：国内飞书必须关闭 global endpoint，海外 Lark 必须开启。
- App ID / App Secret 不匹配：飞书和 Lark 凭证不跨区域通用。
- 飞书 / Lark 开放平台未配置认证中心 `/callback`。
- Provider 页默认回调地址与目标应用 `forcedRedirectOrigin` 不一致。
- 下游 client `redirect_uri` 未登记到认证中心应用，或被回调 state 篡改后被后端校验拒绝。
- Provider 未绑定到目标应用，或 Provider 对登录不可见。
- 缺少“获取用户 user ID”字段权限，导致 `user_id` 为空，影响同步用户稳定匹配。
- 邮箱或手机号可选权限不足，导致资料字段为空。
- 品牌显示异常：国内飞书默认应显示 Feishu，海外 Lark 默认显示 Lark，租户可用 `displayName` 覆盖展示名。
- 用户绑定不匹配：系统按 `user_id -> open_id -> union_id` 查找 `User.Lark`。
- Insight 提示账号映射未完成或请求参数错误：检查 admin 用户 `Properties` 是否同时包含有效的 `aicodexApiUserId` 和 `aicodexApiOrganizationId`，不要把 admin 组织名当作 `aicodex-api` 组织 UUID。
- 多个标识命中不同本地用户：系统会拒绝自动登录，需要人工处理账号绑定，避免账号串联。
- OAuth client 上下文校验失败：检查 `client_id`、`response_type`、`redirect_uri`、`scope`、`state` 和 PKCE 参数是否来自原始认证中心登录请求。
