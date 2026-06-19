## 1. OpenSpec 与设计门禁

- [x] 1.1 创建 `polish-admin-enterprise-workspace-tabs` change artifacts，并把范围限定为 shell 工作区多标签体验
- [x] 1.2 完成 implementation-ready review，确认不新增一级菜单、不触碰认证/Gateway/DB 写链路

## 2. 标签逻辑与导航元数据

- [x] 2.1 为企业认证中心导航暴露可复用 route metadata 查询能力，保持既有菜单分组和权限过滤兼容
- [x] 2.2 以 TDD 新增 workspace tabs 纯逻辑：路径规范化、打开顺序、固定首页、关闭跳转、最多 8 个可见和 sessionStorage 读写降级

## 3. Shell 组件与样式

- [x] 3.1 新增桌面 workspace tabs 组件，支持激活态、关闭按钮、更多菜单和路由跳转
- [x] 3.2 新增移动端降级栏，只展示当前页标题/路径和更多入口，不渲染完整多标签
- [x] 3.3 将组件接入 `ManagementPage.js` 的 header 与 content 之间，并补充浅灰 gutter/divider
- [x] 3.4 同步 `zh/en` locale 文案，避免硬编码中英文 UI

## 4. 测试与验证

- [x] 4.1 补充聚焦 Jest/coverage，覆盖新增 workspace tabs 逻辑/组件和导航交互，受影响实现代码覆盖率目标 85%
- [x] 4.2 运行 OpenSpec、diff、增量 TypeScript、typecheck 和 production build 门禁
- [x] 4.3 使用本地 production build + Playwright 覆盖桌面 `1440x900` 与移动 UA `390x844`，抽样 `/`、`/applications`、`/providers`、`/records`、`/organizations`、`/users`、`/agents` 和 LLM AI/Gateway 相关入口
- [x] 4.4 记录验证结果到 `verification.md`，说明覆盖率、浏览器证据、剩余风险和脱敏口径

## 5. 收口

- [x] 5.1 完成归档前 review 并修复阻断问题
- [x] 5.2 archive OpenSpec change，同步主规格
- [ ] 5.3 收敛为 `origin/hfl-test-base + 1` 个本 change commit，重跑关键验证并普通推送到 `hfl-test-base`
- [ ] 5.4 删除工作分支、清理 worktree 或登记保留原因，写 report/processed 并回传主控
