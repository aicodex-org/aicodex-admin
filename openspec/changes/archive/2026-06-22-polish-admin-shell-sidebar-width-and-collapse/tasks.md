## Implementation

- [x] 1. 添加 Admin shell 侧边栏与 workspace tabs 新模型 OpenSpec artifacts，并通过实施前 review。
- [x] 2. 先写失败的聚焦测试，覆盖桌面默认宽度、收起切换、localStorage 持久化、移动端降级、overflow 防护、品牌区紧凑单行与收起隐藏文案、普通总览标签、两侧滚动按钮、右键关闭菜单和关闭全部 fallback。
- [x] 3. 在 `ManagementPage.js` 中实现桌面 sidebar collapsed state、header 控制、紧凑品牌区、AntD `Sider/Menu` 收起参数和本地持久化。
- [x] 4. 在 `WorkspaceTabs.tsx` 和 `workspaceTabState.ts` 中实现普通总览标签、两侧滚动按钮、桌面右键关闭菜单、关闭左/右/其他/所有和 `关闭所有` fallback。
- [x] 5. 在 `App.less` 中收窄展开态、设置收起态、约束 shell content/workspace tabs/table 相关 overflow，并保留 Admin-2 action-boundary 视觉清晰度。
- [x] 6. 补齐必要 zh/en locale 文案，避免硬编码新增可见按钮/tooltip/菜单项。
- [x] 7. 运行 OpenSpec、TypeScript、Jest/coverage、build 和浏览器 mock smoke 验证，并记录 `verification.md`。
- [x] 8. 完成归档前 review、archive 和 self-closeout。
