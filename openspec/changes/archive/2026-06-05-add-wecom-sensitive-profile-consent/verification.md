## 2026-06-04 后端授权意图里程碑

### 自动化验证

- `go test ./idp -run TestWeComInternalIdProviderGetUserInfo -count=1 -v`
  - 结果：通过。
  - 覆盖：企业微信 Internal IdP 通过敏感授权详情和通讯录兜底映射手机号、邮箱、头像，并在 `UserInfo.Extra` 保留 `corp_id`、`userid`、`biz_mail`、`open_userid` 等非 token 边界字段。
- `go test ./object -run "Test(GetWecomProfileConsentIntentByName|ExpireWecomProfileConsentIntentIfNeeded)" -count=1 -v`
  - 结果：通过。
  - 覆盖：按意图 ID 查询、未过期意图不更新、已过期活跃意图转为 `expired`、已完成意图不会被过期逻辑再次消费。
- `go test ./controllers -run "Test(GetWecomProfileConsentIntentStatus|CompleteWecomProfileConsentLoginIntent|HandleWecomProfileConsentCallback)" -count=1 -v`
  - 结果：通过。
  - 覆盖：轮询接口通过请求头校验 `pollToken` 且响应不回显 token，complete 从请求体读取 `pollToken` 和 MFA 字段，callback 在无效 state 时不换取资料、有效 state 时写入 `authorized` 结果。
- `go test ./idp ./object ./controllers -run "Test(WeComInternalIdProviderGetUserInfo|WecomProfileConsent|CreateWecomProfileConsentLoginIntent|GetWecomProfileConsentIntentStatus|CompleteWecomProfileConsentLoginIntent|HandleWecomProfileConsentCallback)" -count=1 -v`
  - 结果：通过。
  - 覆盖：本轮后端改动的组合定向回归。

### 备注

- 测试输出中出现 `open conf/app.conf` 初始化提示，这是测试环境未加载本地运行配置的既有提示；上述定向用例未依赖真实企业微信、真实企业标识、Secret、授权码、token、手机号或邮箱。

## 2026-06-04 前端登录页里程碑

### 自动化验证

- `yarn test --runTestsByPath src/auth/AuthBackend.test.js src/auth/WeComLoginPanel.test.js --watchAll=false --runInBand`（工作目录：`web-admin`）
  - 结果：通过，9 个用例通过。
  - 覆盖：企业微信敏感授权登录意图 API 封装、`pollToken` 通过请求头传递且不进入 URL、登录上下文随创建意图提交、默认展示 OAuth2 授权二维码、轮询到 `authorized` 后调用 complete、`NextMfa` 时渲染 MFA 表单并避免提前登录成功、旧 `WwLogin` 仅在兼容 fallback 操作后加载。

### 备注

- 测试输出包含 React 18 下旧版 Testing Library 使用 `ReactDOM.render` 的既有警告；本次验证的断言全部通过。
- 前端测试数据使用虚构的应用、Provider、意图 ID、`pollToken` 和授权 URL，不包含真实企业标识、Secret、授权码、token、手机号或邮箱。

## 2026-06-04 后端主动同步资料里程碑

### 自动化验证

- `go test ./object ./controllers -run "Test(WecomProfileConsentIntentIssuerCreatesProfileSyncIntentWithSubject|CreateWecomProfileConsentProfileSyncIntent|HandleWecomProfileConsentCallbackCompletesProfileSyncIntent)" -count=1 -v`（工作目录：`admin`）
  - 结果：通过。
  - 覆盖：`profile_sync` 意图签发、当前登录用户创建主动同步意图、企业微信身份冲突拒绝、回调成功后 `pending -> completed`。
- `go test ./object ./controllers -run "WecomProfileConsent" -count=1 -v`（工作目录：`admin`）
  - 结果：通过。
  - 覆盖：企业微信敏感授权意图对象层和控制器层回归，包括主动同步成功、未绑定用户拒绝、身份来源冲突拒绝、企业微信映射指向其他用户拒绝、授权用户不匹配时标记失败；本地手机号/邮箱不覆盖已有值由既有 `TestApplyUserOAuthProfilePropertiesKeepsExistingPhoneAndEmail` 覆盖。

### 备注

- 测试输出中仍有 `open conf/app.conf` 初始化提示，这是测试环境未加载本地运行配置的既有提示；本轮用例均使用虚构企业微信身份、意图 ID 和 token 占位值，不包含真实企业标识、Secret、授权码、访问 token、手机号或邮箱。

## 2026-06-04 后端授权测试补齐里程碑

### 自动化验证

- `go test ./object ./controllers -run "WecomProfileConsent" -count=1 -v`（工作目录：`admin`）
  - 结果：通过。
  - 覆盖：登录意图创建、OAuth2 敏感授权 URL、状态轮询 header token 契约、complete body token 和 MFA 字段、重复 complete 消费拒绝、公开创建限流与待授权意图替换、过期意图更新、callback 无效 state、callback 过期意图不授权、Provider 企业边界不匹配、授权解析失败标记 failed、无 MFA / NextMfa / RequiredMfa / MFA 完成后的状态推进。

