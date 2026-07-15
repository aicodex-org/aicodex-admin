## ADDED Requirements

### Requirement: Vite 作为 web-admin 默认应用开发与构建工具链
`web-admin` SHALL 使用 typed Vite 配置作为应用开发与 production build 的唯一默认工具链，同时 SHALL 保持 `yarn start`、`yarn build` 和静态交付目录的既有外部契约。

#### Scenario: 开发者启动默认前端开发服务器
- **WHEN** 开发者在 `web-admin` 执行 `yarn start`
- **THEN** Vite dev server SHALL 默认监听 `7002`
- **AND** `PORT` SHALL 能覆盖默认端口
- **AND** 端口被占用时命令 SHALL 明确失败而不是静默改用其它端口

#### Scenario: 构建生产静态产物
- **WHEN** 开发者或 CI 执行 `yarn build`
- **THEN** Vite SHALL 生成 production 静态产物到 `web-admin/build`
- **AND** Docker 与现有静态发布流程 SHALL 不需要改变复制目标路径
- **AND** 仓库 SHALL NOT 长期维护第二个默认 CRA production build

### Requirement: Vite dev proxy 保持后端路由行为
Vite dev server SHALL 使用 `AICODEX_ADMIN_DEV_PROXY_TARGET`、`AICODEX_ADMIN_PROXY_TARGET`、本机默认后台的既有优先级，并 SHALL 代理所有当前 Admin 开发路径。

#### Scenario: 前端请求常规后台路径
- **WHEN** dev server 收到 `/api`、`/swagger`、`/files`、`/.well-known/openid-configuration` 或 `/scim` 请求
- **THEN** 请求 SHALL 转发到解析后的后台 target
- **AND** proxy SHALL 保持 change-origin 行为

#### Scenario: 前端请求 CAS 验证路径
- **WHEN** dev server 收到组织级 CAS `validate`、`serviceValidate`、`proxyValidate`、`proxy` 或对应 `p3` 路径
- **THEN** 匹配路径 SHALL 转发到同一后台 target
- **AND** 非匹配的普通前端 history route SHALL NOT 被 CAS proxy matcher 截获

### Requirement: 构建与运行环境访问具备类型并集中管理
系统 SHALL 通过 typed build/runtime env adapter 统一解析运行模式、`PUBLIC_URL`/base 与公共静态资源 URL，业务模块 SHALL NOT 新增散落的 Vite-specific env 读取。

#### Scenario: 默认根路径部署
- **WHEN** production build 未配置 `PUBLIC_URL`
- **THEN** HTML 入口、动态 chunk 和 branding/public asset SHALL 使用根路径 `/`
- **AND** runtime adapter SHALL 生成无重复斜杠的公共资源 URL

#### Scenario: 非根 base path 部署
- **WHEN** production build 使用受控非根 `PUBLIC_URL`
- **THEN** HTML 入口、动态 chunk、branding/public asset 和 callback 页面资源 SHALL 使用同一规范化 base
- **AND** 页面刷新 SHALL 能由静态服务 history fallback 返回应用入口

### Requirement: Locale 加载可由 Vite 静态分析
应用 11 种受支持语言的翻译与国家名称数据 SHALL 使用显式 typed 映射，SHALL NOT 依赖动态 CommonJS `require` 或不可分析的任意模板路径。

#### Scenario: 加载受支持语言
- **WHEN** 当前语言为 `de/en/es/fr/ja/pl/pt/tr/uk/vi/zh` 之一或带受支持基础语言的 region suffix
- **THEN** 应用 SHALL 加载对应翻译 namespace 与国家语言包
- **AND** production build SHALL 为翻译保留可追踪的按需 chunk 或等价静态分析结果

#### Scenario: 加载未知语言
- **WHEN** runtime 收到不在受支持清单中的语言值
- **THEN** 翻译与国家名称 SHALL 回退到 `en`
- **AND** 应用 SHALL NOT 因缺失动态模块而产生 page error

### Requirement: 浏览器兼容 fallback 保持有界
Vite 构建 SHALL 支持当前 Buffer、MetaMask、Web3 Onboard 和必要 CommonJS 依赖，但 SHALL NOT 通过无边界 Node polyfill 套件模拟浏览器不应使用的 core modules。

#### Scenario: 构建 Web3 与 CommonJS 依赖
- **WHEN** 执行 production build
- **THEN** Buffer、MetaMask、Web3 Onboard 和混合 CommonJS 模块 SHALL 成功解析和产出
- **AND** build SHALL NOT 因 `process`、`global` 或 Node core module 缺失而失败

#### Scenario: 浏览器触发 Provider 或 Web3 路径
- **WHEN** smoke 打开相关登录或 Provider 路径并触发对应模块加载
- **THEN** 所需 chunk SHALL 成功加载
- **AND** 页面与 console SHALL 不出现未定义 Buffer/global/process 或 CommonJS interop error

### Requirement: 运行时错误处理保留可操作错误
Vite dev server SHALL 展示编译/HMR error overlay；应用 preflight SHALL 仅过滤已知 ResizeObserver loop noise，并 SHALL 保留其它 runtime/page error 的可见性。

#### Scenario: 已知 ResizeObserver loop noise 出现
- **WHEN** 浏览器派发已知 ResizeObserver loop error 文案
- **THEN** preflight/guard SHALL 阻止该已知噪声触发误导性 runtime overlay
- **AND** 应用 SHALL 继续渲染

#### Scenario: 非 ResizeObserver runtime error 出现
- **WHEN** 浏览器发生其它未处理 runtime error
- **THEN** 错误 SHALL 继续出现在 page error 或 console 证据中
- **AND** 迁移 SHALL NOT 使用全局吞错逻辑隐藏该错误

### Requirement: 迁移证据对比构建且不预设体积缩小
change SHALL 保存 CRA 切换前证据，并 SHALL 以同口径记录 Vite 入口、chunk、主要 bundle、静态资源 base 和回退项。

#### Scenario: 评估 Vite production build
- **WHEN** Vite build 完成
- **THEN** 验证记录 SHALL 列出 CRA/Vite 的入口、JS/CSS 文件数量、raw/gzip 合计和主要 bundle
- **AND** 结论 SHALL NOT 把 bundle 必然变小作为成功条件
- **AND** 任何无依据明显回退 SHALL 在 release candidate 前定位、修复或记录为阻断风险

#### Scenario: 交付 release candidate
- **WHEN** change 准备推送工作分支
- **THEN** OpenSpec strict、diff check、typecheck、build-tooling typecheck、incremental TS、全量 Jest、public scripts、lint、production build 和浏览器 smoke SHALL 有新鲜证据
- **AND** 记录 SHALL 不包含完整私有 URL、Cookie、token、账号密码或响应体
