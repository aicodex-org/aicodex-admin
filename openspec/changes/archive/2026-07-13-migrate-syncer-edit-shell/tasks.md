## 1. 提案与实施前检查

- [x] 1.1 完成 `proposal.md`、`design.md`、两份 delta spec 和 `tasks.md`。
- [x] 1.2 运行 `openspec validate migrate-syncer-edit-shell --strict` 和 `git diff --check`。
- [x] 1.3 完成实施前 review，确认正文边界及 Syncer API、payload、连接测试和既有记录删除语义不变，并明确新增态按保存创建。

## 2. 测试先行与编辑页改造

- [x] 2.1 新增 `SyncerEditPage.test.tsx`，先以失败测试约束共享壳、唯一动作栏、组织选项和代表性动态字段。
- [x] 2.2 将 `SyncerEditPage.tsx` 接入 `LargeEditShell`，统一返回、面包屑、标题、滚动正文和底部动作栏。
- [x] 2.3 按基本信息、连接配置、映射与状态建立三个 legacy 正文域，保持字段顺序、出现条件和 handler 不变。
- [x] 2.4 复用大型编辑页组织选项表现和搜索规则，保持组织标识作为提交值。
- [x] 2.5 移除 Card title 与正文末尾重复按钮，保持编辑态取消、添加态取消、保存和保存并返回语义。
- [x] 2.6 新增最小 `styles/edit/syncer-edit.less` 并接入大型编辑页样式聚合入口，不向 `App.less` 写入页面私有规则。

## 3. 自动化验证

- [x] 3.1 补齐有效行为测试，覆盖保存 payload、类型切换和添加态取消，确认测试不会自动触发真实连接。
- [x] 3.2 运行 Syncer 编辑页聚焦 Jest 与 changed implementation coverage，最终新增可执行行覆盖率为 93.14%。
- [x] 3.3 运行增量 TypeScript gate、`yarn typecheck` 和 `yarn build`。
- [x] 3.4 运行 `openspec validate migrate-syncer-edit-shell --strict`、`git diff --check` 和分支范围检查。

## 4. RC 运行态验收

- [x] 4.1 使用项目脚本启动代理 60 测试后台的本地前端预览，不启动本地后端。
- [x] 4.2 使用浏览器检查可访问 Syncer 类型的桌面/窄屏、浅色/暗色、滚动、表格和页面级 overflow，不执行连接测试或保存。
- [x] 4.3 更新 `verification.md`，记录脱敏命令、自动化结果、浏览器证据和剩余风险。
- [x] 4.4 提交并推送 `hfl-test/migrate-syncer-edit-shell` RC 分支，停在用户预览验收点，不归档、不合入基线。

## 5. 多 tabs 正文收敛

- [x] 5.1 更新 proposal、design、delta spec 和任务，确认三个 tabs、hash 恢复、空错误信息及添加态按保存创建的最终契约。
- [x] 5.2 先补失败测试，约束基本信息、连接配置、映射与状态三个 tabs，未知 hash 回退和空错误信息轻量空态。
- [x] 5.3 将三个正文域接入 `LargeEditShell.tabs`，保留 tab 内公共分类标题，并保持共享状态、动态字段、连接测试和保存 payload 不变。
- [x] 5.4 复用公共表格工具栏与小操作按钮样式，移除表格列标题重复文案，并收敛空表格和错误信息区域。
- [x] 5.5 运行聚焦测试、表格测试、增量 TypeScript gate、typecheck、OpenSpec strict validate 和 diff 检查。
- [x] 5.6 在本地前端代理 60 测试后台逐 tab 验证桌面/窄屏、浅色/暗色、hash、空态、局部滚动和控制台，并更新 RC 验证记录与单提交。