### 备注

- 测试输出仍包含 `open conf/app.conf` 初始化提示，这是测试环境未加载本地运行配置的既有提示。
- 新增测试使用虚构企业微信企业 ID、Agent ID、意图 ID、`pollToken` 和授权码占位，不包含真实 Secret、访问 token、手机号或邮箱。

## 2026-06-04 前端主动同步资料里程碑

### 自动化验证

- `yarn test --runTestsByPath src/auth/AuthBackend.test.js src/account/WeComProfileSyncPanel.test.js --watchAll=false --runInBand`（工作目录：`web-admin`）
  - 结果：通过，6 个用例通过。
  - 覆盖：主动同步创建意图 API 封装、账号页同步面板创建 `profile_sync` 意图、弹窗展示 OAuth2 敏感授权二维码、轮询到 `completed` 后触发资料刷新回调、创建失败时展示脱敏错误。
- `yarn test --runTestsByPath src/auth/AuthBackend.test.js src/auth/WeComLoginPanel.test.js src/account/WeComProfileSyncPanel.test.js --watchAll=false --runInBand`（工作目录：`web-admin`）
  - 结果：通过，12 个用例通过。
  - 覆盖：企业微信登录二维码主链路、兼容网页登录 fallback、主动同步入口和异常提示的组合前端回归。

### 备注

- 测试输出包含 React 18 下旧版 Testing Library 使用 `ReactDOM.render` 的既有警告；本次验证的断言全部通过。
- 前端测试数据使用虚构的应用、Provider、意图 ID、`pollToken` 和授权 URL，不包含真实企业标识、Secret、授权码、token、手机号或邮箱。

## 2026-06-04 文档与脱敏检查里程碑

### 文档更新

- `README.md`
  - 更新企业微信登录说明，明确 OAuth2 `snsapi_privateinfo` 敏感授权二维码是 `WeCom + Internal + Normal` 的主链路。
  - 明确 PC Web 登录组件仅作为兼容 fallback，不承诺返回手机号、邮箱、企业邮箱、`user_ticket` 或头像。
  - 补充 `/account` 主动同步资料入口、只补空联系方式、不覆盖已有本地手机号/邮箱的边界。
  - 补充运行态验证步骤：创建登录意图、扫码授权、PC 完成登录、MFA 兼容、主动同步和资料字段核对。
- `docs/new-developer-quickstart.md`
  - 更新企业微信维护入口，指向 `WeComLoginPanel`、`/api/wecom-profile-consent/*`、`controllers/wecom_profile_consent.go`、`idp/wecom_internal.go` 和 `object/wecom_profile_consent*.go`。

### 脱敏验证

- `rg -n "(Corp ID|Agent ID|Secret|authorization code|access token|phone|email|https?://|ww[0-9A-Za-z_-]{6,}|1[3-9][0-9]{9}|[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,})" README.md docs\\new-developer-quickstart.md openspec\\changes\\add-wecom-sensitive-profile-consent`
  - 结果：通过人工复核。
  - 命中内容仅包含字段名、禁止写入敏感信息的说明、仓库/localhost/官方公开 URL、OAuth2 公开端点和虚构/占位说明；未发现真实企业标识、Secret、授权码、token、手机号、邮箱或私有环境地址。

## 2026-06-04 总体验证里程碑

### 自动化验证

- `go test ./object ./controllers -run "WecomProfileConsent" -count=1 -v`（工作目录：`admin`）
  - 结果：通过。
  - 覆盖：企业微信敏感授权意图对象层、创建限流/替换、状态轮询、callback 校验、profile sync、MFA 状态推进和重复 complete 消费拒绝。
- `yarn test --runTestsByPath src/auth/AuthBackend.test.js src/auth/WeComLoginPanel.test.js src/account/WeComProfileSyncPanel.test.js --watchAll=false --runInBand`（工作目录：`web-admin`）
  - 结果：通过，3 个 test suite、12 个用例通过。
  - 覆盖：企业微信敏感授权登录二维码主链路、兼容 PC Web 登录 fallback、主动同步资料入口、pollToken 不进入 URL 和异常提示。
- `openspec validate "add-wecom-sensitive-profile-consent" --strict`
  - 结果：通过。
- `git diff --check`
  - 结果：通过，无 whitespace 错误输出。

### 备注

- Go 测试输出中仍有 `open conf/app.conf` 初始化提示，这是测试环境未加载本地运行配置的既有提示。

## 2026-06-05 测试环境两种扫码方式手测确认

### 手动验证

