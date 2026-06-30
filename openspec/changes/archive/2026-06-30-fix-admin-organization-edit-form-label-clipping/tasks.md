## 1. OpenSpec 与定位

- [x] 1.1 创建并校验 `fix-admin-organization-edit-form-label-clipping` OpenSpec change
- [x] 1.2 检查 `OrganizationEditPage.tsx` 的 AntD Form `labelCol/wrapperCol`、页面容器、Tabs/Content 宽度和字段分组
- [x] 1.3 检查 `App.less` 中 organization scoped class、shell/content 布局和近期列表页样式，判断是否存在 compact style 泄漏
- [x] 1.4 记录根因：label 宽度不足、form row flex、内容区 padding/overflow 或样式泄漏中的哪一类

## 2. 实施修复

- [x] 2.1 用组织编辑页 scoped 方式修复长 label 裁切/重叠
- [x] 2.2 保持组织读取、保存、密码配置字段、选项和后端 API 契约不变
- [x] 2.3 不触碰 `UserEditPage*`、common/table/auth/provider/root shell 和 active TS 迁移写集

## 3. 测试与浏览器验证

- [x] 3.1 增加或更新聚焦测试，覆盖组织编辑页 label 布局 scoped class 或不泄漏全局 selector 的契约
- [x] 3.2 运行 `openspec validate fix-admin-organization-edit-form-label-clipping --strict`
- [x] 3.3 运行 `git diff --check origin/hfl-test-base..HEAD`
- [x] 3.4 运行 focused organization edit/page tests
- [x] 3.5 运行 `yarn typecheck`、增量 TypeScript gate 和 `yarn build`
- [x] 3.6 使用浏览器 smoke/screenshot 验证桌面视口下密码字段 label 完整可见、无重叠、无横向 overflow

## 4. closeout

- [x] 4.1 记录验证结果和浏览器证据，完成 OpenSpec archive 和主规格同步
- [x] 4.2 收敛为相对最新 `origin/hfl-test-base` 的 1 个逻辑 commit
- [x] 4.3 普通非强制推送 `origin/hfl-test-base`，删除本地/远端工作分支，确认未 push/merge `test`
