# 验证记录

## 自动化验证

- `openspec validate polish-admin-enterprise-organization-identity-entity-workbenches --strict`：通过。
- `git diff --check`：通过，未发现 whitespace error。
- `cd web-admin; yarn typecheck`：通过，`tsc --noEmit` 成功。
- `cd web-admin; yarn test --watchAll=false --verbose --testMatch "**/src/OrganizationIdentityCenter.test.tsx"`：通过，`OrganizationIdentityCenter.test.tsx` 共 6 个测试全部通过。
- `cd web-admin; yarn test --watchAll=false --coverage --coverageReporters=text-summary --testMatch "**/src/OrganizationIdentityCenter.test.tsx" --collectCoverageFrom "src/OrganizationIdentityCenter.tsx"`：通过，`OrganizationIdentityCenter.tsx` 语句、分支、函数、行覆盖率均为 100%，满足受影响实施代码 85% 覆盖率门槛。
- `cd web-admin; yarn build`：通过，CRA 输出 bundle size、Browserslist 和 Node deprecation 提示，未出现编译错误。

## 测试后缀核对

- 本任务触碰的 `web-admin/src/OrganizationIdentityCenter.tsx` 使用 `web-admin/src/OrganizationIdentityCenter.test.tsx`。
- 同名历史测试 `web-admin/src/OrganizationIdentityCenter.test.js` 已删除，工作区检查结果为不存在。
- `AuditOperationsCenter.tsx`、`basic/ShortcutsPage.tsx`、`common/EnterpriseIdentityConsoleLayout.tsx` 仍配套 `.test.js`；这些是无关历史测试债务，本 change 未迁移，已记录到报告和路线台账。

## 浏览器验证

本地开发环境启动后，使用 Playwright 在 `http://127.0.0.1:7002/` 加载真实 React/AntD/CSS 前端。由于本地私有数据集的开发账号密码不匹配，视觉验证使用 Playwright route mock 提供最小脱敏账号与四类列表响应；未修改认证链路、OIDC、Gateway publish 或后端数据。

桌面视口 `1440x900`：

| 路由 | title | `layoutKind` | list top | table top | 页面横向溢出 | 截图 |
| --- | --- | --- | ---: | ---: | --- | --- |
| `/organizations` | `Organization master data workbench` | `directory-health` | 398 | 445 | 否 | `local-dev/tmp/playwright/admin-identity-workbenches/organizations-1440x900.png` |
| `/users` | `Account lifecycle workbench` | `account-lifecycle` | 336 | 383 | 否 | `local-dev/tmp/playwright/admin-identity-workbenches/users-1440x900.png` |
| `/roles` | `Role authorization workbench` | `role-risk-matrix` | 383 | 430 | 否 | `local-dev/tmp/playwright/admin-identity-workbenches/roles-1440x900.png` |
| `/permissions` | `Permission catalog workbench` | `permission-catalog-matrix` | 503 | 550 | 否 | `local-dev/tmp/playwright/admin-identity-workbenches/permissions-1440x900.png` |

移动 UA 视口 `390x844`：

- 四页均渲染出对应 title 和不同 `layoutKind`，并保存移动截图到同一目录。
- 页面级横向溢出仍存在，根因是既有后台壳层在 390px 视口保留约 264px 左侧 Sider，内容区仅约 111px，且 legacy AntD 表格本身是宽表横向滚动；本 change 未改全局后台壳层或四个 legacy 表格。

## 归档前检查

- OpenSpec artifacts：`proposal.md`、`design.md`、`tasks.md`、delta spec 均为当前 change 范围内内容，`openspec status --change ... --json` 返回 artifacts 全部 `done`。
- 文档语言：proposal/design/tasks/verification 以简体中文说明为主；OpenSpec 固定标题、命令、路径、`layoutKind`、测试文件名等保留英文。
- 脱敏：验证记录不包含真实密码、token、cookie、client secret、生产连接串或可直连环境地址。
- 注释：`OrganizationIdentityWorkbenchProfile` 增加中文注释，说明 profile 是四类组织身份实体的产品化差异边界，防止后续退回同一模板。

## 剩余风险

- 浏览器视觉验证的认证态由 Playwright route mock 提供，覆盖前端渲染、布局、DOM 坐标和截图证据，不覆盖真实登录成功路径。
- 移动端全局 Sider 与 legacy 宽表导致页面横向溢出，这是已有后台壳层/表格债务，不在本 change 范围内。
