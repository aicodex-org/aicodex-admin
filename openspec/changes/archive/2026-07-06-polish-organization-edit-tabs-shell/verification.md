## 验证记录

日期：2026-07-06

## 自动验证

- `openspec validate polish-organization-edit-tabs-shell --strict`
  - 结果：通过。
- `cd web-admin; yarn test src/OrganizationEditPage.test.tsx src/table/AccountTable.test.tsx src/table/LdapTable.test.tsx src/table/MfaTable.test.tsx src/common/resizeObserverLoopErrorGuard.test.ts src/common/resizeObserverLoopErrorPreflight.test.ts --watchAll=false --runInBand`
  - 结果：通过，6 个 test suites、48 个 tests 全部通过。
  - 覆盖范围：组织编辑页 tabs 壳、基础/品牌/多因素认证/目录服务相关回归，账号资料、LDAP、多因素认证表格组件，以及 ResizeObserver 开发 overlay 噪声过滤。
- `cd web-admin; yarn test src/OrganizationEditPage.test.tsx src/table/AccountTable.test.tsx src/table/LdapTable.test.tsx src/table/MfaTable.test.tsx src/common/resizeObserverLoopErrorGuard.test.ts src/common/resizeObserverLoopErrorPreflight.test.ts --watchAll=false --runInBand --coverage --collectCoverageFrom=src/OrganizationEditPage.tsx --collectCoverageFrom=src/table/AccountTable.tsx --collectCoverageFrom=src/table/LdapTable.tsx --collectCoverageFrom=src/table/MfaTable.tsx --collectCoverageFrom=src/common/resizeObserverLoopErrorGuard.ts --collectCoverageFrom=src/common/resizeObserverLoopErrorPreflight.ts --coverageReporters=text-summary --coverageReporters=text`
  - 结果：通过，6 个 test suites、48 个 tests 全部通过。
  - 覆盖率：受影响实现文件 statements 92.14%、functions 91.30%、lines 92.08%；单文件 `OrganizationEditPage.tsx`、`AccountTable.tsx`、`LdapTable.tsx`、`MfaTable.tsx`、`resizeObserverLoopErrorGuard.ts`、`resizeObserverLoopErrorPreflight.ts` 的 statements/lines/functions 均达到 85% 以上。
- `cd web-admin; yarn typecheck --pretty false`
  - 结果：通过。
- `openspec validate --changes --strict`
  - 结果：通过，4 个 active changes 全部通过。
- `openspec validate --specs --strict`
  - 结果：通过，31 个 specs 全部通过。
- `git diff --check`
  - 结果：通过。

历史实施阶段还运行过以下聚焦验证：

- `cd web-admin; node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`
  - 结果：通过。
- `cd web-admin; yarn test src/OrganizationEditPage.test.tsx src/LargeEditFormLayout.test.ts --watchAll=false --runInBand`
  - 结果：通过。
  - 覆盖范围：组织编辑页 tabs、交易记录 tab 条件展示、固定底部操作栏、必填校验、hash 恢复和更新、密码混淆器错误定位、dirty 离开确认、新增模式取消清理、大编辑页壳边界。
- `cd web-admin; yarn test src/common/resizeObserverLoopErrorPreflight.test.ts src/common/resizeObserverLoopErrorGuard.test.ts src/common/NavItemTree.test.tsx src/OrganizationEditPage.test.tsx src/LargeEditFormLayout.test.ts --watchAll=false --runInBand`
  - 结果：通过，31 个 tests 全部通过。
  - 覆盖范围：ResizeObserver 开发 overlay 过滤、导航树包装、组织编辑页 tabs、大编辑页布局。

## 浏览器与人工验收

- 本地前端预览曾连接 60 测试后台做组织编辑页 smoke；验证记录只保留环境别名，不记录完整本地地址、后台地址或登录凭据。
- Playwright MCP 的独立浏览器会话没有继承用户已登录 Chrome 会话，因此自动浏览器 walkthrough 使用临时浏览器级 `/api/**` mock 只验证 UI 布局和交互，不声明真实 60 账号数据已通过端到端验证。
- 自动 walkthrough 覆盖 tabs：基础、品牌、登录安全、导航菜单、账号资料、多因素认证、目录服务、交易记录。
- 自动 walkthrough 结论：各 tab 可渲染，底部操作栏固定在视口底部，页面级横向溢出为 0，没有新增 page error。
- 用户已在本地预览中人工检查组织编辑页各 tab。
- 基础、品牌、多因素认证页已确认可定稿。
- 多因素认证标题左边界已调整为与其它 tab 区块标题一致；内容仍保持窄版表格宽度。
- 明暗主题下 MFA 表格、标题、底部操作栏均已通过截图目视检查。

## 已知限制与剩余风险

- 组织编辑页视觉验收主要基于本地前端预览和用户人工检查；本 change 不包含后端 API、数据库、权限或认证链路改造。
- LDAP 服务器添加、编辑、删除、同步等子资源操作是即时生效资源，不受底部保存/取消控制；页面已通过提示文案说明该语义。
- AntD 静态 message 的 `Static function can not consume context like dynamic theme` 警告来自项目级 `Setting.showMessage` 静态消息路径，不属于本次组织编辑页壳布局新问题。
- ResizeObserver loop 事件属于浏览器 resize 通知噪声；本 change 只过滤该已知开发 overlay 噪声，普通 runtime error 仍会暴露。

## 收尾状态

- 已通过 ff-only 将本地 `hfl-test-base` 同步到最新 `origin/hfl-test-base`，再恢复本 change 写集。
- 当前改动仍是未提交工作区状态，`origin/hfl-test-base..HEAD` 没有本 change commit。
- 完成 pre-archive review 后，才能继续执行 OpenSpec archive、archive 后主规格复查、单 commit 收敛和 push base。
