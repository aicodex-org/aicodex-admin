## MODIFIED Requirements

### Requirement: AICodex 身份基础设施总览
Admin 身份控制台总览 SHALL 以 `AICodex 身份基础设施总览` 呈现 AICodex 四个产品域的身份运行状态、接入覆盖、待核对事项和审计证据，而不是泛企业认证中心入口集合。

#### Scenario: 总览标题和面包屑使用身份控制台口径
- **WHEN** local admin 访问 `/`
- **THEN** 页面主标题 SHALL 为 `AICodex 身份基础设施总览`
- **AND** 面包屑 SHALL 为 `身份控制台 / 身份总览`
- **AND** 页面副标题 SHALL 使用简短控制台状态口径，而不是说明文档式长句
- **AND** 页面 SHALL NOT 使用 `企业认证中心` 作为用户可见产品名

#### Scenario: 总览覆盖 AICodex 四个产品域
- **WHEN** 页面展示产品域覆盖
- **THEN** 页面 SHALL 展示 `应用规格`、`用量洞察`、`身份控制台`、`API 网关` 四个业务名
- **AND** `aicodex-app-spec`、`aicodex-insight`、`aicodex-admin`、`aicodex-api` SHALL 仅作为次级 code tag 或证据标识展示
- **AND** 产品域卡片 SHALL 帮助管理员理解接入声明、用量归因、组织身份配置、Gateway 授权和审计事实

#### Scenario: 总览优先状态和证据
- **WHEN** 管理员在 `1440x900` 桌面视口打开 `/`
- **THEN** 首屏 SHALL 可见覆盖指标、四产品域、待核对事项、接入健康或最近审计证据
- **AND** `身份资产关系`、`治理任务中心`、`接入预检中心` SHALL NOT 作为总览显眼入口堆叠出现
- **AND** 指向既有能力的链接 MAY 以核对建议、状态操作或低噪上下文入口保持可达

#### Scenario: 总览指标口径保持可信
- **WHEN** dashboard 数据可推导用量归因完整度
- **THEN** 顶部 `用量归因完整度` 与用量洞察产品域卡片 SHALL 使用一致显示值
- **AND** 同屏 SHALL NOT 出现一个 `用量归因完整度` 显示 `-`、另一个同语义卡片显示 `98%` 的状态

#### Scenario: KPI 状态表达不得依赖无语义装饰线
- **WHEN** 页面展示顶部 KPI 指标
- **THEN** KPI SHALL NOT 使用管理员无法解释的彩色顶部边线作为主要视觉信号
- **AND** 状态语义 SHALL 通过标签、数值、描述或清晰分组表达

#### Scenario: 最近审计证据操作文案具体可辨
- **WHEN** 页面展示最近审计证据列表
- **THEN** 每条证据操作 SHALL 使用对象或证据类型相关文案
- **AND** 列表 SHALL NOT 机械重复 `查看记录` 作为所有条目的唯一 CTA

#### Scenario: 没有真实处理流时使用核对状态
- **WHEN** 总览展示风险、授权映射、用量归因、接入或审计相关状态
- **THEN** UI SHALL 使用 `待核对`、`待关注`、`核对建议`、`核对中`、`正常` 或等价只读核对文案
- **AND** UI SHALL NOT 展示 `待处理` 或暗示已有后端工单处理闭环的状态

#### Scenario: 总览不暴露内部设计或实现术语
- **WHEN** 管理员查看总览可见文案
- **THEN** 页面 SHALL NOT 展示 `国内云控制台式密度`、`避免把治理入口堆到菜单里`、`对象上下文`、`deep link`、`只读推导`、`当前列表视图` 等内部设计术语或实现痕迹
