# admin-web3-wallet-auth Specification

## Purpose
定义 Admin Web3 钱包认证退役后的 UI 入口、服务端 fail-closed、历史数据只读清理兼容、专属依赖清退和脱敏验收边界。
## Requirements
### Requirement: Admin Web3 钱包认证入口退役
Admin UI SHALL 不再提供 Web3、MetaMask 或 Web3Onboard 钱包认证的创建、配置、登录、注册或新绑定入口，同时 SHALL 对历史记录和旧直达路由提供可恢复的安全降级。

#### Scenario: 登录和注册页面接收退役 Provider
- **WHEN** Application 或 Provider API 返回 category 为 `Web3`，或 type 为 `MetaMask`/`Web3Onboard` 的 Provider
- **THEN** 登录页、注册页和 Provider button SHALL NOT 渲染钱包认证动作
- **AND** 前端 SHALL NOT 把退役 Provider 落入通用 OAuth URL 或 callback fallback

#### Scenario: 管理员创建或配置 Provider
- **WHEN** 管理员打开 Provider 新增页或选择 Provider category/type
- **THEN** Web3、MetaMask 和 Web3Onboard SHALL NOT 作为可创建或可切换选项出现
- **AND** 页面 SHALL NOT 加载钱包 SDK、连接钱包或生成钱包认证配置

#### Scenario: 管理员访问历史 Web3 Provider 直链
- **WHEN** 管理员通过历史链接打开退役 Web3 Provider
- **THEN** 页面 SHALL 展示不可配置的退役状态，并在既有删除权限允许时提供返回或删除历史记录的动作
- **AND** 页面 SHALL NOT 呈现可保存的 Web3 配置表单、白屏或死链接

#### Scenario: 用户存在历史钱包绑定
- **WHEN** 历史 User DTO 返回非空 `metamask` 或 `web3onboard` 字段
- **THEN** Admin SHALL 在既有本人/管理员与 `canUnlink` 权限规则下提供不依赖钱包 SDK 的通用 unlink 动作
- **AND** Admin SHALL NOT 提供 Link、Connect 或重新认证动作

#### Scenario: 浏览器存在历史 Web3 token
- **WHEN** 管理员退出且 localStorage 中存在固定 `Web3AuthToken_` 前缀的历史条目
- **THEN** Admin SHALL 删除这些条目而不加载钱包 SDK
- **AND** cleanup SHALL NOT 反序列化、回显、记录或提交 token value

### Requirement: 服务端统一识别退役 Web3 Provider
Admin 后端 SHALL 使用单一 classifier 对 Provider category/type 执行裁剪空白且不区分大小写的退役判断；`category=Web3`、`type=MetaMask` 或 `type=Web3Onboard` 任一命中均 SHALL 视为退役 Web3 钱包认证 Provider。

#### Scenario: category 命中退役类型
- **WHEN** Provider category 在裁剪空白后不区分大小写等于 `Web3`
- **THEN** classifier SHALL 返回退役
- **AND** 任意其它 type SHALL NOT 使该结果恢复为可用

#### Scenario: type 命中退役类型
- **WHEN** Provider type 在裁剪空白后不区分大小写等于 `MetaMask` 或 `Web3Onboard`
- **THEN** classifier SHALL 返回退役
- **AND** `OAuth` 等非 Web3 category SHALL NOT 绕过该结果

#### Scenario: 普通 Provider 不被误伤
- **WHEN** Provider category/type 均不匹配退役条件
- **THEN** classifier SHALL 返回未退役
- **AND** 既有 OAuth、OIDC、SAML、CAS、LDAP、WeCom、Lark Provider 行为 SHALL 保持不变

### Requirement: Web3 Provider 创建、转换和登录 fail-closed
Admin SHALL 对退役 Web3 Provider 的新建、普通 Provider 转换、Application 新绑定/重新激活和登录统一 fail-closed，并 SHALL 使用稳定 alias `PROVIDER_WEB3_WALLET_AUTH_RETIRED`，不改变现有错误 DTO shape。

#### Scenario: 创建或转换退役 Provider
- **WHEN** 调用方新增退役 Web3 Provider，或把普通 Provider 更新为退役 category/type
- **THEN** Admin SHALL 拒绝写入并返回 `PROVIDER_WEB3_WALLET_AUTH_RETIRED`
- **AND** 数据库原对象 SHALL 保持不变

#### Scenario: 改写历史退役 Provider
- **WHEN** 调用方尝试通过通用 Update API 改写已有退役 Web3 Provider
- **THEN** Admin SHALL 返回 `PROVIDER_WEB3_WALLET_AUTH_RETIRED`
- **AND** 调用方仍 SHALL 能读取或删除该历史 Provider