- 用户在测试环境分别走了“兼容网页登录”和“主二维码敏感授权登录”两种扫码方式。
- 兼容网页登录链路命中旧 `/callback` 路径，服务端脱敏诊断显示 `has_user_ticket=false`，仅通过通讯录补充得到 `userid,name`，没有返回手机号、邮箱、企业邮箱或头像敏感字段。
- 主二维码敏感授权链路命中 `login-intents -> intents polling -> /api/wecom-profile-consent/callback -> complete`，关键请求均返回 HTTP 200。
- 主二维码敏感授权链路的多次脱敏诊断均显示 `has_user_ticket=true`，授权详情字段包含 `userid,mobile,email,biz_mail,avatar`，随后 PC complete 成功并进入已登录态。

### 结论

- 两种扫码方式行为符合产品边界：兼容网页登录只验证身份，不承诺同步敏感资料；主二维码敏感授权能拿到 `user_ticket` 并返回敏感资料字段。
- 未观察到新的 error、panic 或失败状态；仅保留已知测试环境遗留旧列 `client_i_p_hash` 未映射告警，不影响本轮登录链路判断。

## 2026-06-05 归档前最终复验

### 自动化验证

- `go test -v -count=1 -timeout 180s ./idp -run "TestWeComInternalIdProviderGetUserInfo"`（工作目录：`admin`）：
  - 结果：通过。
  - 覆盖：企业微信敏感资料字段映射、`has_user_ticket` 诊断、通讯录补充和无 `user_ticket` 时的来源标记。
- `go test -v -count=1 -timeout 240s ./object ./controllers -run "(ProviderVisible|WecomProfileConsent)"`（工作目录：`admin`）：
  - 结果：通过。
  - 覆盖：Provider 可见性、意图密钥哈希、授权 URL、创建限流、schema 列名、callback 幂等、profile sync、`user_ticket` 强制校验、token 不落库、MFA 状态推进和重复 complete 拒绝。
- `yarn test --runTestsByPath src/auth/AuthBackend.test.js src/auth/WeComLoginPanel.test.js src/account/WeComProfileSyncPanel.test.js --watchAll=false --runInBand`（工作目录：`web-admin`）：
  - 结果：通过，3 个 test suite、12 个用例通过。
  - 覆盖：企业微信敏感授权登录二维码主链路、`pollToken` 不进入 URL、PC complete、MFA 面板、兼容 PC Web fallback 和主动同步资料入口。
- `openspec validate "add-wecom-sensitive-profile-consent" --strict`
  - 结果：通过。
- `openspec validate --specs --strict`
  - 结果：通过，9 个主 spec 全部通过。
- `git diff --check`
  - 结果：通过，无 whitespace 错误输出。

### 备注

- Go 测试输出中仍有 `open conf/app.conf` 初始化提示，这是测试环境未加载本地运行配置的既有提示。
- 前端测试输出中仍有 React 18 下旧版 Testing Library 使用 `ReactDOM.render` 的既有警告；断言全部通过。

## 2026-06-04 敏感授权 user_ticket 观测与校验补强里程碑

### 线上联调现象

- 删除 API 侧关联用户后，从 API 测试入口再次跳转测试环境管理端，企业微信扫码登录成功，PC 端完成回跳，用户资料已回填。
- 手机端仍直接显示“授权完成”，未再次出现需要点击同意的确认动作。
- 测试环境 admin 日志确认本轮仍走企业微信敏感授权意图链路：`login-intents -> intents polling -> callback -> complete`，关键接口返回 HTTP 200，未观察到旧 PC Web 登录 fallback。

### 根因判断

- 企业微信官方文档说明，自建应用通过 `getuserdetail` 获取敏感字段需要 `user_ticket`，敏感字段仅在成员同意 `snsapi_privateinfo` 授权后返回。
- 同一企业微信用户、企业、应用和 `snsapi_privateinfo` scope 下，企业微信客户端可能记住此前授权状态；是否每次展示确认按钮不作为本 change 的主验收信号。
- 现有运行日志只记录了 callback 链路，未记录 `user_ticket` 是否返回；为避免通讯录补充路径掩盖授权状态，本轮补强了脱敏诊断和 callback 校验。

### 修复项

- 企业微信内部应用 IDP 返回的 `UserInfo.Extra` 新增非敏感诊断标记：
  - `wecom_has_user_ticket`：本次 `auth/getuserinfo` 是否返回 `user_ticket`。
  - `wecom_profile_detail_source`：资料来源枚举，例如 `sensitive_detail`、`sensitive_detail_contact_supplement` 或 `contact_supplement`。
- 企业微信敏感授权登录和主动同步 callback 均要求 `wecom_has_user_ticket=true` 后才继续完成本地用户匹配和资料回填。
- 新增脱敏日志 `wecom internal profile diagnostics`，只记录字段名和布尔状态，不记录授权码、token、`user_ticket` 明文、手机号、邮箱或头像 URL。

