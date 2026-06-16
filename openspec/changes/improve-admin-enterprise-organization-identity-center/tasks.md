## 1. OpenSpec 与基线确认

- [x] 1.1 读取派发 prompt、路线台账、线程索引、OpenSpec 规则、local-dev/测试环境说明和相邻归档 change
- [x] 1.2 完成启动门禁并从最新 `hfl-test-base` 创建工作分支
- [x] 1.3 创建 `improve-admin-enterprise-organization-identity-center` proposal、design、tasks 和 delta specs

## 2. 组织身份工作台实现

- [x] 2.1 新增共享 `OrganizationIdentityCenter.tsx`，复用 `EnterpriseIdentityConsoleLayout`，基于当前列表视图展示摘要、风险和入口
- [x] 2.2 在 `/organizations`、`/users`、`/roles`、`/permissions` 列表页上方接入工作台壳层，保留原表格、筛选、分页和操作
- [x] 2.3 同步 zh/en 国际化文案，避免新增 UI 硬编码或中英文混用
- [x] 2.4 补充导航 IA / 配置树复用测试，确认稳定叶子 key 和权限过滤不变
- [x] 2.5 补充组织身份中心聚焦测试，覆盖当前视图口径、入口渲染和列表承载关系

## 3. 验证、记录与回传

- [x] 3.1 运行 `openspec validate improve-admin-enterprise-organization-identity-center --strict` 和 `git diff --check`
- [x] 3.2 运行 `cd web-admin; yarn typecheck`
- [x] 3.3 运行聚焦 Jest/coverage，覆盖新增 TSX/TS、导航 IA、配置树复用和接入页关键行为
- [x] 3.4 运行 `cd web-admin; yarn build`
- [x] 3.5 按 local-dev 脚本启动并用浏览器完成组织身份相关页面桌面与窄屏复验；若被环境阻断，记录 blocker 和替代验证
- [x] 3.6 更新 `verification.md`、最终脱敏报告、路线台账，并向主控线程短回传
