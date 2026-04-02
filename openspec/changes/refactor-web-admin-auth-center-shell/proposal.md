## Why

当前 `web-admin/` 前端仍然保留 Casdoor 品牌和以顶部横向菜单为核心的后台布局，这与 AICodeX 的产品定位和日常管理路径不一致。现在需要先通过一次壳层级重构统一品牌、导航结构和默认语言，降低后续页面持续改造的成本。

## What Changes

- 将 `web-admin/` 中面向管理员可见的 Casdoor 品牌入口替换为 AICodeX，包括标题、主 Logo、页脚品牌文案和相关默认描述。
- 将当前顶部横向业务导航重构为左侧导航栏模式。
- 保留顶部栏中的全局工具区和账号区，但顶部业务导航仅保留单一入口“认证中心”。
- 将原先红框区域中的所有后台菜单项收纳到左侧“认证中心”导航下，并保持原有权限过滤、选中态和路由跳转能力。
- 调整前端默认语言策略，在未显式指定语言时默认优先使用中文。

## Capabilities

### New Capabilities
- `web-admin-branding-shell`: 定义 web-admin 后台壳层的品牌标识与主导航结构，支持 AICodeX 品牌和“认证中心”左侧导航模式。
- `web-admin-default-localization`: 定义 web-admin 首次访问时的默认语言选择策略，未指定语言时默认使用中文。

### Modified Capabilities

## Impact

- 主要影响 `web-admin/src/ManagementPage.js`、`web-admin/src/App.js`、`web-admin/src/Setting.js`、`web-admin/src/Conf.js`、`web-admin/src/i18n.js`、`web-admin/public/index.html` 及相关样式文件。
- 影响管理员后台的导航呈现、品牌展示和语言初始化逻辑，但不涉及后端 API 协议变更。
- 需要补充导航壳层和默认语言行为的回归验证，避免权限菜单、移动端抽屉菜单和已有深链接路由退化。