### 自动化验证

- `go test -v -count=1 -timeout 180s ./idp -run "TestWeComInternalIdProviderGetUserInfo"`（工作目录：`admin`）
  - 结果：通过。
  - 覆盖：敏感详情路径标记 `has_user_ticket=true`、敏感详情加通讯录补充路径仍保留 `has_user_ticket=true`、无 `user_ticket` 的通讯录补充路径标记为 `contact_supplement` 且不被误认为已完成敏感授权。
- `go test -v -count=1 -timeout 180s ./controllers -run "TestRequireWecomProfileConsentUserTicketRejectsContactOnlyProfile|TestSaveWecomProfileConsentOAuthProfileDoesNotPersistToken|Test.*WecomProfileConsent"`（工作目录：`admin`）
  - 结果：通过。
  - 覆盖：敏感授权 callback 必须有 `user_ticket`、token 不落库、登录意图、主动同步意图、callback、状态轮询、complete 和 MFA 状态推进。
- `openspec validate "add-wecom-sensitive-profile-consent" --strict`
  - 结果：通过。
- `openspec validate --specs --strict`
  - 结果：通过，9 个主 spec 全部通过。
- `git diff --check`
  - 结果：通过，无 whitespace 错误输出。

### 备注

- Go 测试输出中仍有 `open conf/app.conf` 初始化提示，这是测试环境未加载本地运行配置的既有提示。
- 本轮记录不包含真实授权码、`state`、`pollToken`、`user_ticket`、手机号、邮箱、企业标识或完整登录 URL。
- 前端测试输出中仍有 React 18 下旧版 Testing Library 使用 `ReactDOM.render` 的既有警告；断言全部通过。

## 2026-06-04 预归档 review 修复里程碑

### 修复项

- 修复 `openspec/changes/add-wecom-sensitive-profile-consent/design.md` 中最小契约表的回调路径，将 stale `GET /callback` 改为实际 `GET /api/wecom-profile-consent/callback`。
- 补齐 `openspec/specs/wecom-login-profile-fields/spec.md` 的 Purpose，避免归档后主能力说明继续保留 `TBD`。
- 修复 `Application.GetProviderItem()` 只接受裸 Provider name 的问题，兼容前端企业微信登录页和资料同步面板传递的 `owner/name` Provider ID。
- 补充对象层和控制器层测试，覆盖 `owner/name` Provider ID 在登录意图创建和主动同步意图创建中的匹配行为。

### 自动化验证

- `go test ./object ./controllers -run "(ProviderVisible|WecomProfileConsent)" -count=1 -v`（工作目录：`admin`）
  - 结果：通过。
  - 覆盖：Provider 可见性 `owner/name` 兼容、企业微信敏感授权登录/同步意图创建、callback、状态轮询和 complete 回归。
- `openspec validate "add-wecom-sensitive-profile-consent" --strict`
  - 结果：通过。
- `openspec validate --specs --strict`
  - 结果：通过，9 个主 spec 全部通过。
- `git diff --check`
  - 结果：通过，无 whitespace 错误输出。

## 2026-06-04 测试环境联调补列与列名修复里程碑

### 线上联调现象

- 从 API 测试入口跳转到已获准的测试环境管理端后，`/api/get-app-login` 已返回 200，授权页进入企业微信敏感授权登录入口。
- 创建登录意图时，`POST /api/wecom-profile-consent/login-intents` 返回业务错误：`pq: 字段 "client_ip_hash" 不存在`。
- 只读检查确认当前表中已有 Xorm 自动映射出的 `client_i_p_hash`，但代码中防滥用查询使用稳定列名 `client_ip_hash`。

### 测试环境临时兼容修复

- 已在测试环境 admin PostgreSQL 上执行非破坏性兼容补列：
  - `ALTER TABLE wecom_profile_consent_intent ADD COLUMN IF NOT EXISTS client_ip_hash varchar(100);`
  - 将已有 `client_i_p_hash` 值按空值条件同步到 `client_ip_hash`；本次同步影响 0 行。
  - `CREATE INDEX IF NOT EXISTS idx_wecom_profile_consent_intent_client_ip_hash ON wecom_profile_consent_intent (client_ip_hash);`
- 补列后复测 `POST /api/wecom-profile-consent/login-intents`：
  - 结果：返回 `status=ok`。
  - 验证：返回了意图 ID，企业微信授权 URL 包含 `snsapi_privateinfo`，回调路径包含 `/api/wecom-profile-consent/callback`。

### 代码根因修复

- 为 `WecomProfileConsentIntent.ClientIPHash` 增加显式 Xorm 列名 tag：`client_ip_hash`。
- 新增 schema 回归测试，确保未来 Xorm 建表不会再次生成 `client_i_p_hash`。

### 自动化验证

