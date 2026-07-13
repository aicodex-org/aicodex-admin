## 1. 提案与基线

- [x] 1.1 完成 proposal、design、delta spec 与 tasks，并通过实施前 review 和 `openspec validate --strict`。
- [x] 1.2 对照 `bdffd4b0f`、公共 `LargeEditShell` 和邀请码现有测试，确认布局写集与业务兼容边界。

## 2. 测试先行与页面改造

- [x] 2.1 先扩展 `InvitationEditPage.test.tsx`，覆盖公共头部/路径、四个正文分区、公共 field row、唯一固定操作栏和旧重复按钮移除，并确认新断言按预期失败。
- [x] 2.2 改造 `InvitationEditPage.tsx` 复用 `LargeEditShell`、`LargeEditSection` 和 `LargeEditFieldRow`，保持现有 handler、API payload、路由及新增取消删除语义。
- [x] 2.3 补充必要 scoped 样式和 zh/en 文案，确保桌面、窄屏、长文本和操作控件布局稳定且不引入无关视觉重做。
- [x] 2.4 运行聚焦 Jest 并修复回归，确认既有加载、复制、发送、保存、错误和删除分支继续通过。

## 3. 静态与构建验证

- [x] 3.1 运行增量 TypeScript 门禁、`yarn typecheck`、受影响页面聚焦 coverage 与 `yarn build`，记录结果和受影响文件覆盖率。
- [x] 3.2 运行 `git diff --check`、OpenSpec strict validate，并检查变更中无 secrets、乱码、无关格式化或接口契约变更。

## 4. RC 只读浏览器验收

- [x] 4.1 到 RC 后使用仓库脚本启动本地前端代理 60，仅连接 60 测试后台，不启动或修改本地后端。
- [x] 4.2 在桌面与窄屏视口打开目标路由，逐段滚动截图并检查公共头部、四个分区、固定底栏、页面级 overflow、console/page error 和 webpack overlay。
- [x] 4.3 验收期间不点击保存、保存并退出、发送邀请、取消新增、删除或其它写操作；停止仅由本次任务启动的前端代理进程。

## 5. 验证记录与归档前审查

- [x] 5.1 补充脱敏 `verification.md`，分层记录测试、coverage、构建与只读浏览器 smoke 证据及剩余风险。
- [x] 5.2 执行归档前 review，修复阻塞项并确认 change archive-ready。

## 6. 归档后按钮一致性修订

- [x] 6.1 以 RED/GREEN 测试对齐正文紧凑发送按钮和“取消 / 保存 / 保存并返回”固定底栏。
- [x] 6.2 复跑聚焦测试、coverage、typecheck、build 和桌面/窄屏只读浏览器验收。

## 7. 归档后新增草稿语义修订

- [x] 7.1 以 RED/GREEN 测试覆盖“添加”不调用新增接口、路由草稿加载、新增保存调用创建接口，以及新增取消/顶部返回不写入。
- [x] 7.2 将新增页改为路由内草稿，保存成功后转换为编辑模式，移除临时邀请码删除回收路径。
- [x] 7.3 使用仅允许 GET 的受控前端预览验收添加、取消、顶部返回不触发 POST，并复跑 typecheck、build、coverage 和 strict 校验。

## 8. 归档后组织与字段校验修订

- [x] 8.1 以 RED/GREEN 测试覆盖组织显示名/技术值分离，以及非法名称和邮箱阻止保存。
- [x] 8.2 组织下拉展示 `displayName || name`，并在公共 field row 中展示名称和邮箱的本地化格式错误。
- [x] 8.3 复跑类型、构建、OpenSpec strict 校验和受控浏览器 smoke；不触发真实写入。
- [x] 8.4 以 RED/GREEN 测试阻断中文和其它非 ASCII 名称，并明确技术 ID 字符集。
