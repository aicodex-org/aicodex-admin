## ADDED Requirements

### Requirement: 剩余 common widgets 批量 TypeScript 迁移
Admin 前端 SHALL 支持将剩余 common widgets、modal、theme 和 select 组件从 legacy JavaScript 渐进迁移为 `.tsx`，并保持现有 JS/TS 共存、extensionless import、用户可见行为和后端契约兼容。

#### Scenario: 剩余 common 组件迁移为 TSX
- **WHEN** 本 change 迁移 `CaptchaWidget`、`OAuthWidget`、`SamlWidget`、`SendCodeInput`、`PaginateSelect`、`EnableMfaNotification`、`AffiliationSelect`、theme picker/editor 或指定 modal 组件
- **THEN** 含 JSX 的生产组件 SHALL 使用 `.tsx`
- **AND** 迁移 SHALL 使用局部 TypeScript interface/type 描述组件实际消费的 props、state、form、event、callback、option、theme token、modal state 或动态配置字段
- **AND** legacy JS/TS 调用方 SHALL continue importing migrated components through existing extensionless paths

#### Scenario: 组件行为保持兼容
- **WHEN** 管理员或用户使用迁移后的验证码、OAuth/SAML 展示、发送验证码、分页选择、MFA notification、隶属关系选择、主题编辑或 modal 组件
- **THEN** 表单字段、后端查询、发送验证码、分页加载、选项展示、主题 token 回写、modal 确认/取消、密码重置、协议确认、裁剪和人脸识别语义 SHALL 与迁移前保持兼容
- **AND** 迁移 SHALL NOT 修改 API path、HTTP method、payload shape、权限、i18n 文案、视觉样式、认证/OIDC、Provider 配置、Application/Syncer 页面或 root shell 行为

#### Scenario: 高风险组件可 deferred
- **WHEN** 某个候选组件迁移需要重塑第三方控件生命周期、媒体权限、人脸识别初始化、裁剪 payload、认证链路、页面级业务或并行 owner 写集
- **THEN** 该文件 MAY 被记录为 deferred
- **AND** deferred SHALL NOT 阻塞其它低风险 common widgets 完成迁移和验证
- **AND** 本 change SHALL NOT touch `web-admin/src/table/*`、`web-admin/src/auth/*`、`web-admin/src/provider/*`、backend 或 root shell/config 文件

#### Scenario: 剩余 common 组件迁移验证
- **WHEN** 剩余 common widgets 批量迁移准备收口
- **THEN** OpenSpec strict validation、`git diff --check`、`yarn typecheck`、增量 TypeScript gate 和 `yarn build` SHALL pass for touched TSX and JS coexistence paths
- **AND** if existing focused tests are touched, focused Jest SHALL run real suites/tests and pass
- **AND** if no existing focused tests are touched, verification SHALL explicitly record that no zero-test Jest result was used
- **AND** 验证记录 SHALL list deferred files and SHALL NOT include token、secret、Cookie、client secret、私有 URL、个人邮箱、手机号或其它敏感字段原值
