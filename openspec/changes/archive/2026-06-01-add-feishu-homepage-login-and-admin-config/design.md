## Context

`aicodex-admin` 当前已经从 Casdoor 继承了 `Lark` OAuth Provider 基础实现：前端可以生成 Lark/飞书授权 URL，后端有 `LarkIdProvider`，用户模型也已有 `Lark` 绑定字段。现有实现通过 `disableSsl` 字段控制是否启用 global endpoint：关闭时走国内飞书开放平台，开启时走海外 Lark 开放平台。

这说明本次不应新增一个独立 `Feishu` Provider 类型。真正缺口是产品化联通：登录页没有明确的飞书入口口径，后台配置页没有把“国内飞书 / 海外 Lark”讲清楚，现有前端仍使用历史授权入口，后端仍以 `tenant_access_token` + `authen/v1/access_token` 方式换取用户身份。当前飞书与 Lark 文档推荐的网页授权链路是：授权页使用账号域名获取 `code`，服务端使用开放平台 API 域名调用 `authen/v2/oauth/token` 获取 `user_access_token`，再调用 `authen/v1/user_info` 获取登录用户信息。

`aicodex-admin` 在 AICodex 产品中是认证中心，不只是一个独立管理后台。当前和后续接入对象包括 Web/API、Insight、桌面端等多类 AICodex client。`D:\CodeRepo\LeagProject\aicodex\aicodex-app-spec` 中的桌面端代码已经存在 OAuth/深链登录形态，例如外部浏览器打开 `authUrl` 后通过 `aicodex://oauth/callback` 或 `aicodex://auth/uniiam/callback` 回到桌面端。因此本次飞书登录的验收必须覆盖两层回调：

- 飞书开放平台回调到认证中心实际登录源的 `/callback`。
- 认证中心登录成功后，按原 OAuth/OIDC 请求把授权结果回跳到发起登录的 client；Web client 通常是 HTTPS redirect URI，桌面 client 可能是自定义 scheme deep link 或后续约定的本地回调方式。

已有 `add-wecom-homepage-login-and-admin-config` change 不能作为事实依据。企业微信只提供一个“登录按钮下方第三方入口形态”的参考，当前企业微信真实行为必须以当前代码和运行态配置为准。

登录页现有结构支持两种入口形态：

- `Signin methods` 页签：适合内嵌二维码面板。
- `Providers` 第三方图标区：适合截图中登录按钮下方的小图标入口。

用户期望的是第二种：类似当前登录按钮下方的第三方小图标入口，点击后进入飞书官方扫码/授权页，扫码完成后回到认证中心 `/callback`，再由认证中心完成应用级 OAuth 登录。

## Goals / Non-Goals

**Goals:**

- 复用 `Lark` Provider 类型打通国内飞书扫码登录，不新增 `Feishu` Provider 类型。
- 登录页在 `Providers` 区域展示飞书入口，入口位置和交互对齐现有第三方登录图标，并通过统一品牌显示规则区分国内飞书与海外 Lark。
- 支持 AICodex Web/API、Insight、桌面端等 client 作为 OAuth/OIDC client 发起登录时展示飞书入口，并在认证中心登录成功后正确回跳原 client。
- 后台配置页明确国内飞书和海外 Lark 的差异，降低管理员把端点、App ID、App Secret、回调地址配错的概率。
- 前端授权页和后端 token/userinfo API 按国内/海外端点选择走当前推荐链路，完成用户绑定和会话登录。
- 飞书/Lark 登录与通讯录同步使用兼容的本地用户匹配策略，避免同一人因 `open_id` / `user_id` 差异生成重复账号。
- 保留海外 Lark 登录能力，不因国内飞书改造破坏已有 `Lark` Provider。
- 补充联调文档和验收清单，覆盖开放平台回调地址、权限、可见范围和常见错误。

**Non-Goals:**

- 不新增独立 `Feishu` Provider 类型，也不迁移历史 `Lark` Provider 数据。
- 不实现登录页内嵌飞书二维码面板；P0 点击入口后跳转到飞书官方授权/扫码页。
- 不实现飞书组织架构同步、通讯录同步或后台自动绑号管理台。
- 不重做登录页整体视觉设计。
- 不把海外 Lark 作为本次主验收链路；只要求现有 global endpoint 行为不退化。
- 不以历史企业微信提案校验当前企业微信实现；企业微信仅做当前代码回归项。

## Decisions

### 1. Provider 类型继续使用 `Lark`，产品文案体现“飞书 / Lark”

