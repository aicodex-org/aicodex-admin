## ADDED Requirements

### Requirement: Web admin SHALL default to Chinese on first visit
当访问者首次进入 `web-admin/`，且没有显式语言指令时，后台界面 SHALL 默认使用中文。

#### Scenario: First visit falls back to Chinese
- **WHEN** 浏览器本地没有保存语言偏好，且 URL 中也没有 `language` 参数
- **THEN** `web-admin/` 必须以中文初始化界面文案

### Requirement: Explicit language choices SHALL override the default
默认中文仅作为缺省策略，系统 SHALL 不覆盖用户已经明确给出的语言选择。

#### Scenario: URL language parameter takes precedence
- **WHEN** 访问地址中携带 `language=<lang>` 查询参数
- **THEN** 系统必须优先按该参数切换语言

#### Scenario: Persisted user choice takes precedence
- **WHEN** 浏览器本地已经保存了语言偏好
- **THEN** 系统必须优先使用该偏好，而不是回退到默认中文

### Requirement: Language switching SHALL remain persistent
管理员手动切换语言后，该选择 SHALL 被持久化并影响后续访问。

#### Scenario: Manual language selection is saved
- **WHEN** 管理员在后台切换语言
- **THEN** 新语言必须被保存到本地存储
- **THEN** 页面刷新后必须继续使用该语言
