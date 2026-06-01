## 1. 登录页飞书入口

- [x] 1.1 梳理 `LoginPage.js`、`ProviderButton.js`、`Setting.getProviderLogoURL()`、`Provider.getAuthUrl()` 的 Provider 小图标渲染链路，确认 `Providers` signin item 下 `Lark` Provider 的展示和点击行为；`LarkLoginButton.js` 只作为大按钮入口回归项
- [x] 1.2 新增集中飞书/Lark endpoint 与品牌解析工具，基于 `type = Lark` 和全局端点开关派生 `Domestic Feishu` / `Global Lark`、授权域名、API 域名、默认品牌名、alt 文案和品牌图标
- [x] 1.3 调整飞书/Lark 小图标入口、大按钮入口、Provider 预览文案、图片 alt、图标和按钮文本，使国内飞书默认显示“飞书”，海外 Lark 默认显示“Lark”，且不依赖管理员手填 `displayName`
- [x] 1.4 更新 `Provider.getAuthUrl()` 中 `Lark` 国内/海外授权 URL 生成逻辑，确保关闭全局端点时跳转 `accounts.feishu.cn/open-apis/authen/v1/authorize`，开启时跳转 `accounts.larksuite.com/open-apis/authen/v1/authorize`，并使用标准 `client_id`、`response_type=code`、URL-encoded `redirect_uri` 与 URL-encoded `state`
- [x] 1.5 保持协议勾选、Provider 可见性、其他 OAuth Provider 和 WeCom 入口现有行为不退化
- [x] 1.6 复核 `AuthCallback.js` 与 OAuth 登录状态恢复逻辑，确保飞书回调后保留原始 AICodex client 上下文，不把用户错误落到 admin 首页
- [x] 1.7 在回调登录接口补齐原始 OAuth/OIDC client 请求的后端校验或服务端上下文恢复，覆盖 `client_id`、`response_type`、`redirect_uri`、`scope`、`state`、PKCE 和应用可见 Provider 关系；不得信任回调 URL 或前端 state 中临时传入的 `redirect_uri`

## 2. 后台 Provider 配置体验

- [x] 2.1 为 `Lark` OAuth Provider 增加“飞书 / Lark 共用类型”的配置说明，明确国内飞书不需要新增 `Feishu` 类型，后台默认类型仍保持 `Lark`
- [x] 2.2 将“启用全局地址”的 UI 解释收敛为业务 endpoint mode：关闭为 `Domestic Feishu`，开启为 `Global Lark`，并提示 App ID / App Secret 不跨区域通用
- [x] 2.3 在 Provider 配置页展示飞书/Lark 默认回调地址提示，说明当前值来自管理端 origin；若应用配置 `forcedRedirectOrigin` 或多应用共享 Provider，则以目标应用实际发起登录的认证中心 origin 下 `/callback` 为准
- [x] 2.4 为 `Lark` Provider 增加或复核保存前必填校验，覆盖 App ID、App Secret 和基础 OAuth 配置
- [x] 2.5 补齐国内飞书品牌图标资产或明确共享品牌资产映射，避免国内飞书入口暴露 `Lark` 命名的图片语义
- [x] 2.6 在配置说明中区分飞书开放平台回调地址和 AICodex client redirect URI，明确桌面端 custom scheme deep link 属于下游 client 回跳，不配置到飞书开放平台

## 3. 后端飞书/Lark OAuth 链路