当前前后端、用户字段和 Provider 工厂都已经以 `Lark` 为类型名。如果新增 `Feishu` 类型，会引入重复 Provider、重复用户绑定字段、历史数据迁移和兼容判断。更合理的做法是保留 `type = Lark`，在配置页、提示文案和文档中说明：该类型同时支持国内飞书和海外 Lark，端点由“启用全局地址”控制。

备选方案是新增 `Feishu` Provider 类型。该方案从产品命名上更直观，但会扩大数据模型和回归范围，不作为 P0。

### 2. 登录页入口使用 `Providers` 图标区，并使用集中品牌解析

用户截图中的入口位于登录按钮下方，和当前 `Providers` signin item 的小图标渲染方式一致。飞书官方授权页自身承载扫码和授权确认，因此 P0 不需要加载内嵌二维码组件。

实现上优先复用 `ProviderButton.renderProviderLogo()` 和 `Provider.getAuthUrl()`。如果应用绑定了可见的 `Lark` OAuth Provider，且登录表单配置包含 `Providers` 项，则登录页展示飞书/Lark 入口。当前小图标入口主要依赖 `ProviderButton.renderProviderLogo()`、`Setting.getProviderLogoURL()` 和 `provider.displayName`，`LarkLoginButton.js` 只影响大按钮形态；实现阶段不能只修改大按钮组件。

长期标准做法不是要求管理员把 `displayName` 手工改成“飞书”。前端应增加集中品牌解析逻辑，例如 `getLarkRegion(provider)` / `getLarkBrand(provider)`：

- `provider.type = Lark` 且全局端点关闭：默认显示“飞书”，使用飞书品牌图标和无障碍文本。
- `provider.type = Lark` 且全局端点开启：默认显示“Lark”，使用 Lark 品牌图标和无障碍文本。
- `displayName` 只作为租户自定义展示名覆盖默认品牌名，不能成为区分国内/海外端点的唯一机制。

如果仓库当前只有 `lark.svg` 或 `social_lark.png`，实现阶段应补齐国内飞书使用的本地品牌资产，或通过明确命名的共享资产证明该图标同时适用于飞书和 Lark；不能在国内飞书入口上硬编码 “Lark” 文案或 alt。

备选方案是新增 `Lark/Feishu` signin method 页签并渲染专属面板。该方案更像企业微信内嵌二维码，但和用户给出的入口形态不一致，且会增加配置复杂度。

### 2.1 Client 级 OAuth/OIDC 登录必须保留原始上下文

当 AICodex Web/API、Insight、桌面端等 client 通过认证中心发起 OAuth/OIDC 登录时，登录页和第三方 Provider 跳转必须保留原请求里的应用、client、redirect URI、response type、scope、state、PKCE 等信息。飞书 Provider 的 `state` 只用于认证中心在 `/callback` 找回原始 client 上下文；登录成功后，认证中心仍然按原 OAuth/OIDC 请求返回 client 所需的授权结果。

当前代码把原始 OAuth/OIDC 参数编码到前端生成的 Provider `state` 中，并在 `AuthCallback.js` 中还原后用于最终回跳。这个机制可以继续作为上下文传递载体，但不能作为唯一信任来源。实现时必须在后端登录完成前重新校验还原出的 client 请求，至少覆盖 `client_id`、`response_type`、`redirect_uri`、`scope`、`state`、PKCE 参数和应用可见 Provider 关系；更稳妥的实现是把原始请求保存为服务端短期登录上下文，Provider `state` 只携带不可伪造的上下文 key。

若继续使用编码 state 方案，本次必须补齐一个后端校验点：`AuthCallback.js` 调用登录接口时提交还原出的原始 OAuth/OIDC 参数，`admin/controllers/auth.go` 在签发最终 code/token 前调用现有 OAuth 校验能力重新验证这些参数；任何来自飞书回调 URL、deep link 或用户可改 query 的 `redirect_uri` 都不得覆盖已校验的原始 client redirect URI。

实现时需要重点验证：

- `Lark` Provider 绑定到目标 client 对应的认证中心应用后，只有 Provider 可见时才在该 client 登录页展示飞书入口。
- 飞书开放平台只配置认证中心登录源 `/callback`，不要求每个目标应用都配置飞书回调地址。
- 用户从任一 AICodex client 发起登录时，飞书回调后不能丢失原 client 上下文，也不能错误落到 admin 首页。
- 同一个共享 Provider 绑定多个认证中心应用时，client 级权限、redirect URI、response type、scope 和 PKCE 校验仍由发起登录的 client 控制。
- 桌面端使用自定义 scheme deep link 时，认证中心必须只回跳到已登记的 redirect URI；deep link 中不能信任外部传入的 `redirect_uri` 覆盖本地保存的登录上下文。

