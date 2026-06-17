## 1. 测试先行

- [x] 1.1 将 `OrganizationIdentityCenter` 聚焦测试迁移为 `.test.tsx`，先断言四类实体拥有不同 `layoutKind`、标题、指标 key、行动 key 和风险 key。
- [x] 1.2 补充列表 children 可达性、zh/en i18n key 完整性和权限页不复用角色文案断言，并确认 RED 阶段因当前同质化实现失败。

## 2. 前端实现

- [x] 2.1 将 `OrganizationIdentityCenter.tsx` 改为实体 profile + `layoutKind` 驱动的紧凑工作台，分别实现组织目录健康/边界、用户生命周期/账号状态、角色权限风险矩阵、权限敏感度/引用关系矩阵。
- [x] 2.2 收紧顶部层级和行动入口，移除“原列表仍是操作入口”“不包装成全量事实”等重复说明式内容，确保列表 section 紧随实体治理摘要之后。
- [x] 2.3 同步 `web-admin/src/locales/zh/data.json` 和 `web-admin/src/locales/en/data.json` 的新增/调整文案。

## 3. 验证与收尾

- [x] 3.1 运行 `openspec validate polish-admin-enterprise-organization-identity-entity-workbenches --strict`、`git diff --check`、`yarn typecheck`、聚焦 Jest/coverage 和 `yarn build`。
- [x] 3.2 读取 local-dev/测试环境说明后执行桌面和移动 UA 浏览器验证，覆盖 `/organizations`、`/users`、`/roles`、`/permissions`，保存四页截图并记录表格/核心列表入口 y 坐标。
- [x] 3.3 更新 `verification.md`，补齐归档前 review 所需的验证、覆盖率、浏览器坐标、测试后缀和脱敏记录。
- [x] 3.4 完成归档前 review 和 OpenSpec 主规格同步，归档与 commit 作为交付动作继续执行。
