## 1. OpenSpec

- [x] 1.1 补齐 proposal、design、tasks 和 delta specs，明确 Application 组织与 Provider 身份源目标组织的边界。
- [x] 1.2 运行 `openspec validate add-admin-application-identity-source-bindings --strict` 并修复 proposal/spec 问题。

## 2. 后端模型与登录解析

- [x] 2.1 先补 object 层失败测试，覆盖 ProviderItem `targetOrganization` 解析、空值 fallback、目标组织不可用 fail closed。
- [x] 2.2 实现 ProviderItem 目标组织字段和解析/校验辅助方法。
- [x] 2.3 先补登录匹配聚焦测试，证明 Lark/WeCom Provider 登录使用目标组织而不是 Application 默认组织。
- [x] 2.4 更新 Provider 登录链路中的用户查找、注册、绑定规则、OAuth 属性同步和 MFA 组织上下文。

## 3. 前端 TSX 渐进迁移

- [x] 3.1 先新增 `ApplicationIdentitySourceBindings` TSX 组件测试，覆盖渲染、默认组织 fallback、选择组织、空态和长文本。
- [x] 3.2 新增 `ApplicationIdentitySourceBindings.tsx`，并在 `ApplicationEditPage.js` 的 Provider 配置区域接入。
- [x] 3.3 保持历史 JS 页面不全量迁移，仅新增组件和类型定义使用 TSX/TypeScript。

## 4. 验证与收口

- [x] 4.1 运行目标 OpenSpec strict、`openspec validate --changes --strict`、`openspec validate --specs --strict`。
- [x] 4.2 运行相关 Go focused tests。
- [x] 4.3 运行 `yarn typecheck`、前端 focused Jest、必要 coverage 和 `yarn build`。
- [x] 4.4 运行 `git diff --check`，补充 `verification.md`。
- [x] 4.5 完成 pre-archive review；若无 blocker，archive、单 commit、push 工作分支。是否合入 `hfl-test-base` 视测试结果和主控安排决定，禁止 push/merge `test`。
