## Context

未修复 production preview 已确定性复现两组问题：桌面 UA 在 320/360/390px 分别产生 70/50/35px 页面级 overflow，移动 UA 在相同视口分别产生 30/10/0px。桌面分支的 `.login-panel` / Form 为 460/400px；移动分支的 panel / Form 为 380/300px。

几何 owner 已闭环到 Signup 子树中的三组固定宽度：`Setting.renderLogo()` 输出 320px logo，Form 按 UA 固定为 300/400px，Email/Phone `Radio.Group` 跟随固定 300/400px；它们与共享 `.login-form { padding: 30px }` 的 min-content 计算共同撑宽 flex item。Phone `Space.Compact` 只跟随 Form 宽度，不是独立 owner。

本 change 只能修改 Signup 页面、直接测试和必要局部样式。共享登录 CSS、其它认证页、认证契约、依赖和全局样式均不在写集内。

## Goals / Non-Goals

**Goals:**

- 在桌面 UA 窄窗口和移动 UA 的 320/360/390px 视口中消除 Signup 页面级横向溢出。
- 保持 1440px 桌面端 460px panel / 400px Form 的视觉基线。
- 让 logo、Form、Email/Phone 模式组和手机号组合按 Signup 可用内容宽度收缩，并让长标签、错误文案和提交/登录动作可换行且可操作。
- 保持 Email/Phone 模式切换、字段规则、验证码、提交、登录跳转和键盘焦点顺序。

**Non-Goals:**

- 不重设计注册页，不修改共享 `.login-form`、Login/Forget 等其它认证页面或全局 responsive shell。
- 不修改认证 API、payload、Provider 行为、路由、i18n 文案或应用自定义 CSS 契约。
- 不升级 AntD、React、RTL、Jest、Vite、Playwright 或任何依赖。

## Decisions

### 1. 使用 Signup scoped class 与局部 Less 表达响应式边界

为 Signup 的 `.login-form` 增加专用 class，桌面宽度保持 460px，并以 viewport 宽度作为窄屏上限；Form 保持 400px 桌面上限并占满可用内容宽度。局部样式同时约束 `.panel-logo`、模式组和需要换行的操作内容，使 min-content 不再把父 flex item 撑出 viewport。

选择局部 Less 而不是只堆叠 inline style，是因为 responsive 规则同时涉及父壳、后代 logo 和 AntD 子结构，scoped selector 更容易审计且不会污染共享页面。备选的共享 `login-pages.less` 修复会改变 Login/Forget 等并行写集，故拒绝；备选的页面级 `overflow-x: hidden` 只隐藏裁切而不修复 owner，故禁止。

### 2. 响应式依据使用 CSS viewport，不再依赖 UA 分支决定几何安全

`Setting.isMobile()` 继续决定现有 Form layout 和应用自定义 mobile CSS，不改变认证页行为；几何安全由 `max-width`/viewport 约束保证。这样桌面浏览器缩窄窗口和真实移动 UA 都满足同一无溢出契约，也不新增 resize listener 或 React 状态。

备选的 `window.innerWidth`/`matchMedia` 状态会引入监听与 hydration/测试复杂度，且 CSS 已能表达同一约束，故不采用。

### 3. TDD 分层证明 JSX 契约与真实页面几何

直接 Jest 先断言 Signup 壳、Form、logo 作用域和模式组具备目标 class/流式契约，并确认旧实现因缺少这些契约失败；GREEN 后继续覆盖 Email/Phone 切换与 Phone compact 比例。jsdom 不伪造 layout engine 的 `scrollWidth`。

页面级无 overflow、长文案、校验错误、操作换行和焦点顺序由脱敏 production preview 的真实 Chromium 在 320/360/390px 与 1440px 验证。两层证据各自只证明对应层级。

## Risks / Trade-offs

- [320px 下 30px 双侧 padding 使 Form 内容区收缩到 260px] → 保持控件流式占满内容区，实测长标签、Phone compact、错误文案与操作换行；不通过减小触控控件或隐藏内容换取无 overflow。
- [局部 selector 可能误伤其它 auth 页面] → 所有新规则以 Signup 专用根 class 为前缀，浏览器同时确认桌面尺寸保持 460/400px。
- [应用自定义 `formCssMobile` 仍可能主动设置超宽内容] → 本 change 保持该外部自定义契约；验收使用无自定义 CSS 的标准 fixture，verification 将该边界列为剩余风险。
- [logo 缩放影响品牌清晰度] → 只设置最大宽度并保持 `height: auto`，桌面 320px 原尺寸不变，窄屏等比收缩。

## Migration Plan

1. 固化当前 desktop/mobile RED 矩阵与 owner box model。
2. 新增直接 Jest 契约并确认旧实现按预期 RED。
3. 增加 Signup scoped class/局部样式和最小 JSX 调整，取得 GREEN。
4. 运行覆盖率、完整前端门禁和真实 Chromium UI review。
5. pre-archive READY 后归档并同步主规格，收敛为最新 base + 1 个 logical commit。

回滚只需 revert 单个最终 commit；没有数据、API、依赖或部署迁移。

## Open Questions

无。根因、写集、响应式策略、验证层级和回滚路径均已由当前代码与 controller envelope 收口。
