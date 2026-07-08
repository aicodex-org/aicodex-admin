## Context

当前 `web-admin/` 是基于 React Router 和 Ant Design `Layout/Menu` 构建的后台。顶部导航由 [`web-admin/src/ManagementPage.js`](/Users/mt/code/mt-ai/aicodex/aicodex-admin/web-admin/src/ManagementPage.js) 中的 `getMenuItems()` 动态生成，既负责品牌 Logo，又负责桌面横向菜单和移动端抽屉菜单。品牌默认值分散在 [`web-admin/src/Setting.js`](/Users/mt/code/mt-ai/aicodex/aicodex-admin/web-admin/src/Setting.js)、[`web-admin/src/Conf.js`](/Users/mt/code/mt-ai/aicodex/aicodex-admin/web-admin/src/Conf.js) 和 [`web-admin/public/index.html`](/Users/mt/code/mt-ai/aicodex/aicodex-admin/web-admin/public/index.html)，语言默认逻辑集中在 [`web-admin/src/i18n.js`](/Users/mt/code/mt-ai/aicodex/aicodex-admin/web-admin/src/i18n.js)，但首次登录后还会被 [`web-admin/src/App.js`](/Users/mt/code/mt-ai/aicodex/aicodex-admin/web-admin/src/App.js) 的账号语言逻辑二次改写。

这次变更属于典型的跨模块壳层改造：导航结构、品牌配置、语言初始化和响应式布局都要同时调整。如果不先在设计里统一导航数据模型和语言优先级，实现阶段很容易出现桌面端与移动端菜单不一致、路由高亮失效、或默认中文被登录态覆盖的问题。

## Goals / Non-Goals

**Goals:**
- 将后台默认品牌统一为 aicodex-admin，并明确品牌展示面的修改范围。
- 将桌面端后台主导航从顶部横向菜单重构为左侧“认证中心”导航。
- 保留现有路由、权限过滤、移动端抽屉菜单和顶部工具区能力。
- 将默认语言策略调整为“无显式偏好时默认中文”，并保持显式选择优先。

**Non-Goals:**
- 不重写各业务页面内容本身，只调整后台壳层、导航组织和默认文案。
- 不修改后端 API、RBAC 规则、组织模型或菜单配置协议。
- 不在本次变更中对所有 旧项目文本做全仓库级语义替换，只覆盖管理员主壳层可见的品牌入口。

## Decisions

### 1. 建立共享导航配置，再分别渲染桌面侧栏和移动端抽屉
当前 `getMenuItems()` 直接返回 Ant Design `Menu` items，并混合了 Logo、SaaS Banner、权限过滤和扁平化逻辑。为了支持左侧导航，同时避免桌面端和移动端行为分叉，本次改造应先抽出一份“原始导航分组配置”，再通过统一过滤逻辑生成：

- 顶部栏：仅保留品牌区、单一“认证中心”入口、工具区和账号区。
- 桌面端：使用 `Layout.Sider + Menu mode="inline"` 呈现左侧导航。
- 移动端：继续使用 `Drawer + Menu mode="inline"`，复用同一份导航数据。
- “认证中心”在本次变更中定义为顶部固定单一入口标签，不承担桌面端折叠/展开控制职责；桌面端左侧导航默认常驻。

备选方案是继续沿用顶部 `Menu` 数据并通过 CSS 强行改成侧栏样式，但这样会把“单一认证中心入口”和“完整左侧多分组导航”耦合在一起，后续难以维护选中态和响应式结构，因此不采用。

### 2. 左侧导航保留现有路由分组，不重新设计信息架构
用户要求是把红框中的现有菜单整体迁移到“认证中心”左侧导航下，而不是重新定义后台 IA。因此左侧导航仍沿用当前分组：

- 首页
- 用户管理
- 身份认证
- Casbin 权限管理
- LLM AI
- 日志与审计
- 商业与付款
- 管理工具

这样可以最大程度复用现有 `selectedMenuKey`、权限过滤和路由映射，降低重构风险。备选方案是把所有叶子菜单打平成单层列表，但这会显著降低可读性，也不符合当前后台菜单规模。

### 3. 默认中文以“显式优先、缺省中文”为准，不再让账号语言静默覆盖缺省策略
当前语言优先级大致是：

1. URL `language` 参数
2. `localStorage.language`
3. `Conf.ForceLanguage`
4. `navigator.language`
5. `Conf.DefaultLanguage`
6. 登录后 `account.language` 可能再次覆盖当前语言

为了满足“默认使用中文”，设计上应收敛为：

1. URL `language` 参数
2. `localStorage.language`
3. `Conf.DefaultLanguage`，默认值改为 `zh`

其中后端下发的 `forceLanguage`、浏览器语言和登录后账号语言都不再作为管理员后台的静默覆盖源。手动语言切换仍然保留，并通过 `localStorage` 持久化。这样能够保证首次进入后台时稳定落在中文，而不会因为浏览器环境、账号属性或服务端默认配置不同而出现不一致体验。

备选方案是仅把 `Conf.DefaultLanguage` 改成 `zh`，继续保留 `forceLanguage`、`navigator.language` 和 `account.language` 的覆盖逻辑；这种方案实现更小，但在当前服务端默认配置下仍然会让后台首屏落到英文，因此不采用。

### 4. 品牌替换优先覆盖壳层可见入口，静态资源采用配置化回退
品牌改动优先覆盖以下壳层入口：

- 浏览器标题和默认 meta 描述
- 顶部/侧栏主 Logo
- 页脚 `Powered by ...`
- 其他后台首页可直接感知的 旧项目品牌文案

实现上优先复用现有 `Setting.getLogo()` 和 `Conf` 配置入口，将默认资源切换为 aicodex-admin 品牌资源；若正式 logo 资产尚未就绪，则先使用 aicodex-admin 文本锁定和现有可配置图片回退。若组织级自定义 Logo 已存在，则继续遵循组织级覆盖。这样既满足品牌统一，也不会破坏已有组织定制能力。

## Risks / Trade-offs

- [左侧导航重构可能导致深链接高亮失效] → 继续沿用现有 `selectedMenuKey` 计算逻辑，并补充关键路由回归验证。
- [桌面侧栏与移动端抽屉菜单可能出现展示不一致] → 使用同一份导航分组和同一套权限过滤函数生成菜单数据。
- [默认中文策略可能改变部分既有英文用户的首次体验] → 保留 URL 和手动切换优先级，确保显式偏好不被覆盖。
- [品牌资源未准备好会影响视觉完整性] → 允许先使用配置化文本与临时 logo 占位，再替换为正式 aicodex-admin 资源。

## Migration Plan

1. 抽取并整理现有后台菜单分组与权限过滤逻辑，形成统一导航配置。
2. 将桌面端 `ManagementPage` 改造成 “顶部工具栏 + 左侧认证中心导航 + 内容区” 布局。
3. 保持移动端抽屉菜单可用，并复用相同导航配置。
4. 替换 `Conf.js`、`Setting.js`、`index.html`、页脚等壳层品牌默认值为 aicodex-admin。
5. 调整 `i18n.js` 与 `App.js` 的语言初始化优先级，确保首次默认中文。
6. 回归验证桌面端、移动端、不同权限账号、深链接路由和语言切换行为。

回滚策略：若上线后发现导航或语言行为异常，可先回滚 `ManagementPage` 和语言初始化逻辑到原始顶部菜单版本；品牌文案替换属于低风险，可独立保留或回滚。

## Open Questions

- aicodex-admin 默认 Logo 资源文件是否已经确定；若未确定，实现阶段按设计使用文本锁定和可配置图片回退。
