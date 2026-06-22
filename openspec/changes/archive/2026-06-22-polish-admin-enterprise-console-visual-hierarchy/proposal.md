## Why

当前 Admin 身份控制台已经完成侧栏收窄、工作区多标签和总览普通标签等壳层调整，但截图验收发现三处交互回归：工作区标签关闭按钮视觉过弱、侧栏收起误伤全局 header 品牌、收起后父级菜单缺少可进入二级入口的弹出/展开能力。同时用户认为当前页面仍偏素、偏白，需要在不改变业务逻辑和现有 icon 的前提下做克制的企业控制台视觉层级 polish。

## What Changes

- 修正 workspace tabs 桌面端每个可关闭标签的直接可见关闭 affordance，保留移动端更多菜单关闭入口和关闭全部 fallback 到 `/` 的行为。
- 修正桌面 sidebar collapse 作用域：收起/展开只影响左侧导航区域，不收起顶部品牌、全局操作、右上工具区或租户下拉。
- 修正 collapsed sidebar 的二级导航可达性，复用 AntD `Menu` collapsed submenu popup 语义，避免收起后父级菜单不可进入。
- 调整 Admin shell、workspace tabs、总览 summary band、卡片和状态模块的视觉层级，使页面从纯白线框后台转为更成熟的企业控制台视觉。
- 保持现有 icon set、路由、权限、接口、后端和移动 Drawer 行为不变。

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `admin-enterprise-identity-console-shell`: 收紧桌面 shell collapsed 范围、collapsed submenu 可达性、workspace tabs 可见关闭入口，以及企业控制台视觉层级要求。

## Impact

- 预计影响 `web-admin/src/ManagementPage.js`、`web-admin/src/common/WorkspaceTabs.tsx`、`web-admin/src/App.less`、总览相关测试、shell/tabs 相关测试和本 change OpenSpec artifacts。
- 不修改 API、Gateway、Insight、后端、生产/类生产配置、真实认证链路或 `test` 分支。
