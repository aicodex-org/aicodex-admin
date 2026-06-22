## 1. OpenSpec 与回归门禁

- [x] 1.1 创建并校验本 change 的 proposal、design、spec delta 和任务清单。
- [x] 1.2 用 focused 测试锁定桌面 header 不随 sidebar collapsed 收缩、collapsed Menu 子菜单仍可达、workspace tabs 关闭按钮直接可见。

## 2. 回归修复

- [x] 2.1 修正 `ManagementPage.js` 中 sidebar collapsed 与全局 header 品牌文本的耦合。
- [x] 2.2 修正 collapsed sidebar 的 AntD Menu 控制方式，恢复父级菜单的二级入口 popup/展开能力。
- [x] 2.3 增强 workspace tabs 桌面关闭按钮的默认可见 affordance，并保留移动端关闭入口和关闭全部 fallback 行为。

## 3. 视觉层级 polish

- [x] 3.1 调整 Admin shell、页面画布、顶部栏、侧边栏、workspace tabs 与内容区的层级样式。
- [x] 3.2 调整身份总览 summary band、状态卡、健康/审计模块的边框、阴影和克制状态色。
- [x] 3.3 检查桌面展开/收起与移动 390x844 下无页面级横向溢出、文本重叠或 icon set 变更。

## 4. 验证与收口

- [x] 4.1 运行 OpenSpec target validate、changes/specs strict validate 与 `git diff --check`。
- [x] 4.2 运行 web-admin 增量 TypeScript gate、`yarn typecheck`、focused Jest 和 `yarn build`。
- [x] 4.3 执行浏览器 smoke：desktop 1440x900、collapsed sidebar 子菜单、workspace tab 关闭按钮、mobile 390x844。
- [x] 4.4 archive OpenSpec change，整理为单个提交，push 工作分支并按 self-closeout 推进 `hfl-test-base`，删除工作分支并写 report。
