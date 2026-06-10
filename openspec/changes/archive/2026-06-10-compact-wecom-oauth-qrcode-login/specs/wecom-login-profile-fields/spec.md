## MODIFIED Requirements

### Requirement: 企业微信主登录必须支持 OAuth2 敏感授权二维码

系统 SHALL 为企业微信内部应用登录提供 OAuth2 `snsapi_privateinfo` 敏感授权二维码主链路。

#### Scenario: 登录页创建敏感授权登录意图

- **WHEN** 登录页当前应用配置了可用的企业微信 `Internal + Normal` Provider
- **AND** 该 Provider 具备 Corp ID、自建应用 Secret 和 Agent ID
- **THEN** 系统 MUST 创建一次性登录意图
- **AND** 系统 MUST 返回企业微信 OAuth2 授权 URL
- **AND** 系统 MUST 返回可用于二维码展示的短授权 URL
- **AND** 授权 URL MUST 使用 `scope=snsapi_privateinfo`
- **AND** 授权 URL MUST 使用 `/api/wecom-profile-consent/callback` 作为回调地址

#### Scenario: 登录意图必须保留既有登录上下文

- **WHEN** 当前登录页承载的是普通登录、OAuth / OIDC 授权或 CAS 等既有入口
- **THEN** 系统 MUST 在登录意图中保存完成现有登录语义所需的非敏感上下文
- **AND** 系统 MUST NOT 因切换企业微信主入口而丢失既有 `responseType`、`redirectUri`、`state`、`nonce`、PKCE 或 CAS 服务参数语义

#### Scenario: 公开创建登录意图必须防止滥用

- **WHEN** 匿名客户端频繁创建企业微信登录意图
- **THEN** 系统 MUST 按客户端、应用和 Provider 维度执行短窗口限制
- **AND** 系统 SHOULD 复用或替换同一客户端仍未过期的待授权意图
- **AND** 系统 MUST NOT 无限制创建新的待授权意图

#### Scenario: 短授权入口必须安全跳转到企业微信 OAuth2

- **WHEN** 用户扫码访问短授权 URL
- **AND** 短授权 URL 中的 `intentId` 和 `state` 匹配一个未过期的 pending 登录意图
- **THEN** 系统 MUST 重建企业微信 OAuth2 授权 URL 并返回跳转
- **AND** 重建的授权 URL MUST 使用 `scope=snsapi_privateinfo`
- **AND** 重建的授权 URL MUST 使用 `/api/wecom-profile-consent/callback` 作为回调地址
- **AND** 系统 MUST NOT 在短授权入口创建新意图、暴露 `pollToken` 或完成本地登录

#### Scenario: 短授权入口必须拒绝无效或过期意图

- **WHEN** 短授权 URL 的 `state` 无效、意图不存在、意图已过期或意图不处于 pending 状态
- **THEN** 系统 MUST 拒绝跳转到企业微信 OAuth2
- **AND** 系统 MUST NOT 暴露 Secret、授权码、token、`pollToken` 或敏感字段

#### Scenario: 登录页展示二维码而不是 PC Web 组件作为主路径

- **WHEN** 登录意图创建成功
- **THEN** 前端 MUST 优先将短授权 URL 渲染为二维码
- **AND** 前端 MUST 在短授权 URL 缺失时回退渲染完整 OAuth2 授权 URL
- **AND** 前端 MUST 提示用户使用企业微信客户端扫码并同意授权
- **AND** 二维码 MUST 保留可识别的白色静区，避免二维码模块贴到容器边缘
- **AND** 扫码面板 MUST 提供足够高度展示二维码、静区和状态遮罩
- **AND** 企业微信扫码主路径 MUST NOT 展示密码登录专属的找回密码入口
- **AND** 企业微信扫码主路径 SHOULD 压缩顶部品牌图和间距，减少桌面视口垂直滚动
- **AND** 现有 PC Web 企业微信登录组件 MUST 只作为兼容 fallback
- **AND** 前端进入兼容 fallback 后 MUST 停止当前 OAuth2 登录意图轮询，并忽略仍在飞行中的意图创建结果
