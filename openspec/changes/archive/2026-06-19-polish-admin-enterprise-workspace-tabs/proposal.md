## Why

Admin 企业认证中心当前由左侧菜单直接切换页面，顶部 header 下方没有表达“已打开工作页面”的 shell 级工作区状态。管理员在组织账号、应用接入、身份来源、审计运维和 LLM AI/Gateway 之间频繁核对时，需要一个克制的桌面多标签栏来表示当前打开的工作页面，减少在左侧菜单和内容标题之间来回确认的成本。

这次 change 只增强现有 Admin shell，不新增业务中心、不新增一级菜单、不改变路由契约，也不引入 iframe 或复杂 keep-alive。

## What Changes

- 在桌面端 `Header` 下方、主内容区上方新增工作区多标签栏，标签由当前 route 和企业认证中心导航叶子推导。
- 首页/总览标签固定不可关闭，其它标签可关闭；关闭当前标签时回到最近可用标签，关闭非当前标签时停留当前页面。
- 最多展示约 8 个常用标签，超出后通过“更多”菜单展示剩余已打开页面，避免标签条无限撑开页面。
- 使用 sessionStorage 轻量保存打开标签顺序，不做 iframe、keep-alive 或跨会话复杂恢复。
- 移动端不展示完整多标签，只展示当前页面标题/路径和“更多”入口，避免挤压首屏。
- 通过 `1px border + 6-8px` 浅灰分隔 gutter 将标签区与主页面内容分开。

## Capabilities

### Modified Capabilities
- `admin-enterprise-identity-console-shell`: 增加桌面工作区多标签和移动端降级要求。

## Impact

- 主要影响 `web-admin/src/ManagementPage.js`、`web-admin/src/enterpriseNavigation.js`、新增 workspace tabs 组件/逻辑、`web-admin/src/App.less` 和 `zh/en` locale。
- 影响 Admin shell 的导航呈现和响应式布局，不改变后端 API、认证/OAuth/OIDC、Gateway projection、DB 写入或真实环境配置。
- 需要补充聚焦单测覆盖标签生成、关闭、溢出降级和导航交互，并通过 build 与 Playwright 本地 production build 检查桌面/移动布局。