- `go test -v -count=1 -timeout 120s ./object -run "TestWecomProfileConsent"`（工作目录：`admin`）
  - 结果：通过。
  - 覆盖：意图密钥哈希、创建限流、资料同步意图、schema 列名回归和状态读取。
- `go test -v -count=1 -timeout 180s ./controllers -run "Test.*WecomProfileConsent"`（工作目录：`admin`）
  - 结果：通过。
  - 覆盖：登录意图创建、主动同步意图、callback、状态轮询、complete 和 MFA 状态推进。
- `openspec validate "add-wecom-sensitive-profile-consent" --strict`
  - 结果：通过。
- `git diff --check`
  - 结果：通过，无 whitespace 错误输出。

## 2026-06-04 测试环境端到端扫码登录手测里程碑

### 手动验证

- 从 API 测试入口发起 OIDC 跳转至已获准的测试环境管理端登录页。
- 登录页创建企业微信敏感授权登录意图；冒烟确认授权 URL 使用 `snsapi_privateinfo`，回调路径为 `/api/wecom-profile-consent/callback`。
- 企业微信扫码后，服务端日志出现 `login-intents -> intents polling -> callback -> complete` 链路，关键接口均返回 HTTP 200。
- PC 端完成登录并返回目标流程；未观察到普通企业微信 PC Web 登录 fallback。

### 备注

- 手机端本轮显示“授权完成”且未出现需要再次点击授权的确认动作。对于同一企业微信用户、企业、应用和 `snsapi_privateinfo` scope，企业微信可能记住此前授权状态；是否再次展示确认按钮不作为主验收信号。
- 本轮验证不记录真实授权码、`state`、`pollToken`、手机号、邮箱、企业标识或完整登录 URL。主验收信号以敏感授权 scope、敏感授权 callback、PC complete 和最终登录成功为准。

## 2026-06-04 预归档 review 敏感 token 落库修复里程碑

### 修复项

- 预归档 review 发现企业微信敏感授权 callback 复用通用 `SetUserOAuthProperties()` 时会把 OAuth access token 写入用户属性和 legacy token 字段，和本 change “授权码、token、user_ticket 不落库”的安全边界不一致。
- 新增 `saveWecomProfileConsentOAuthProfile()`，登录授权和主动同步 callback 均通过该 helper 保存用户资料属性和账号关联，并强制以 `nil` token 调用 `SetUserOAuthProperties()`。
- 新增控制器层回归测试，断言企业微信敏感授权资料保存时不会向通用 OAuth 属性保存逻辑传入 token，同时保留 Provider mapping 和 `LinkUserAccount()` 调用。

### 自动化验证

- `go test -v -count=1 -timeout 180s ./controllers -run "TestSaveWecomProfileConsentOAuthProfileDoesNotPersistToken|Test.*WecomProfileConsent"`（工作目录：`admin`）
  - 结果：通过。
  - 覆盖：敏感授权 token 不落库边界、登录意图、主动同步意图、callback、状态轮询、complete 和 MFA 状态推进。
- `go test -v -count=1 -timeout 180s ./object ./controllers -run "Test(SaveWecomProfileConsentOAuthProfileDoesNotPersistToken|.*WecomProfileConsent.*)"`（工作目录：`admin`）
  - 结果：通过。
  - 覆盖：对象层意图、schema 列名、创建限流、callback、profile sync、complete 和 MFA 组合回归。
- `openspec validate "add-wecom-sensitive-profile-consent" --strict`
  - 结果：通过。
- `openspec validate --specs --strict`
  - 结果：通过，9 个主 spec 全部通过。
- `git diff --check`
  - 结果：通过，无 whitespace 错误输出。

### 备注

- Go 测试输出中仍有 `open conf/app.conf` 初始化提示，这是测试环境未加载本地运行配置的既有提示。

## 2026-06-04 测试环境删除本地用户后重复扫码手测里程碑

### 手动验证

- 用户在测试环境管理端删除本地用户、清理 API 侧关联用户、关闭企业微信客户端里的部分个人敏感信息授权后，重新同步用户并再次从 API 测试入口发起扫码登录。
- 手机端仍直接显示“授权完成”，没有再次出现“是否同意授权”的确认动作。
- 测试环境 admin 日志确认本轮仍走企业微信敏感授权意图链路：`login-intents -> callback -> complete`，关键接口均返回 HTTP 200。
- 脱敏诊断日志显示 `has_user_ticket=true`，说明企业微信仍判定本次 `snsapi_privateinfo` 敏感授权有效。
- 关闭部分个人敏感信息授权后，敏感详情字段不再包含 `mobile` 和普通 `email`；本轮详情字段仅包含 `userid`、`biz_mail`、`avatar`，通讯录补充仅返回 `userid`、`name`。

### 结论

