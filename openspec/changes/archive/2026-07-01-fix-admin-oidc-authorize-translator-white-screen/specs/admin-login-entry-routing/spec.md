## ADDED Requirements

### Requirement: 显式授权入口必须避免 translator 白屏
OAuth/OIDC 显式授权入口 SHALL 在前端 i18n 或 translator 资源缺失、尚未初始化或输入值不完整时保持可渲染状态，并展示可继续登录或授权的关键控件；系统 MUST NOT 因 translator TypeError 导致整页白屏。

#### Scenario: OIDC 授权页 translator 输入不完整
- **WHEN** 用户访问 `/login/oauth/authorize` 并进入 Admin 授权或登录页面
- **AND** 授权页渲染期间某个文案 key、namespace、formatter 或 translator 输入值不可用
- **THEN** 页面 MUST 继续渲染登录或授权主流程控件
- **AND** 前端 MUST NOT 抛出导致 React 整页白屏的 translator TypeError

#### Scenario: Insight 发起 Admin OIDC 登录
- **WHEN** Insight 用量页通过 `aicodex-admin` OIDC 入口发起授权登录
- **THEN** Admin 显式授权入口 MUST 展示非白屏页面
- **AND** 用户完成登录或已有会话授权后 MUST 能回到 Insight 继续 current-user 和 scope 验证
