## Context

企业认证中心已经通过 `enterpriseNavigation.js` 将左侧菜单组织为业务域，`ManagementPage.js` 负责 header、sider、mobile drawer 和主内容区。当前页面切换完全依赖左侧菜单选中态，无法表达管理员在一次工作会话中打开过哪些页面。

用户已确认的产品方向是 shell 级“桌面工作区多标签”：左侧菜单负责导航，顶部标签负责表示当前打开的工作页面。该能力属于企业后台工作区体验，不是新增业务中心或新菜单体系。

## Decisions

- 采用 route-driven tabs。标签来源于当前 location pathname 和 `enterpriseNavigation` 的叶子配置，不使用 iframe、不做 keep-alive，也不改动各页面生命周期。
- 新增共享逻辑文件管理标签状态：规范化路径、从导航项解析标签、限制可见数量、关闭标签时计算下一个 route、读写 sessionStorage。
- 首页 `/` 作为固定标签，始终保留且不可关闭。未知 route 仅显示当前路径降级标签，不写入业务菜单。
- 桌面端最多展示 8 个可见标签，其余进入“更多”菜单。激活态使用克制蓝色文字和上边线/蓝点，非激活态灰底灰字，关闭按钮默认低对比、hover 增强。
- 移动端只展示当前页面标题/路径和“更多”菜单入口，不渲染完整标签组，避免压缩页面首屏。
- 标签栏与内容区之间使用浅灰 gutter/divider，避免贴住页面标题、筛选区或卡片。

## Non-Goals

- 不新增一级菜单、业务中心、工作台或治理入口。
- 不改变 `navItems` / `userNavItems` 的稳定 route key 和权限过滤。
- 不触碰真实认证链路、OAuth/OIDC 回调、Gateway projection publish/cleanup/receipt、生产/69、DB 写入。
- 不做跨浏览器长期会话恢复、固定标签管理、拖拽排序、iframe keep-alive 或页面状态缓存。

## Implementation Notes

- `enterpriseNavigation` 需要导出可复用的 route metadata 查询函数，避免 workspace tabs 重新维护一份菜单映射。
- 新增 React 组件使用 `.tsx`，纯逻辑和类型使用 `.ts`，测试使用 `.test.ts` / `.test.tsx`。
- `ManagementPage.js` 保持壳层入口不大迁移，只接入 tabs 组件，避免一次性迁移整个文件。
- 用户可见文案进入 `general` locale，英文和中文同时维护。
- 单测先覆盖纯逻辑，再覆盖组件交互；浏览器验证检查 console/pageerror、横向溢出、标签栏与主内容分隔、移动端降级。

## Rollout

该 change 是前端 shell 增强，不需要后端迁移。若浏览器验证发现标签栏显著压低主内容首屏或必须引入 keep-alive/iframe 才能满足用户目标，则停止为 `needs_master_decision`，不强行 self-closeout。
