## 设计目标

本 change 延续现有 workspace tabs 结构，不调整状态流和关闭规则，只让右侧工具区成为一个明确的 action cluster。目标是管理员能一眼区分：

1. 左侧固定总览标签。
2. 中间可横向滚动的工作页标签。
3. 右侧滚动控制和关闭管理动作。

## 设计决策

### 1. 保留现有交互模型

桌面端继续使用横向滚动承载多标签，不新增桌面 “More” overflow；`关闭` 继续作为可见同级操作，不下沉到新的 `...` 层级。移动端继续使用当前紧凑模式。

### 2. 右侧 action cluster 只做视觉边界

`.admin-workspace-tabs-actions` 使用固定高度、左侧分隔线、轻背景和更明确的内边距，与 `.admin-workspace-tabs-scroll-area` 分组。滚动按钮和 `关闭` 按钮保持较低视觉权重，避免抢占 active tab 的主状态。

### 3. 不改变关闭规则

`WorkspaceTabs.tsx` 只在必要时补充 DOM 语义或测试可观测标识；`closeWorkspaceTab`、`closeOtherWorkspaceTabs`、`closeAllWorkspaceTabs` 等状态逻辑保持不变。

### 4. 防止布局跳动和溢出

右侧工具区保留稳定尺寸，滚动按钮显隐不得挤压 active tab 文本到不可读；桌面页面级不得横向溢出。移动端不渲染桌面工具区，避免影响小屏首屏高度。

## 验证策略

- 组件测试覆盖右侧工具区 DOM 分组、关闭菜单仍可见、桌面没有 `.admin-workspace-tabs-more` overflow。
- 组件测试覆盖移动端仍渲染紧凑模式，不渲染桌面 action cluster。
- 聚焦 coverage 覆盖 `WorkspaceTabs.tsx`。
- 浏览器 smoke 在桌面多标签场景检查无页面级横向溢出、滚动按钮可操作、`关闭` 菜单可打开、active tab 与 action cluster 未融合。
