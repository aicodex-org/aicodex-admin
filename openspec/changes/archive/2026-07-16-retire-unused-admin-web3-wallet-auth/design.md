## Context

Admin 前端目前通过 `Web3Auth.ts` 初始化 MetaMask 和 Web3 Onboard 钱包 SDK，并在登录、注册、用户绑定、Provider 编辑、Application 绑定和回调路径暴露入口。`ManagementPage.tsx` 与 Provider 字段组件的静态引用还会把该依赖树带入全局应用图。后端通用 Provider/Application 写 API 没有 Web3 退役保护，登录路径只根据请求解析 Provider 后进入 idp 工厂；MetaMask/Web3Onboard idp 接收客户端地址而没有服务端 nonce/签名验证，因此隐藏按钮或把 `canSignIn` 设为 false 都不是可信安全边界。

产品已决定退役该能力而非迁移 EIP-6963。60 受控测试环境已使用单事务 `READ ONLY` 聚合核验：Web3 Provider、Application 引用/激活绑定、用户钱包字段/实际绑定和可识别真实审计引用均为 0。该证据只用于允许代码与依赖清退，不授权修改 60、删除 schema 或批量清理历史数据。

## Goals / Non-Goals

**Goals:**

- 从 Admin 登录、注册、绑定、Provider 配置和 Application 启用面完整移除 Web3/MetaMask/Web3Onboard 入口，直达旧路由也不出现白屏、死链接或可操作配置表单。
- 以服务端真实 Provider 数据为准，通过一个大小写不敏感、会裁剪空白的 classifier 统一阻止退役 Provider 的创建、转换、新绑定、重新激活和登录。
- 保持历史 Provider、Application binding 和 User 钱包字段的 DTO/schema 读取兼容，并继续允许列表读取、禁用、解绑和删除。
- 删除 Web3Auth/idp 实现及其专属 npm/Go 运行图，保留有其它 owner 的 Buffer、历史头像渲染和 mixed CommonJS 兼容。
- 用稳定错误 alias、聚焦 contract tests、完整前端门禁和脱敏浏览器证据证明其它认证方式与 Playwright 19/22 契约未回归。

**Non-Goals:**

- 不迁移 EIP-6963，不建设新的钱包认证实现，也不保留隐藏开关或双实现。
- 不删除数据库列、User DTO 字段或历史记录，不新增 schema migration，不批量修改 Provider/Application/User。
- 不重构全仓 Provider API、认证框架或 Application 保存模型，不改变 OAuth/OIDC/SAML/CAS/LDAP/WeCom/Lark 等协议。
- 不迁移 Bun、不更换 Yarn、不升级 React/Router/Jest/Vite，也不修改 Playwright runner、7002/CI/disposable DB 契约。
- 不把 60 只读核验扩大为部署、重启、配置修改或真实登录测试。

## Decisions

### 1. 选择 UI/SDK 清退与服务端 fail-closed 同步交付

只隐藏前端入口会保留可绕过的通用 Add/Update/Login API，无法满足安全边界；只阻断后端会留下不可用按钮、旧回调、死代码和专属 SDK。采用同一 change 同步移除 UI/实现/依赖并建立服务端保护，使产品表面与运行契约一致。该 change 不把历史数据不存在当作服务端保护的替代品。

### 2. 服务端使用单一退役分类器，真实对象是 truth owner

退役分类器对字符串执行 `TrimSpace` 和不区分大小写比较，满足任一条件即视为 Web3 钱包认证 Provider：

- `category == Web3`
- `type == MetaMask`
- `type == Web3Onboard`

分类使用 OR，防止通过 `category=OAuth,type=MetaMask` 等错配组合绕过。Provider Add/Update 直接分类请求对象；Application binding 与 login 必须按名称加载数据库中的真实 Provider 后再分类，不信任请求 DTO 内嵌的 category/type。统一错误 alias 为 `PROVIDER_WEB3_WALLET_AUTH_RETIRED`，继续使用现有 `{status,msg}` 响应形态，不新增 DTO 字段。

分类器和写保护落在后端对象/认证共用边界，而不是只放 controller；这样 HTTP API、内部调用和 initData/恢复路径都不能重新引入退役能力。代价是外部备份若包含 Web3 记录将不能通过通用创建路径恢复；这是产品退役的预期结果，已有数据库记录仍可读取和删除。

### 3. 写入状态机只允许历史配置朝安全方向收敛

- Provider：Add 拒绝任何退役组合；Update 同时检查旧对象和新对象，拒绝普通 Provider 转成 Web3，也拒绝改写历史 Web3；Get/List/Delete 保持可用。
- Application：Add 拒绝任何 Web3 binding；Update 从数据库解析 binding 对应的真实 Provider。历史 Web3 binding 只有在移除或把 `canSignIn`、`canSignUp`、`prompted` 全部收敛为 false 时才可保存；已禁用 binding 可保持禁用，任何新增、保持激活或 false→true 均拒绝。`canUnlink` 不属于登录激活面，可保留用于历史解绑。
- Login：从数据库得到真实 Provider 后、检查 Application Provider 可见性或目标组织之前立即拒绝，确保退役请求稳定返回同一 alias；随后才可能进入 idp 工厂或用户匹配。Application binding 缺失、可见性或 `canSignIn=false` 不能改变退役分类结果。

