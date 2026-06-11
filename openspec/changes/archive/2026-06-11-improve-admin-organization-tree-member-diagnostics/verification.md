# Verification

## 范围

- 本 change 已完成 admin-only 组织树成员诊断 DTO、部门成员摘要、按部门分页成员查询、成员 fail-closed 分类、前端 `成员视图` 和成员详情抽屉。
- 验证记录只使用受控 fixture 与脱敏 ID，不包含 token、Cookie、手机号、邮箱、真实人员明细或完整组织结构。

## 已执行

- `openspec validate improve-admin-organization-tree-member-diagnostics --strict`：通过。
- `openspec validate --specs --strict`：通过，14 个主规格均通过。
- `git diff --check`：通过。
- `go test ./controllers -run 'TestOrganizationTreeOperationsDiagnosticsAddsMemberSummaryWithoutReturningMemberList|TestOrganizationTreeOperationsDepartmentMembersArePagedAndFailClosed|TestOrganizationTreeOperationsDepartmentMembersFailClosedForInvisibleDepartment' -cover`：通过，覆盖成员摘要、分页、脱敏、异常 fail-closed、不可见部门 fail-closed；package 覆盖率 3.8%。
- `go test -cover ./controllers`：通过，package 覆盖率 13.9%。
- `go test ./object -run 'TestPlatformOrganizationSnapshotGettersReturnEmptyForBlankOrganization|TestPlatformOrganizationSnapshotGettersQueryByOrganization' -cover`：通过，覆盖新增只读 getter 的空组织保护和按组织过滤；package 覆盖率 0.3%。
- `go test -cover ./object`：未通过；既有 `TestAICodexDesktopApplicationDiscoveryContract` 断言和 `TestDumpToFile` 本地 MySQL 连接依赖阻断全包测试。本 change 已用 sqlite fixture 覆盖新增 getter。
- `yarn test OrganizationTreeOperationsPage.test.js --watchAll=false`：通过，8 个测试通过；输出包含 React 18 legacy render、Ant Design `bodyStyle` deprecated、rc-tree 测试环境 warning，未影响断言。
- `yarn eslint src/OrganizationTreeOperationsPage.js src/OrganizationTreeOperationsPage.test.js src/backend/OrganizationTreeOperationsBackend.js`：通过；输出 Browserslist 数据过期提示。
- `yarn build`：通过；输出 bundle size、Browserslist 数据过期和 Node `fs.F_OK` deprecation warning。

## 覆盖率

- Go 受影响 package 未达到 85%：
  - `controllers` 是大包级覆盖率口径，当前全包为 13.9%；聚焦成员诊断测试通过，但 package 总量较大，无法用本 change 的窄改动把全包覆盖率提升到 85%。
  - `object` 全包测试受既有环境/断言阻断；本 change 新增 getter 已通过 sqlite fixture 聚焦测试，package 覆盖率口径为 0.3%。
- 补救路径：
  - 后续若仓库引入 changed-file coverage，可对 `organization_tree_operations.go` 的成员诊断相关函数做变更行覆盖统计。
  - `object` 全包覆盖率需要先拆分或隔离依赖真实 MySQL/本机应用发现的既有测试。

## 60 Smoke

- 未执行。当前线程没有已确认的 60 测试环境、测试账号和可脱敏 smoke 数据集。
- 如后续执行，只记录入口是否可打开、成员视图是否按部门懒加载、分页是否返回脱敏条目和异常成员是否只进入诊断，不记录真实人员、手机号、邮箱、token、Cookie 或完整组织结构。

## 剩余风险

- 成员详情中的 `displayName` 仅用于展示；后端返回的成员权威 join/授权字段已保持脱敏，不返回 `adminSubject`、外部主体明文或 API 用户 ID。
- 成员列表仅在请求部门存在于当前 read model 可见节点时返回；不可见部门返回空页，避免扩大组织树可见范围或报表 scope。
- 前端未做真实浏览器截图验证；当前覆盖为 React Testing Library 行为测试、ESLint 和生产构建。