- 删除本系统和 API 侧本地用户、重新同步用户，不会清除企业微信客户端/平台侧对同一成员、企业、应用和 `snsapi_privateinfo` scope 的授权状态。
- 服务端验收应以企业微信是否返回 `user_ticket`、字段集合是否符合用户侧敏感信息设置、callback 是否完成敏感授权意图为准；手机端是否再次展示确认按钮只能作为辅助现象。
- 若仍需肉眼验证首次授权弹窗，需要使用从未对该企业微信应用授权过的成员，或使用临时新建的企业微信 Agent/应用进行一次性验证。

## 2026-06-04 最终归档前 review 文档修正与验证

### 修复项

- 修正 `README.md` 手动验证清单，不再假设企业微信每次都会展示同意授权按钮；文档改为要求“如出现则同意”，若直接授权完成则以服务端 `user_ticket` 和字段集合诊断作为验收信号。

### 自动化验证

- `openspec validate "add-wecom-sensitive-profile-consent" --strict`
  - 结果：通过。
- `openspec validate --specs --strict`
  - 结果：通过，9 个主 spec 全部通过。
- `git diff --check`
  - 结果：通过，无 whitespace 错误输出。
- `go test -v -count=1 -timeout 180s ./idp -run "TestWeComInternalIdProviderGetUserInfo"`（工作目录：`admin`）
  - 结果：通过。
  - 覆盖：企业微信敏感详情字段映射、`has_user_ticket=true`、通讯录兜底、无 `user_ticket` 时不误判敏感授权成功。
- `go test -v -count=1 -timeout 180s ./object ./controllers -run "(ProviderVisible|WecomProfileConsent)"`（工作目录：`admin`）
  - 结果：通过。
  - 覆盖：Provider 可见性、意图密钥哈希、授权 URL、创建限流、schema 列名、callback、主动同步、`user_ticket` 强制校验、token 不落库、MFA 状态推进和重复 complete 消费拒绝。
- `yarn test --runTestsByPath src/auth/AuthBackend.test.js src/auth/WeComLoginPanel.test.js src/account/WeComProfileSyncPanel.test.js --watchAll=false --runInBand`（工作目录：`web-admin`）
  - 结果：通过，3 个 test suite、12 个用例通过。
  - 覆盖：企业微信敏感授权登录二维码主链路、`pollToken` 不进入 URL、PC complete、MFA 面板、兼容 PC Web fallback 和主动同步资料入口。

### 备注

- Go 测试输出中仍有 `open conf/app.conf` 初始化提示，这是测试环境未加载本地运行配置的既有提示。
- 前端测试输出中仍有 React 18 下旧版 Testing Library 使用 `ReactDOM.render` 的既有警告；断言全部通过。

## 2026-06-04 `biz_mail`、手机和头像字段来源确认

### 现象

- 用户在企业微信客户端关闭部分个人敏感信息授权后，重新扫码登录仍直接显示“授权完成”。
- 测试环境 admin 脱敏诊断日志显示本轮企业微信敏感详情包含 `userid`、`biz_mail`、`avatar`，但不包含 `mobile` 和普通 `email`。
- 管理端用户资料页中，本地 `Email` 有值，`Phone` 为空，头像仍显示默认占位。

### 论证过程

- 企业微信官方“获取访问用户敏感信息”文档把 `biz_mail` 定义为“企业邮箱”，并将 `mobile`、`email`、`biz_mail`、`avatar` 等字段都列为需要 `snsapi_privateinfo` 和成员授权后才返回的敏感字段。
- 代码映射规则为 `Email = email 优先，否则 biz_mail`，即当企业微信未返回普通 `email` 但返回企业邮箱 `biz_mail` 时，本地 `Email` 会使用 `biz_mail` 兜底。
- 代码映射规则为 `Phone = mobile`，因此企业微信未返回 `mobile` 时，本地 `Phone` 保持为空，不做推断或伪造。
- 代码映射规则为 `AvatarUrl = avatar`，并会保存到 Provider 侧 `oauth_WeCom_avatarUrl` 属性；本地 `Avatar` 是否展示该头像还受既有头像更新策略约束，通常只在本地头像为空、组织默认头像或旧 Provider 头像时替换，避免覆盖用户已有头像。

### 结论

- `biz_mail` 也是企业微信敏感字段，但它和普通 `email` 是两个不同字段；用户侧“邮箱不允许”在本轮现象中阻止了普通 `email` 返回，但企业微信仍返回了企业邮箱 `biz_mail`。
- 当前产品策略确认允许使用 `biz_mail` 作为本地 `Email` 兜底回填；这不是绕过普通邮箱授权，而是使用企业微信实际返回的企业邮箱字段。
- 手机未回填是预期结果，因为企业微信未返回 `mobile`。
- 头像未展示不代表企业微信未返回头像；本轮日志已确认返回 `avatar`，后续如需追查应继续检查本地 `Avatar` 字段、组织默认头像配置和 `oauth_WeCom_avatarUrl` 属性状态。

