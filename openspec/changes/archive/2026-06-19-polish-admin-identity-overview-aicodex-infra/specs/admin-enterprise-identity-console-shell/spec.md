## ADDED Requirements

### Requirement: AICodex 身份基础设施总览
Admin 身份控制台总览 SHALL 以 `AICodex 身份基础设施总览` 呈现 AICodex 四个产品域的身份运行状态、接入覆盖、待核对事项和审计证据，而不是泛企业认证中心入口集合。

#### Scenario: 总览标题和面包屑使用身份控制台口径
- **WHEN** local admin 访问 `/`
- **THEN** 页面主标题 SHALL 为 `AICodex 身份基础设施总览`
- **AND** 面包屑 SHALL 为 `身份控制台 / 身份总览`
- **AND** 页面 SHALL NOT 使用 `企业认证中心` 作为用户可见产品名

#### Scenario: 总览覆盖 AICodex 四个产品域
- **WHEN** 页面展示产品域覆盖
- **THEN** 页面 SHALL 展示 `应用规格`、`用量洞察`、`身份控制台`、`API 网关` 四个业务名
- **AND** `aicodex-app-spec`、`aicodex-insight`、`aicodex-admin`、`aicodex-api` SHALL 仅作为二级 code tag 或证据标识展示
- **AND** 产品域卡片 SHALL 帮助管理员理解接入声明、用量归因、组织身份配置、Gateway 授权和审计事实

#### Scenario: 总览优先状态和证据
- **WHEN** 管理员在 `1440x900` 桌面视口打开 `/`
- **THEN** 首屏 SHALL 可见覆盖指标、四产品域、待核对事项、接入健康或最近审计证据
- **AND** `身份资产关系`、`治理任务中心`、`接入预检中心` SHALL NOT 作为总览显眼入口堆叠出现
- **AND** 指向既有能力的链接 MAY 以核对建议、状态操作或低噪上下文入口保持可达

#### Scenario: 没有真实处理流时使用核对状态
- **WHEN** 总览展示风险、授权映射、用量归因、接入或审计相关状态
- **THEN** UI SHALL 使用 `待核对`、`待关注`、`核对建议`、`核对中`、`正常` 或等价只读核对文案
- **AND** UI SHALL NOT 展示 `待处理` 或暗示已有后端工单处理闭环的状态

#### Scenario: 总览不暴露内部设计或实现术语
- **WHEN** 管理员查看总览可见文案
- **THEN** 页面 SHALL NOT 展示 `国内云控制台式密度`、`避免把治理入口堆到菜单里`、`对象上下文`、`deep link`、`只读推导`、`当前列表视图` 等内部设计术语或实现痕迹

### Requirement: 身份总览导航入口收敛
Admin 身份控制台左侧首个一级菜单 SHALL 为 `身份总览`，并 SHALL 避免用独立 `快捷操作` 入口填充首页导航。

#### Scenario: 首个一级菜单为身份总览
- **WHEN** local admin 打开桌面侧栏、移动抽屉或组织导航配置树
- **THEN** 首个一级入口 SHALL 使用 `身份总览`
- **AND** 它 SHALL 指向 `/` 总览路由
- **AND** 如果首组只剩一个总览子项，壳层 SHOULD 将其直接渲染为一级菜单项，而不是展示只有一个二级入口的分组

#### Scenario: 快捷操作不作为显眼侧栏入口
- **WHEN** local admin 查看身份控制台侧栏或移动抽屉
- **THEN** 侧栏 SHALL NOT 展示独立 `快捷操作` 主入口
- **AND** `/shortcuts` 路由兼容性 MAY 保留，但不作为身份总览第一屏或首组菜单的显眼入口

### Requirement: Admin 身份控制台 UI 规则
Admin 身份控制台 UI 规则 SHALL 以 Ant Design / Ant Design Pro 为主准则，并把其他设计系统限定为补充检查来源。

#### Scenario: 设计来源边界清晰
- **WHEN** 后续 agent 阅读项目设计文档或 `web-admin/AGENTS.md`
- **THEN** 文档 SHALL 明确 Ant Design / Ant Design Pro 是本 Admin 的主设计准则
- **AND** IBM Carbon SHALL 仅用于数据表格、toolbar、搜索/筛选、列设置、批量操作和密度参考
- **AND** Microsoft Fluent 2 SHALL 仅用于可访问性、焦点顺序、对比、内容与工具型产品体验参考
- **AND** Material Design 3 / Apple HIG SHALL 仅用于通用导航、层级、响应式和平台一致性检查
- **AND** Vercel Web Interface Guidelines SHALL 仅作为语义 HTML、button/link、aria、focus-visible、长文本、overflow、URL 状态和 i18n checklist

#### Scenario: 规则可执行
- **WHEN** 后续 change 修改 Admin 身份控制台菜单、总览、表格、工具栏、状态标签、移动布局或用户可见文案
- **THEN** 项目规则 SHALL 要求菜单命名优先四字中文业务名、产品域使用业务名、仓库名仅作 code tag、禁止泛企业/内部实现文案、总览优先状态和证据、减少入口堆叠、表格/工具栏保持管理台密度、首屏不压低核心内容、桌面/移动均无页面级横向溢出
- **AND** 新增 React 组件、共享逻辑和测试 SHALL 遵循 web-admin 渐进 TypeScript 规则