60 计数为零意味着上述历史状态分支当前不需要数据迁移，但 contract tests 必须固定这些兼容行为。

### 4. 前端入口使用共享分类 helper fail-closed

前端建立 copy-safe 的 `isRetiredWeb3WalletProvider` 判断，只读取 category/type，不包含 endpoint、token 或钱包地址。Provider 登录/注册按钮、Provider 可见性、Application 新绑定选项和 User 新绑定入口在渲染前过滤退役类型，避免删除专用分支后落入通用 OAuth URL fallback。

Provider 列表/API 仍可显示历史记录，并在既有权限允许时删除；历史 Web3 编辑直链呈现明确的不可配置退役状态，只提供返回/删除等安全动作，不渲染可保存表单。历史 User 钱包字段如存在，在既有本人/管理员与 `canUnlink` 规则下保留通用 unlink 动作，不再加载钱包 SDK或写 localStorage。`AuthCallback` 不再接受 Web3 localStorage token 转换为 callback code。

删除 `Web3Auth` 时把既有退出清理收敛为独立的退役 storage helper：只枚举并删除固定 `Web3AuthToken_` 前缀的 localStorage key，不反序列化、回显或记录 value，也不依赖钱包 SDK。该 helper 继续在退出路径执行，避免旧浏览器遗留签名 token；它不是隐藏认证实现，也不提供恢复入口。

Web3 专属文案、图标和静态资产只有在确认无其它 owner 后删除；其它认证方式共享的 Provider/icon/locale 不移动。新增退役提示仅覆盖历史直链这一必要状态，按 11 个现有 locale 的最小同构 key 处理。

### 5. 依赖与 Vite 配置按 owner 删除

从 `package.json`/`yarn.lock` 删除 `@metamask/eth-sig-util`、全部直接 `@web3-onboard/*`、`ethers` 及仅由其持有的传递树。`@web3-onboard/react` 虽无源码 import，也属于退役能力的冗余 direct dependency，一并删除。`bluebird` 当前不存在，不制造无意义 lock 改动。

`buffer` 仍由密码混淆使用，`react-metamask-avatar` 仍由历史 `metamask:` avatar scheme 使用，两者保留。Vite 删除 `@metamask/eth-sig-util` 专属 `optimizeDeps` 项，但保留 Buffer alias/include、`define.global` 和 `transformMixedEsModules`；后两者不以本 change 为清理目标，mixed CommonJS 还有 `face-api.js`/`xlsx` owner。

### 6. 测试按 TDD 和证据层级推进

后端先用纯 classifier/对象 contract/controller login 测试复现可创建、可重新激活和可登录，再写最小保护。前端先用 Jest 固定 Provider option/filter、旧直链、login/signup/binding 不呈现和 legacy unlink，再删除实现与依赖。changed implementation coverage 以实际改动文件/受影响 package 为统计对象，目标至少 85%；不以 DTO getter 或 mock 调用制造覆盖率。

浏览器使用本地 loopback 7002 与可回收测试 fixture，核验普通登录、Provider 列表/新增/历史直链降级、无 Web3入口、无 page/console error。Playwright discovery 必须保持 19 files/22 tests；完整 suite 只在 disposable DB 执行，绝不在 60 或共享数据库运行破坏性 E2E。

## Risks / Trade-offs

- [历史部署仍有未被本次 60 代表的 Web3 数据] → schema/DTO/读取/禁用/解绑/删除保持兼容，login 与重新启用 fail-closed；发布说明要求先做同口径只读盘点。
- [对象层写保护影响含 Web3 的备份恢复/initData] → 明确不支持通过通用创建路径恢复退役能力；普通 Provider seed/恢复以回归测试保证不受影响。
- [前端过滤遗漏导致死链接或通用 OAuth fallback] → 使用共享 classifier，并覆盖 Login/Signup/Provider/Application/User 入口及 direct-route 浏览器 smoke。
- [删除钱包依赖误伤 Buffer、头像或 CommonJS] → 依赖按 `yarn why` 和源码 owner 保留；执行 frozen install、typecheck、build 与普通登录/头像/相关功能 smoke。
- [稳定 alias 被 controller 包装或翻译改变] → 后端导出常量并在 Add/Update/Application/Login 的 contract tests 中断言原始 alias；UI 只对用户显示最小必要翻译。
- [60 只读证据被误当作部署验证] → verification 将其单列为存量门禁，只记录脱敏聚合计数，不声称部署或运行态通过。

## Migration Plan

1. 在当前工作分支完成 OpenSpec、TDD 实现和本地验证；先不部署 60。
2. 发布前对目标环境执行同口径只读存量检查。若任一真实 Provider、激活绑定、用户钱包值或审计引用非零，停止删除/部署并由 owner 决定清理或延期。
3. 先发布后端 fail-closed 与前端静态产物的同一版本；部署后普通认证路径不应受影响，退役类型请求返回稳定 alias。
4. 回退时恢复上一 Admin 应用版本和静态产物即可；本 change 没有 schema/data migration，因此无需数据库回滚。回退会重新暴露旧 Web3 能力，应只作为短时恢复并保持外部入口禁用。

## Open Questions

无。产品退役方向、60 存量门禁、历史数据兼容和禁止 schema migration 均已明确；实现若发现非零存量或无法维持历史禁用/删除兼容，则停止为 `BLOCKED` 并回传主控。