### 3. 端点选择保留现有字段，但 UI 使用业务化 endpoint mode

现有持久化字段 `disableSsl` 对 Lark 表示“Use global endpoint”。为了避免数据模型变更，本次不重命名字段，只在 UI 中强化语义：

- 关闭：`Domestic Feishu`，授权页使用 `https://accounts.feishu.cn/open-apis/authen/v1/authorize`，API 使用 `https://open.feishu.cn`。
- 开启：`Global Lark`，授权页使用 `https://accounts.larksuite.com/open-apis/authen/v1/authorize`，API 使用 `https://open.larksuite.com`。

授权 URL 必须按当前飞书/Lark 标准参数生成：使用 `client_id=<App ID>` 而不是历史 `app_id` 参数，显式携带 `response_type=code`，并对 `redirect_uri` 与 `state` 做 URL 编码。实现和测试都不能只断言域名替换。

实现上应引入小而稳定的派生模型，而不是在各处直接解释 `disableSsl`：

- `endpointMode = domestic-feishu | global-lark`
- `authBaseUrl`
- `apiBaseUrl`
- `brandName`
- `brandLogo`

配置页需要展示默认回调地址，并提示管理员在对应开放平台配置实际登录源下的同一个 URL。由于 Provider 可以被多个应用共享，而应用可能配置 `forcedRedirectOrigin`，Provider 编辑页没有唯一的应用上下文；因此 UI 文案不能承诺“唯一正确回调地址”，应明确默认值来自当前管理端 origin，最终以目标应用实际发起登录时使用的认证中心 origin 为准。国内飞书应用的 App ID / App Secret 不能用于海外 Lark 端点，反之亦然。

### 4. 后端登录链路必须使用当前推荐 token 流程

当前 `LarkIdProvider` 先取 `tenant_access_token`，再调用历史版本 `authen/v1/access_token`。飞书与 Lark 当前文档均推荐 `authen/v2/oauth/token` 获取 `user_access_token`，再调用 `authen/v1/user_info` 获取登录用户信息。

实施阶段应把国内飞书和海外 Lark 的授权码换 token 统一到域名匹配的 v2 OAuth token 流程：

- 国内飞书：`POST https://open.feishu.cn/open-apis/authen/v2/oauth/token`
- 海外 Lark：`POST https://open.larksuite.com/open-apis/authen/v2/oauth/token`
- 用户信息：`GET {apiBaseUrl}/open-apis/authen/v1/user_info`

不再把“保留 v1 作为主路径”作为可接受实现。若为了兼容历史租户确需 fallback，必须满足三个条件：仅在 v2 返回明确不兼容错误时触发、日志标明 fallback 原因、测试覆盖 fallback 不影响 v2 主路径。

### 5. 用户绑定字段使用 `user_id` 优先，并兼容历史 `open_id`

飞书/Lark 返回的 `open_id`、`union_id`、`user_id` 都可能参与身份识别。现有代码把 `UserInfo.Id` 设为 `open_id`，但同步链路可能使用 `user_id` 写入 `User.Lark`。如果直接改绑定主键，可能影响已有海外 Lark 用户；如果完全不改，国内飞书和后续同步用户可能无法自动匹配。

本次采用明确策略：

- `UserInfo.Id` 优先设置为 `user_id`；缺失时依次回退 `union_id`、`open_id`。
- `UserInfo.UnionId` 设置为 `union_id`，`UserInfo.Extra` 保存 `user_id`、`open_id`、`union_id`、`tenant_key` 等原始标识。
- OAuth 登录匹配 `Lark` 字段时按 `user_id -> open_id -> union_id` 查找，避免已同步用户和历史 open_id 绑定用户重复。
- 如果通过 `open_id` 或 `union_id` 找到历史用户，且当前回调包含 `user_id`，登录成功后将 `User.Lark` 回填为 `user_id`，同时在 `oauth_Lark_*` 属性中保留原始标识。
- 创建新用户前必须完成上述所有候选标识查找；不能只按一个标识失败就创建新账号。