#### Scenario: 新增或重新激活 Application binding
- **WHEN** Application Add/Update 请求新增退役 Web3 Provider binding，或使历史 binding 的 `canSignIn`、`canSignUp`、`prompted` 任一保持/变为 true
- **THEN** Admin SHALL 根据服务端加载的真实 Provider 拒绝保存并返回稳定退役 alias
- **AND** 请求 DTO 内嵌的伪造 category/type SHALL NOT 绕过检查

#### Scenario: 登录退役 Provider
- **WHEN** 登录请求解析到数据库中的退役 Web3 Provider
- **THEN** Admin SHALL 在 Application Provider 可见性/目标组织解析、构造 idp、解析钱包 payload 或查找用户之前返回稳定退役 alias
- **AND** binding 缺失、Application 可见性或 `canSignIn=false` SHALL NOT 改变该退役错误

### Requirement: 历史 Web3 数据保持只读清理兼容
Admin SHALL 保留历史 Provider/Application/User 的 schema 与 DTO 兼容，并 SHALL 允许历史数据朝禁用或删除方向收敛；本 change MUST NOT 批量修改或迁移历史数据。

#### Scenario: 读取和删除历史 Provider
- **WHEN** 数据库存在历史退役 Web3 Provider
- **THEN** Provider Get/List SHALL 继续返回现有 copy-safe DTO，Delete SHALL 继续可用
- **AND** 响应 SHALL NOT 因退役诊断新增 token、secret、钱包地址、raw payload 或完整私有 URL

#### Scenario: 禁用或移除历史 Application binding
- **WHEN** Application Update 移除历史 Web3 binding，或把 `canSignIn`、`canSignUp`、`prompted` 全部收敛为 false
- **THEN** Admin SHALL 允许保存
- **AND** 已禁用 binding SHALL 能保持禁用，`canUnlink` SHALL 继续按既有权限规则用于清理历史用户绑定

#### Scenario: 历史 User DTO 保持兼容
- **WHEN** Admin 读取或更新含 `metamask`/`web3onboard` 历史字段的 User
- **THEN** 既有 XORM 列、JSON 字段和通用 unlink 契约 SHALL 保留
- **AND** Admin SHALL NOT 因本 change 删除字段、创建 schema migration 或自动清空值

### Requirement: Web3 专属实现和依赖按 owner 清退
Admin SHALL 删除 Web3Auth、MetaMask/Web3Onboard idp 工厂和仅由钱包认证持有的依赖，同时 SHALL 保留仍有其它业务 owner 的兼容依赖、历史展示能力和不依赖 SDK 的 bounded token cleanup。

#### Scenario: 安装前端依赖
- **WHEN** 使用 Yarn frozen lock 安装 `web-admin`
- **THEN** `@metamask/eth-sig-util`、直接 `@web3-onboard/*`、`ethers` 及其 Web3 专属传递树 SHALL 不再出现
- **AND** `bluebird` 若基线不存在 SHALL NOT 因本 change 被新增

#### Scenario: 保留其它 owner
- **WHEN** 构建普通登录、密码混淆、历史头像和 mixed CommonJS 功能
- **THEN** `buffer`、`react-metamask-avatar` 及有非 Web3 owner 的 Vite/CommonJS 兼容 SHALL 保持可用
- **AND** 本 change SHALL NOT 为追求 lock 清零而删除这些依赖

### Requirement: 退役交付使用脱敏存量和回归证据
Web3 钱包认证清退只有在目标环境真实存量可被只读聚合证明为零、实施门禁通过且归档前 review READY 时 SHALL 自收口；证据 SHALL 分层并保持脱敏。

#### Scenario: 目标环境存量非零或不可判断
- **WHEN** Provider、Application binding、用户钱包值或可识别真实审计引用任一非零，或查询不能可靠区分空字段 key 与真实值
- **THEN** change SHALL 停止破坏性代码/依赖清退并标记 `BLOCKED`
- **AND** 截图或页面未展示 SHALL NOT 替代数据证据

#### Scenario: 记录只读存量门禁
- **WHEN** 验证记录描述受控环境盘点
- **THEN** 只 SHALL 记录命名聚合计数、只读事务和未修改环境状态的结论
- **AND** 记录 SHALL NOT 包含账号、地址、token、Cookie、password、DSN、完整私有 URL、raw row 或 raw audit payload

#### Scenario: 浏览器和自动化回归
- **WHEN** change 准备 pre-archive review
- **THEN** 聚焦 Jest/Go contract、changed implementation coverage、前端完整质量门禁和 OpenSpec strict SHALL 通过
- **AND** Playwright discovery SHALL 保持 19 files/22 tests，相关浏览器 smoke SHALL 证明无 Web3 入口、无白屏且 page/console error 为 0
