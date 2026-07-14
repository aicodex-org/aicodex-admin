## MODIFIED Requirements

### Requirement: 用量接入二级入口

`用量接入` 页面 SHALL 作为唯一的 `Insight Admin Provider` copy-safe metadata 交接入口，承接 Admin 身份、组织、resolver、projection/trust 和 owner evidence readiness 摘要，并生成 Insight Profile 可消费的 Admin handoff package。

#### Scenario: 接入包可复制且扩展能力待配置

- **WHEN** `/application-usage-access` 的 package readiness 为 ready，且用量身份映射或 Gateway 组织投影存在 partial、missing 或 blocked runtime capability
- **THEN** 默认层 SHALL 明确显示“接入包可复制”和 `N` 项扩展能力待配置，并保持单一 `复制 Insight Admin 接入包` CTA 可用
- **AND** 下一步 SHALL 明确管理员可继续导入，且扩展能力配置不影响接入包导入与 Profile 启用
- **AND** 默认层 SHALL NOT 将该场景称为“部分缺失”“交接阻断”或“阻断项”
- **AND** `交接包不含真实凭据` SHALL 作为中性安全说明，且 SHALL NOT 计入 runtime 待补齐数或 package 阻断数

#### Scenario: 接入包被真实生成前置条件阻断

- **WHEN** package readiness 因 issuer、store、target、package request 或等价的既有 Admin 生成前置条件失败而 blocked
- **THEN** 页面 SHALL 显示接入包不可复制、禁用复制 CTA 并给出脱敏恢复动作
- **AND** 页面 SHALL 保持 fail-closed，且 SHALL NOT 因 runtime capability 状态把 blocked package 误报为可复制

#### Scenario: 默认层保持低噪声

- **WHEN** 管理员初次访问 `/application-usage-access`
- **THEN** 首屏 SHALL 仅保留接入包状态、Provider 运行能力状态、下一步和单一复制 CTA
- **AND** 目标消费方、包类型和等价常量 SHALL 移入紧凑说明或详情，页面标题、面包屑和状态标题 SHALL NOT 重复 `Insight Admin Provider`
- **AND** 默认层 SHALL NOT 展示 owner alias、wrapper route、source class、内部 owner hint、raw evidence 或完整诊断表

#### Scenario: 渐进披露能力与技术诊断

- **WHEN** 管理员展开“查看能力详情”
- **THEN** 一级详情 SHALL 仅展示待配置扩展能力的人话名称、影响和建议动作，以及可用能力列表或 Tag
- **AND** package ready 场景的能力缺口 SHALL NOT 被命名为阻断项
- **AND** route、owner alias、source class 和内部 owner hint SHALL 只在管理员按需打开的“查看技术诊断” Modal 中展示，且 SHALL NOT 位于能力详情的嵌套 disclosure
- **AND** 技术诊断 Modal SHALL 支持 `?diagnostics=1` 直达、Esc/关闭按钮关闭、关闭后焦点恢复、桌面约 800px 宽与窄屏全宽
- **AND** code-like 技术 token SHALL 标记为不可翻译，并支持复制、截断/tooltip 与键盘访问，避免页面级横向溢出

#### Scenario: 基础状态和复制反馈保持可用

- **WHEN** 状态/config 请求处于 loading、empty、error 或 permission denied，或复制动作处于 copying、success、failure
- **THEN** 页面 SHALL 显示与 package readiness 一致的紧凑反馈和可恢复提示
- **AND** 页面 SHALL 保持壳层导航可用，且 SHALL NOT 暴露 token、Cookie、raw package、credential、完整 secretRef、私有 URL 或 raw DB row
- **AND** 在 1440x900 与 390x844 视口中，状态、按钮、长文本和 disclosure SHALL 可操作且页面级 SHALL NOT 横向溢出

### Requirement: 用量接入 copy-safe 安全边界

页面生成和展示 Admin 交接包时 SHALL 明确说明该交接包是 copy-safe Admin owner evidence，只用于 Insight Admin Provider 元数据交接和安全交接授权兑换；包可携带脱敏 `secure_handoff_grant` envelope，但不包含可直接调用的运行态凭据。

#### Scenario: 元数据交接包生成成功

- **WHEN** 管理员复制 Insight Admin 接入包
- **THEN** UI SHALL 只渲染脱敏治理项名称、人可读状态、copy-safe 摘要、凭据引用存在性、调用策略存在性或别名、有界运行策略摘要、keep-in-env/cannot-infer 状态和 next action 字段
- **AND** UI SHALL 明确导入 Insight Profile 后由 Insight 后端兑换安全交接授权并完成凭据绑定；`manual/secretRef` 仅作为兑换失败时的恢复路径
- **AND** package ready + runtime partial 状态 SHALL 使用 success 的接入包状态与 warning 的扩展能力状态分别表达，且 SHALL NOT 暗示真实凭据被复制到 UI

### Requirement: Admin copy-safe 交接包对齐 Insight Profile 草稿

Admin `用量接入` 页面 SHALL 生成包含 copy-safe metadata 与脱敏 `secure_handoff_grant` envelope 的 Insight Admin Provider 交接包；当用量身份映射或 Gateway 组织投影待配置时，页面 SHALL 把该事实作为不阻断导入与 Profile 启用的运行数据完整度风险表达。

#### Scenario: keep-in-env 只作为 fallback evidence

- **GIVEN** Admin copy-safe governance metadata 中存在 `keepInEnv` 或 `keep_in_env` group
- **WHEN** operator 生成 Admin handoff package
- **THEN** package MAY 包含 `keepInEnv`，但只能作为脱敏 fallback 或兼容证据
- **AND** `admin_service_credential_keep_in_env` SHALL NOT 成为默认顶层 blocker 或主要 `nextAction`
- **AND** 缺用量身份映射或 Gateway 组织投影时，页面 SHALL 明确接入包仍可复制、Profile 仍可启用，并说明其可能影响后续运行数据完整度
- **AND** package SHALL 包含合约所需的脱敏 `secure_handoff_grant` envelope，但 SHALL NOT 包含 raw secret value、Authorization、Cookie、client secret、完整私有 URL、raw payload、raw id、真实账号或完整组织树