实现上不应把该策略只放在 `LarkIdProvider` 中。`LarkIdProvider` 负责返回完整标识，`admin/controllers/auth.go` 负责登录/绑定前的多标识查找和冲突拒绝，`admin/object/user_util.go` 负责把 `Extra` 中的原始标识落到 `oauth_Lark_userId`、`oauth_Lark_openId`、`oauth_Lark_unionId`、`oauth_Lark_tenantKey` 等属性，`admin/object/user.go` 或同层 helper 负责 `User.Lark` 的兼容回填。否则即使 `UserInfo.Id` 改成 `user_id`，历史 `open_id` 用户和同步用户仍可能无法稳定匹配。

为了让扫码登录和通讯录同步稳定匹配，联调文档必须要求飞书/Lark 应用开启“获取用户 user ID”字段权限，以便 `authen/v1/user_info` 返回 `user_id`。邮箱、手机号等字段仍按可选权限处理，缺失时不阻断基础登录；但缺少 `user_id` 时只能走 `union_id` / `open_id` 兼容路径，必须在排障说明中明确其对同步用户匹配的影响。

## Risks / Trade-offs

- [复用 `Lark` 类型会让管理员误以为只能配置海外 Lark] → 在 Provider 配置页和文档中使用“飞书 / Lark”说明，并把国内端点作为关闭全局地址的推荐配置。
- [升级到 v2 token 流程可能影响历史 Lark Provider] → 增加单元测试或等效 HTTP mock，覆盖国内飞书和海外 Lark 两个域名。
- [用户绑定字段变更可能导致老用户无法匹配] → 实现兼容匹配和回填，不删除或覆盖已有绑定字段。
- [同一个用户多个标识命中不同本地用户] → 登录时必须拒绝自动合并并返回可排查错误，避免账号串联。
- [飞书开放平台权限不足时用户信息字段为空] → 登录错误和文档中提示所需权限；“获取用户 user ID”字段权限影响同步用户稳定匹配，邮箱、手机号等非必需字段为空时不阻断基础登录。
- [只做小图标跳转不等于内嵌二维码] → 明确 P0 验收是“点击图标进入飞书官方扫码/授权页并回调登录”，不要求页面内直接渲染二维码。
- [认证中心回调和目标 client 回跳混淆] → 文档和测试必须区分飞书开放平台回调地址 `/callback` 与 client OAuth/OIDC redirect URI；实现不得把 client redirect URI 配到飞书开放平台中。
- [桌面 deep link 被错误当成飞书开放平台回调] → 飞书开放平台只配置认证中心 HTTPS `/callback`，桌面 deep link 只作为认证中心完成登录后的 OAuth/OIDC client redirect URI。
- [Provider 配置页无法知道所有应用的 forced redirect origin] → 配置页展示当前 origin 下的默认回调，并把应用级实际登录 origin 写入提示和文档；涉及多应用共享 Provider 时必须逐个核对发起登录应用。
- [前端 state 中携带原始 OAuth 参数被篡改] → 回调登录前必须在后端重新校验原始 client 请求，或改为服务端短期上下文 key；不能只靠前端解码 state 后直接回跳。

## Migration Plan

1. 保留已有 `Lark` Provider 数据结构和类型名。
2. 新增集中 endpoint/brand 解析逻辑，并替换登录页和配置页中的 Lark 硬编码显示。
3. 更新前端授权 URL 到账号域名的标准授权入口，并确保小图标入口、大按钮入口和 Provider 表格预览使用同一品牌解析。
4. 在回调登录链路补齐原始 OAuth/OIDC client 请求的后端校验或服务端上下文恢复。
5. 更新后端 `LarkIdProvider` 到 v2 token + v1 userinfo 主流程，并补充兼容测试。
6. 更新用户匹配、OAuth 属性保存和 `User.Lark` 回填逻辑，避免同步用户与扫码登录用户重复。
7. 用 Web/API、Insight、桌面端这类真实或等效 AICodex client 回归认证中心登录发起、飞书回调和 client 回跳；桌面端至少覆盖自定义 scheme deep link 的授权码回传。
8. 补充文档和手工验收清单。
9. 若上线后飞书新流程异常，可临时关闭该 Provider 可见性或回滚后端 token 变更；不能通过改回历史授权页作为长期方案。

## Implementation Notes

- 国内飞书入口必须通过集中品牌映射拿到飞书品牌名、图片 alt 和图标路径。若飞书与 Lark 使用同一个视觉图标，也必须在代码层通过 `feishu` 品牌键或共享品牌映射表达，不能让国内飞书入口直接暴露 `lark.svg` 或 “Sign in with Lark” 的语义。
- Provider 配置页的回调地址组件应复用 WeCom 现有只读展示形态，但文案要明确“当前管理端 origin 的默认值”和“应用 forced redirect origin 下的实际登录 origin”之间的差异。
