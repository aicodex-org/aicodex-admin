## 1. OpenSpec 与实施门禁

- [x] 1.1 创建 `implement-admin-enterprise-identity-console-shell` proposal、design、tasks 和 delta spec
- [x] 1.2 完成实施前 review 循环，运行 `openspec validate "implement-admin-enterprise-identity-console-shell" --strict` 与 `git diff --check`

## 2. 企业认证中心导航

- [x] 2.1 将 `ManagementPage` 左侧导航重组为总览、组织与身份、认证源、应用接入、Gateway 投影、审计与运维
- [x] 2.2 保持现有叶子路由 key、深链接高亮、`navItems` / `userNavItems` 过滤和移动端抽屉复用
- [x] 2.3 补充导航结构测试，覆盖关键分组、隐藏入口和既有路由归属

## 3. 身份治理总览

- [x] 3.1 新增或改造身份治理总览组件，展示组织主数据、企业微信/飞书/OIDC、应用接入/API 映射、Gateway 投影、最近失败/待处理风险
- [x] 3.2 复用已有只读数据或 mock-safe 前端聚合，覆盖加载、空态、错误态、无权限/无数据状态
- [x] 3.3 补充总览组件测试，覆盖状态卡片、入口跳转、接口失败和非管理员降级

## 4. 验证、Review 与归档

- [x] 4.1 运行前端聚焦测试、覆盖率检查、构建或等效校验，并记录到 `verification.md`
- [x] 4.2 完成归档前 review，修复 Blocking/Fixable 问题
- [x] 4.3 archive change，验证主规格，整理单 change commit