## 2026-06-05 企业微信登录面板兼容二维码切换修复

### 问题

- 应用的登录方式由 `application.signinMethods` 配置控制，企业微信、密码、验证码等 tab 的显示名、顺序和规则都不能在登录页写死。
- 当前企业微信 tab 默认展示 OAuth2 `snsapi_privateinfo` 敏感授权二维码；点击“使用兼容网页登录”后，旧 `WwLogin` 兼容二维码被追加到主二维码下方，导致同一页面同时出现两个企业微信二维码，用户难以判断应扫描哪个。
- 底部 OAuth provider 小图标属于另一套快捷入口配置，点击后继续弹出兼容网页登录弹窗；本次不改变该入口。

### 修复项

- 保持 `LoginPage` 依据应用配置生成登录方式 tab 的逻辑不变。
- 将 `WeComLoginPanel` 的兼容网页登录改为面板内部模式切换：默认显示敏感授权二维码；点击“使用兼容网页登录”后，在同一个扫码区域替换为旧 `WwLogin` 兼容二维码。
- 进入兼容模式时停止敏感授权意图轮询，避免主授权二维码继续后台推进。
- 兼容模式下显示“兼容网页登录仅用于身份登录，不保证同步手机号、邮箱或头像”的提示，并将按钮切换为“刷新”和“返回授权登录”。
- 点击“返回授权登录”时清空旧 `WwLogin` 容器并重新创建敏感授权登录意图。

### 自动化验证

- 先新增前端测试断言：点击“使用兼容网页登录”后，主 OAuth2 二维码不再存在，页面出现“返回授权登录”按钮，旧 `WwLogin` 使用同一面板区域加载。
- 首次运行 `yarn test --runTestsByPath src/auth/WeComLoginPanel.test.js --watchAll=false --runInBand`：
  - 结果：按预期失败。
  - 失败原因：现有实现仍保留 `wecom-oauth-qrcode`，说明测试覆盖了本次 UI 问题。
- 修复后再次运行 `yarn test --runTestsByPath src/auth/WeComLoginPanel.test.js --watchAll=false --runInBand`：
  - 结果：通过，6 个用例通过。
- `yarn test --runTestsByPath src/auth/AuthBackend.test.js src/auth/WeComLoginPanel.test.js src/account/WeComProfileSyncPanel.test.js --watchAll=false --runInBand`（工作目录：`web-admin`）
  - 结果：通过，3 个 test suite、12 个用例通过。
- `openspec validate "add-wecom-sensitive-profile-consent" --strict`
  - 结果：通过。
- `openspec validate --specs --strict`
  - 结果：通过，9 个主 spec 全部通过。
- `git diff --check`
  - 结果：通过，无 whitespace 错误输出。

### 备注

- 前端测试输出中仍有 React 18 下旧版 Testing Library 使用 `ReactDOM.render` 的既有警告；断言全部通过。

## 2026-06-05 测试环境兼容二维码切换部署验证

### 部署验证

- 已将 `hfl-test/add-wecom-sensitive-profile-consent` 推送到远端，并在已获准的测试环境管理端执行部署脚本。
- 远端源码目录确认当前分支为 `hfl-test/add-wecom-sensitive-profile-consent`，运行时代码提交已更新到 `3fbceff4 fix: 保持企业微信授权回调幂等`。
- 部署脚本完成前后端生产构建、镜像生成和 Compose 服务重建，服务启动后健康检查通过。
- 容器状态确认 `admin-aicodex-admin-1` 使用 `aicodex-admin:latest` 镜像并处于 `running` 状态。

### 备注

- 前端生产构建输出仍包含 Browserslist 版本提示和包体积提示，这是既有构建提示，本次部署未因其失败。
- 启动日志仍出现 `client_i_p_hash` 旧列未映射告警；当前代码已显式使用稳定列 `client_ip_hash` 并有 schema 回归测试，表内旧列来自早期联调阶段的 Xorm 自动列名，属于测试环境遗留 schema 噪声，不影响本轮容器启动和健康检查。

## 2026-06-05 归档前 callback 幂等性修复

### 问题

- 归档前 review 发现企业微信 OAuth2 callback 若因手机页面刷新或平台重试重复到达，在登录意图已 `authorized` 但 PC 端尚未 complete 时，旧逻辑会把意图标记为 `failed`。
- 该问题会让已经成功扫码授权的 PC 登录流程被重复 callback 打断，属于登录状态机阻断风险。

### 修复项

- `HandleWecomProfileConsentCallback()` 对已 `authorized`、`mfa_pending` 或 `completed` 的意图改为幂等返回“授权完成”，不再重新授权或改写状态。
- `markWecomProfileConsentIntentFailed()` 收窄为只允许把 `pending` 意图标记失败，避免后续异常 callback 覆盖已经推进成功的登录状态。
- 已将修复后的运行时代码部署到已获准的测试环境，远端源码目录和容器状态均确认完成更新。