- [x] 3.1 复核 `admin/idp/lark.go` 当前授权码换 token 和用户信息获取接口，确认国内飞书与海外 Lark 的标准授权域名、API 域名和回调参数差异
- [x] 3.2 将 `LarkIdProvider` 主流程对齐到当前推荐的 `authen/v2/oauth/token` + `authen/v1/user_info`，国内飞书走 `open.feishu.cn`，海外 Lark 走 `open.larksuite.com`
- [x] 3.3 如确需保留历史 v1 fallback，限定为显式兼容分支，补充日志、错误信息和测试；不得把 v1 作为默认主路径
- [x] 3.4 在 `LarkIdProvider` 返回 `UserInfo.Id`、`UserInfo.UnionId` 和 `UserInfo.Extra` 中的 `user_id`、`open_id`、`union_id`、`tenant_key`，确保调用方拿到完整标识集合
- [x] 3.5 在 `admin/controllers/auth.go` 增加 Lark 登录/绑定专用多标识查找，按 `user_id -> open_id -> union_id` 查 `User.Lark`，多个标识命中不同用户时拒绝自动登录
- [x] 3.6 在 `admin/object/user_util.go` 保存 `oauth_Lark_userId`、`oauth_Lark_openId`、`oauth_Lark_unionId`、`oauth_Lark_tenantKey` 等原始 OAuth 属性，并在历史 `open_id` / `union_id` 命中时通过 `admin/object/user.go` 或同层 helper 回填 `User.Lark = user_id`
- [x] 3.7 补充后端错误映射或日志上下文，让 App ID/Secret 错误、回调地址不匹配、权限不足、应用不可用、OAuth client 上下文校验失败和用户标识冲突能被定位

## 4. 测试与回归

- [x] 4.1 补充 `Provider.getAuthUrl()` 相关前端测试或等效校验，覆盖国内飞书 `accounts.feishu.cn` 和海外 Lark `accounts.larksuite.com` 两种授权端点，并断言 `client_id`、`response_type=code`、`redirect_uri`、`state` 参数名和值编码
- [x] 4.2 补充品牌解析和 Provider 配置校验测试，覆盖小图标入口、大按钮入口、Provider 预览、国内飞书默认显示、海外 Lark 默认显示、`displayName` 覆盖、App ID、App Secret、endpoint mode 提示和保存前错误
- [x] 4.3 补充 `LarkIdProvider` 后端单元测试或 HTTP mock，覆盖 v2 token exchange、userinfo 解析、字段缺失、错误响应和可选 v1 fallback
- [x] 4.4 补充用户绑定测试，覆盖同步用户 `user_id` 命中、历史 `open_id` 命中并回填、`union_id` fallback、多个标识命中不同用户时拒绝登录
- [x] 4.5 补充认证中心 client 上下文测试，覆盖浏览器型 AICodex client 的 HTTPS redirect URI、桌面 client 的自定义 scheme redirect URI、篡改回调 `redirect_uri` 被忽略或拒绝、篡改 state 中 client 参数被后端重新校验拒绝
- [x] 4.6 回归验证登录页 Provider 小图标区，确认飞书入口、其他 OAuth 入口和企业微信入口互不影响

## 5. 文档与验收

- [x] 5.1 更新项目文档，补充国内飞书扫码登录配置清单：Provider 类型、endpoint mode、App ID、App Secret、默认回调地址、应用实际登录 origin、Provider 绑定、可见性、稳定匹配同步用户所需的“获取用户 user ID”字段权限和标准显示效果
- [x] 5.2 补充 AICodex client 接入说明，覆盖 Web/API、Insight、桌面端等 client 如何通过认证中心应用绑定同一个飞书/Lark Provider
- [x] 5.3 补充手工联调步骤：从 AICodex client 发起登录、点击飞书入口、扫码/授权、回到认证中心 `/callback`、再回跳原 client redirect URI
- [x] 5.4 补充桌面端验收说明，覆盖外部浏览器打开认证 URL、认证中心完成飞书登录后回到已登记 custom scheme deep link 的路径
- [x] 5.5 补充排障说明，覆盖端点选错、App 凭证不匹配、飞书回调地址未配置、Provider 页默认回调地址与应用 `forcedRedirectOrigin` 不一致、client redirect URI 配错、应用不可用、“获取用户 user ID”字段权限缺失、邮箱/手机号等可选权限不足、品牌显示异常、用户绑定不匹配、多标识冲突和 OAuth client 上下文校验失败
- [x] 5.6 运行 OpenSpec 校验、相关前端测试、后端测试或构建检查，并记录 69 环境真实飞书企业应用联调结果、用户绑定结果和 Insight 业务侧映射验收结果；实测确认 `aicodexApiUserId` 与 `aicodexApiOrganizationId` 同时配置后，飞书登录用户可访问 Insight 用量概览
