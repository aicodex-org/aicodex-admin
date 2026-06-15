## 1. OpenSpec 与实施门禁

- [x] 1.1 创建 `implement-admin-enterprise-identity-auth-source-center` proposal、design、tasks 和 delta spec
- [x] 1.2 完成实施前 review 循环，运行 `openspec validate "implement-admin-enterprise-identity-auth-source-center" --strict` 与 `git diff --check`

## 2. 认证源中心组件

- [x] 2.1 先补前端测试，覆盖企业微信、飞书、OIDC 状态推导、配置完整度、诊断入口和空态
- [x] 2.2 新增认证源中心只读组件，基于现有 Provider 数据展示状态卡片、最近同步/授权状态和失败摘要入口
- [x] 2.3 将认证源中心集成到 `/providers`，保留既有 Provider 表格、新增、编辑、删除、分页和筛选行为

## 3. 企业管理台视觉

- [x] 3.1 补充认证源中心样式，确保桌面端信息密度合理、窄屏按钮与长文本不重叠
- [x] 3.2 更新导航或页面文案，使 `/providers` 在认证源分组中表达“认证源中心”而不改变权限 key

## 4. 验证、Review 与归档

- [x] 4.1 运行前端聚焦测试、覆盖率检查、构建或等效校验，并记录到 `verification.md`
- [x] 4.2 完成归档前 review，修复 Blocking/Fixable 问题
- [x] 4.3 archive change，验证主规格，整理单 change commit
