## 1. OpenSpec

- [x] 1.1 创建 `align-organization-list-with-group-density` change。
- [x] 1.2 补充 proposal、design 和组织身份中心 spec delta。
- [x] 1.3 运行 `openspec validate align-organization-list-with-group-density --strict` 并修正问题。

## 2. TDD 测试

- [x] 2.1 更新组织列表测试，先断言默认列改为组织主识别、主页/来源、密码策略、软删除、创建时间和轻量操作。
- [x] 2.2 更新测试覆盖 favicon 合并到主识别列、技术 ID 弱复制、行操作低噪声、目录健康辅助区和默认 20/page。
- [x] 2.3 运行聚焦测试并确认新断言先按预期失败。

## 3. 实现

- [x] 3.1 抽取或补强共享列表主识别单元、弱复制按钮和轻量行操作组，并补充复用边界注释。
- [x] 3.2 重组组织列表默认列，隐藏独立 favicon 和其它低频详情字段。
- [x] 3.3 将组织行操作改为轻量动作组，保留群组、用户、编辑和删除语义。
- [x] 3.4 将目录健康上下文移到查询工具栏主控件区之外的低权重辅助区域。
  - 2026-06-24 复验补充：组织页桌面端使用共享查询工具栏右侧辅助槽位承载目录健康，避免辅助文案贴近表头；同时沉淀 `--list-page-*` 字号 token，标题、查询控件、表头、单元格、次级文本和行操作不再各页写死。
  - 2026-06-24 复验补充：继续沉淀 `--list-page-*` 布局 token，覆盖 panel padding、表格 title padding、工具栏间距、查询控件宽度、右侧辅助区宽度、表头/单元格 padding 和滚动条；`ListPageTable` 统一包装 title 工具栏 shell，群组/组织不再各自控制搜索区到表头的留白。
- [x] 3.5 将组织列表默认分页设置为 20 条/页，并保持既有分页选择能力。

## 4. 验证

- [x] 4.1 运行组织列表与群组列表聚焦单测。
- [x] 4.2 运行组织页受影响文件覆盖率验证，确认受影响实现覆盖率达到 85%。
- [x] 4.3 运行增量 TypeScript gate、`yarn typecheck`、`yarn build` 和 `git diff --check`。
- [x] 4.4 启动本地前端直连 60 后台，浏览器复验 `/organizations` 和 `/groups` 截图效果。
  - 2026-06-23 尝试 60 环境候选 Admin 入口时，`/api/get-account` 出现重定向或 webpack dev proxy 500；未找到匹配该前端的 60 Admin 可用域名/SNI，故本项当时暂未完成。验证记录只保留环境别名，不写入完整私有 URL。
  - 2026-06-23 已按私有环境文件改用 60 Admin 测试服务端口启动 `web-admin` 前端 dev server；本地 `/api/get-account` 已确认返回 Admin JSON。待浏览器复验 `/organizations` 与 `/groups` 后再勾选。
  - 2026-06-23 复验补充：本地 `web-admin` dev server 已重新以私有 60 Admin 测试服务端口为代理目标启动，目标 `/api/get-account` 健康检查为 200 JSON，未输出完整私有 URL 或敏感响应。由于自动化浏览器未复用人工登录态，Playwright 使用脱敏最小账号和组织列表 route mock 复验 `/organizations` 布局：标题区仅显示 `组织`，表格 body `clientWidth=628`、`scrollWidth=628`，未出现横向 overflow；真实 60 登录态数据仍需在人工浏览器会话中确认后再勾选本项。
  - 2026-06-24 复验补充：本地 `web-admin` dev server 已按私有 60 Admin 测试段候选重新启动，代理 `/api/get-account` 为 200 JSON，未输出完整私有 URL 或敏感响应。Playwright MCP 无法在不暴露凭据的情况下复用登录态，因此使用脱敏最小账号和组织列表 route mock 复验 `/organizations`：目录健康位于共享查询工具栏右侧辅助槽位，`titleFont=14px`、`tableHeaderFont=13px`、`tableCellFont=13px`、`sideFont=12px`，表格 body `clientWidth=628`、`scrollWidth=628`，未出现横向 overflow；真实 60 数据仍可通过本地 dev server 人工查看。
  - 2026-06-24 复验补充：针对群组/组织布局差异，Playwright MCP 使用脱敏最小账号、群组和组织 route mock 复验 `/groups` 与 `/organizations`：两页均由 `ListPageTable` 生成 1 个共享 `enterprise-list-toolbar-shell`，`--list-page-table-title-padding=0 8px` 的 computed padding 生效为 `0px 8px`，搜索区到表头间距均为 10px，表格 body `scrollWidth` 等于 `clientWidth`，未出现横向 overflow。真实 60 登录态仍由人工浏览器确认后再勾选本项。
  - 2026-06-24 用户确认最新效果可以，并明确授权 `self-closeout=true`，本项按人工验收结论完成。