### 自动化验证

- 先新增 `TestHandleWecomProfileConsentCallbackKeepsAuthorizedIntentIdempotent`，首次运行：
  - 结果：按预期失败。
  - 失败原因：重复 callback 将 `authorized` 意图改成了 `failed`。
- 修复后再次运行 `go test -v -count=1 -timeout 120s ./controllers -run "TestHandleWecomProfileConsentCallbackKeepsAuthorizedIntentIdempotent"`（工作目录：`admin`）：
  - 结果：通过。
- `go test -v -count=1 -timeout 180s ./controllers -run "Test(HandleWecomProfileConsentCallback|CompleteWecomProfileConsent)"`（工作目录：`admin`）：
  - 结果：通过。
  - 覆盖：无效 state、pending 授权、重复 callback 幂等、授权失败、过期意图、profile sync 成功/身份不匹配、complete pollToken/MFA 字段、MFA 状态推进和重复 complete 拒绝。

### 备注

- Go 测试输出中仍有 `open conf/app.conf` 初始化提示，这是测试环境未加载本地运行配置的既有提示。

## 2026-06-05 归档前兼容模式飞行请求修复

### 问题

- 归档前 review 发现企业微信主授权二维码创建请求仍在飞行中时，用户如果立即点击“使用兼容网页登录”，旧请求返回后仍会启动主授权意图轮询。
- 该 race 会让兼容模式后台继续推进已经隐藏的敏感授权二维码，违背“进入兼容模式时停止主授权轮询”的交互契约。

### 修复项

- `WeComLoginPanel` 为主授权意图创建请求增加本地 sequence。
- 进入兼容网页登录模式时递增 sequence、清空当前主授权意图 ID 和 `pollToken`，使飞行中的旧请求结果失效。
- delta spec 补充“进入兼容 fallback 后停止当前 OAuth2 登录意图轮询，并忽略仍在飞行中的意图创建结果”的可测试契约。

### 自动化验证

- 先新增 `does not restart consent polling when switching to fallback before intent creation returns` 前端回归测试，首次运行 `yarn test --runTestsByPath src/auth/WeComLoginPanel.test.js --watchAll=false --runInBand`：
  - 结果：按预期失败。
  - 失败原因：旧请求返回后仍调用 `getWecomProfileConsentIntentStatus(intent-1, poll-token-1)`。
- 修复后再次运行 `yarn test --runTestsByPath src/auth/WeComLoginPanel.test.js --watchAll=false --runInBand`：
  - 结果：通过，7 个用例通过。

### 备注

- 前端测试输出中仍有 React 18 下旧版 Testing Library 使用 `ReactDOM.render` 的既有警告；断言全部通过。

## 2026-06-05 本轮归档前 review 最终复验

### 自动化验证

- `git diff --check`
  - 结果：通过，无 whitespace 错误输出。
- `openspec validate "add-wecom-sensitive-profile-consent" --strict`
  - 结果：通过。
- `openspec validate --specs --strict`
  - 结果：通过，9 个主 spec 全部通过。
- `go test -v -count=1 -timeout 180s ./idp -run "TestWeComInternalIdProviderGetUserInfo"`（工作目录：`admin`）
  - 结果：通过。
  - 覆盖：企业微信敏感资料字段映射、`has_user_ticket` 诊断、通讯录补充和无 `user_ticket` 时的来源标记。
- `go test -v -count=1 -timeout 240s ./object ./controllers -run "(ProviderVisible|WecomProfileConsent)"`（工作目录：`admin`）
  - 结果：通过。
  - 覆盖：Provider 可见性、意图密钥哈希、授权 URL、创建限流、schema 列名、callback 幂等、profile sync、`user_ticket` 强制校验、token 不落库、MFA 状态推进和重复 complete 拒绝。
- `yarn test --runTestsByPath src/auth/AuthBackend.test.js src/auth/WeComLoginPanel.test.js src/account/WeComProfileSyncPanel.test.js --watchAll=false --runInBand`（工作目录：`web-admin`）
  - 结果：通过，3 个 test suite、13 个用例通过。
  - 覆盖：企业微信敏感授权登录二维码主链路、`pollToken` 不进入 URL、PC complete、MFA 面板、兼容 PC Web fallback、兼容模式飞行请求 race 和主动同步资料入口。

### 备注

- 前端三文件组合首次与 Go 定向回归并行执行时，`WeComProfileSyncPanel` 单条用例出现 5 秒超时；随后单独运行该测试文件通过，再单独重跑三文件组合通过，未发现稳定断言失败。
- Go 测试输出中仍有 `open conf/app.conf` 初始化提示，这是测试环境未加载本地运行配置的既有提示。
- 前端测试输出中仍有 React 18 下旧版 Testing Library 使用 `ReactDOM.render` 的既有警告；断言全部通过。
