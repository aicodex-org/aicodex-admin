## 1. 后端授权意图模型

- [x] 1.1 新增 `WecomProfileConsentIntent` 对象、状态常量、登录上下文字段和基础存储方法
- [x] 1.2 在 Xorm 启动建表流程中注册意图表，时间字段使用 `time.Time`
- [x] 1.3 实现意图创建、状态查询、过期判断、一次性消费和过期清理
- [x] 1.4 `state` 和 `pollToken` 只保存哈希值，不保存明文授权码、token、Secret、手机号或邮箱
- [x] 1.5 增加 `client_key_hash`、`client_ip_hash` 和 `failed_attempt_count`，支撑限流、复用和失败锁定
- [x] 1.6 complete 使用数据库事务或 compare-and-set 原子推进意图状态，防止重复建立 session

## 2. 后端企业微信敏感授权服务

- [x] 2.1 新增 OAuth2 `snsapi_privateinfo` 授权 URL 构造逻辑，回调地址使用 `/api/wecom-profile-consent/callback`
- [x] 2.2 登录意图创建时校验应用、Provider、组织和 `Internal + Normal` 配置完整性
- [x] 2.3 登录意图创建接口增加 IP、应用、Provider 维度限流和未过期意图复用/替换策略
- [x] 2.4 回调接口校验 `state`、过期时间、意图状态、Provider 和企业微信用户身份
- [x] 2.5 回调成功后复用现有企业微信 IdP 获取 `user_ticket`、敏感资料和通讯录兜底资料
- [x] 2.6 回调阶段完成用户匹配、注册/绑定限制判断、必要的新用户创建和 OAuth 资料回填，但不直接建立 PC session
- [x] 2.7 PC complete 阶段处理保留的登录上下文、`HandleLoggedIn()`、`NextMfa` / `RequiredMfa` 兼容行为和安全跳转
- [x] 2.8 主动同步意图必须要求当前登录态，并校验授权返回的 `corp_id + userid` 与当前用户匹配
- [x] 2.9 主动同步创建前校验当前用户企业微信身份唯一；多个来源冲突时拒绝同步
- [x] 2.10 所有日志和错误响应脱敏，不输出 Secret、code、token、user_ticket、手机号或邮箱

## 3. 后端路由、权限和测试

- [x] 3.1 新增 `/api/wecom-profile-consent/*` 路由和公开接口放行规则
- [x] 3.2 增加登录意图创建、授权 URL、状态轮询、complete 一次性消费和重复 complete 测试
- [x] 3.3 增加回调 state 错误、意图过期、Provider 不匹配、用户解析失败测试
- [x] 3.4 增加公开创建意图限流、未过期意图复用/替换、过期清理测试
- [x] 3.5 增加主动同步成功、未绑定用户、身份来源冲突、授权用户不匹配、不覆盖已有资料测试
- [x] 3.6 覆盖无需 MFA 时 `authorized -> completed`、需要 MFA 时 `authorized -> mfa_pending -> completed`、`RequiredMfa` 兼容路径的状态推进
- [x] 3.7 固化 API 请求/响应字段契约，确保 `pollToken` 不进入 URL、现有登录上下文不丢失

## 4. 前端登录页

- [x] 4.1 将企业微信登录页主面板改为创建登录意图并展示 OAuth2 敏感授权二维码
- [x] 4.2 实现二维码等待、授权成功、过期、失败、刷新和重试状态
- [x] 4.3 PC 轮询到授权成功后调用 complete，成功后进入原目标页面
- [x] 4.4 保留现有 PC Web 登录组件作为次要 fallback 入口
- [x] 4.5 增加 `mfa_pending` 状态处理，复用现有 MFA 表单并改为继续调用意图 complete；`RequiredMfa` 继续走现有强制启用 MFA 流程
- [x] 4.6 更新中文文案，强调“使用企业微信扫码并同意授权”，避免展示敏感实现细节

## 5. 前端主动同步资料

- [x] 5.1 在用户账号资料页或个人设置页新增“同步企业微信资料”入口
- [x] 5.2 同步弹窗展示 OAuth2 敏感授权二维码、等待状态、成功状态和失败重试
- [x] 5.3 同步完成后刷新当前用户资料，展示邮箱、手机号和头像的最新状态
- [x] 5.4 增加前端回归测试，覆盖登录二维码主链路、fallback、主动同步入口和异常提示

## 6. 文档与验证

- [x] 6.1 更新企业微信登录/资料同步说明，明确 PC Web 登录组件与 OAuth2 敏感授权的边界
- [x] 6.2 补充运行态验证步骤：创建意图、扫码授权、登录完成、主动同步、资料字段核对
- [x] 6.3 运行后端定向测试、前端定向测试、`openspec validate add-wecom-sensitive-profile-consent --strict` 和 `git diff --check`
- [x] 6.4 验证文档不包含真实环境地址、企业标识、Secret、授权码、token、手机号或邮箱
