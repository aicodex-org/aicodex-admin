# 验证记录

## 验证范围与证据层级

本 change 只修复 Admin 注册页的前端响应式布局与登录链接键盘激活语义。浏览器验证使用本地 production preview 和脱敏 Application/API fixture，不连接真实账号、认证 Provider 或后台数据，因此结论限定为源码、构建和本地前端交互层级，不代表真实注册或 OAuth 端到端验收。

## 根因与 RED 矩阵

未修复基线的 box model 证明 owner 位于 Signup 子树：桌面 UA 使用 400px Form/模式组，移动 UA 使用 300px Form；`Setting.renderLogo()` 固定 320px，父 `.login-form` 另有 30px 双侧 padding。共享 flex 壳按这些 min-content 扩张，Phone `Space.Compact` 只跟随 Form，不是独立 owner。

| Case | 未修复 Email/Phone 页面 overflow | 未修复 panel / Form |
| --- | ---: | ---: |
| desktop 320px | 70px | 460 / 400px |
| desktop 360px | 50px | 460 / 400px |
| desktop 390px | 35px | 460 / 400px |
| mobile 320px | 30px | 380 / 300px |
| mobile 360px | 10px | 380 / 300px |
| mobile 390px | 0px | 380 / 300px |
| desktop 1440px | 0px | 460 / 400px |

所有 RED case 均使用同一脱敏 fixture，console warning/error、page error 和 request failure 为 0，失败信号只来自几何契约。

## TDD 证据

- 第一轮 RED：4 个聚焦测试中，缺少 Signup scoped shell/Form class 与 fluid mode/wrappable action 的 2 个新契约失败；既有 Email/Phone 分支和 Phone 35%/65% compact 契约继续通过。加入局部 Less、class 与 `Space wrap` 后 4/4 GREEN。
- 第二轮 RED：浏览器中登录链接可获得 Tab 焦点，但按 Enter 不跳转；直接测试得到 `href` expected `/login`、received `undefined`。加入真实 `Setting.getLoginLink()` href 并保留现有 soft redirect 后，Jest 和 Chromium Enter 均 GREEN。
- 第三轮 RED：1440px 长标签 `scrollWidth=338 > clientWidth=133`，初次 wrap 后仍有 `scrollHeight=64 > clientHeight=40`。加入 AntD `labelWrap` 与有理由的 Signup scoped height override 后，最终为 `scrollWidth=clientWidth=133`、`scrollHeight=clientHeight=88`，全文可读。

## 聚焦测试与覆盖率

- 最终聚焦 Jest：`SignupPage.test.tsx` 1 suite / 5 tests / 0 failure。
- 覆盖率命令以 `SignupPage.tsx` 为 collect target，并生成 `lcov` 与 JSON；将 `git diff --unified=0` 新增生产行与 Istanbul executable map 交叉。
- changed executable lines：5/5 = 100%；changed statements：5/5 = 100%，达到 85% 门槛。
- `SignupPage.tsx` 全文件 lines 为 23.24%，原因是 1043 行 legacy 页面包含大量本 change 未触达的注册/认证分支；该数字未被用来替代 changed coverage。

## 完整自动化与构建

- rebase 到最新 `origin/hfl-test-base` 后最终运行 `yarn test:ci`：152 suites / 1437 tests / 0 failure；只出现既有 FakeTimers/native timer 提示。
- `yarn typecheck`、`yarn typecheck:build-tooling`、`yarn typecheck:e2e`：通过。首次主 typecheck 暴露测试缺少 `jest` 值导入，修复后复验通过。
- `node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`：通过。
- `yarn lint`：通过，只输出既有 `caniuse-lite` 更新提示；未修改依赖。
- `yarn stylelint src/auth/SignupPage.less`：通过。
- `yarn public-scripts:check`、`yarn public-scripts:build`、`yarn public-scripts:smoke`：通过。
- `yarn build`：通过，只保留既有 browser external、direct eval 与 chunk-size warning。
- `yarn test:e2e:list`：19 个文件 / 22 个 Chromium tests。

## 最终 Chromium production preview

| Case | Email overflow | Phone overflow | 校验错误态 overflow | panel / Form | 裁切标签 | 错误信号 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| desktop 320px | 0 | 0 | 0 | 320 / 260px | 0 | 0 |
| desktop 360px | 0 | 0 | 0 | 360 / 300px | 0 | 0 |
| desktop 390px | 0 | 0 | 0 | 390 / 330px | 0 | 0 |
| mobile 320px | 0 | 0 | 0 | 320 / 260px | 0 | 0 |
| mobile 360px | 0 | 0 | 0 | 360 / 300px | 0 | 0 |
| mobile 390px | 0 | 0 | 0 | 390 / 330px | 0 | 0 |
| desktop 1440px | 0 | 0 | 0 | 460 / 400px | 0 | 0 |

- Email/Phone 可切换；Phone 中区号位于手机号之前，直接测试保持 35%/65% 和 compact block 契约。
- 两条校验错误均保持在 Form 内容区；320px 长标签、错误、提交按钮和登录链接无裁切或遮挡。
- Tab 顺序为模式 radio → 区号 combobox → 手机号 → 密码 → 提交按钮 → 登录链接；Shift+Tab 可从区号返回 Phone 模式；登录链接按 Enter 进入 `/login`。
- 三张 320/390/1440px 截图经目视检查，无重叠、裁切或页面级横向溢出。截图与 browser probe 均为临时 ignored 产物，closeout 前删除。
- 未运行 axe：本 change 不新增依赖；已人工验证可见文本、AntD 语义、Tab/Shift+Tab、Enter 激活和焦点顺序。

## 边界与剩余风险

- 本地 fixture 不能证明真实注册、OAuth、验证码发送或 Provider 后端链路；本 change 未修改这些 contract。
- Application 管理员可通过 `formCss` / `formCssMobile` 主动注入超宽自定义内容；本 change 保持该既有扩展契约，不承诺修复外部自定义 CSS 制造的 overflow。
- Vite、Browserslist 和 FakeTimers 的既有提示未由本 change 引入，也未通过 ignore、依赖升级或配置放宽隐藏。
